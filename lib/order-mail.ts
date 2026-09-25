import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMailWithRetry } from "@/lib/mail";
import { formatPrice, formatAddressLines, formatVatBreakdownLines } from "@/lib/format";
import { getSiteUrl } from "@/lib/site-url";

// "Bygnor <ordre@bygnor.com>" i stedet for lib/mail.ts's delte
// noreply@-standardadresse — ordre-relaterede mails bør ikke selv se
// "svar ikke hertil"-agtige ud. Behøver ikke være en overvåget postkasse:
// et kundesvar routes til kontakt@bygnor.com via Reply-To
// (sendOrderConfirmation nedenfor), uafhængigt af hvad From viser.
const ORDER_FROM_ADDRESS = "Bygnor <ordre@bygnor.com>";

/**
 * Modtager for fakturaordrer — konfigureres via miljøvariabel, så den kan
 * ændres uden en ny deploy. Ingen fallback-værdi: mangler den, skal det
 * fejle tydeligt i loggen, samme mønster som POSTMARK_SERVER_TOKEN i
 * lib/mail.ts, ikke stille falde tilbage til en forkert adresse.
 */
function getSalesNotificationEmail(): string {
  const email = process.env.SALES_NOTIFICATION_EMAIL?.trim();
  if (!email) {
    throw new Error("[order-mail] SALES_NOTIFICATION_EMAIL er ikke sat");
  }
  return email;
}

type OrderMailItem = {
  name: string;
  nameDa: string | null;
  sku: string;
  quantity: number;
  basePrice: number | null;
  unitPrice: number | null;
};

type OrderMailData = {
  orderReference: string | null;
  customerEmail: string | null;
  companyName: string | null;
  cvrNumber: string | null;
  externalCustomerNumber: string | null;
  deliveryRecipientName: string;
  deliveryAddressLine1: string;
  deliveryAddressLine2: string | null;
  deliveryPostalCode: string;
  deliveryCity: string;
  deliveryCountry: string;
  paymentMethod: string;
  totalAmount: number | null;
  subtotalAmount: number | null;
  vatAmount: number | null;
  discountLabel: string | null;
  vatRate: number | null;
  vatType: string | null;
  vatNote: string | null;
  items: OrderMailItem[];
};

async function loadOrderMailData(orderId: string): Promise<OrderMailData | null> {
  const supabaseAdmin = createAdminClient();

  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select(
      "order_reference, customer_id, external_customer_number_snapshot, delivery_recipient_name, delivery_address_line1, delivery_address_line2, delivery_postal_code, delivery_city, delivery_country, payment_method, total_amount, subtotal_amount, vat_amount, discount_label, vat_rate, vat_type, vat_note, order_items(name_snapshot, name_snapshot_da, sku_snapshot, quantity, base_price_snapshot, unit_price_snapshot)",
    )
    .eq("id", orderId)
    .single();

  if (error || !order) {
    console.error("[order-mail] kunne ikke hente ordre", orderId, error);
    return null;
  }

  const [{ data: profile }, userResult] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("company_name, cvr_number")
      .eq("id", order.customer_id as string)
      .maybeSingle(),
    supabaseAdmin.auth.admin.getUserById(order.customer_id as string),
  ]);

  const items = (
    order.order_items as unknown as Array<{
      name_snapshot: string;
      name_snapshot_da: string | null;
      sku_snapshot: string;
      quantity: number;
      base_price_snapshot: number | null;
      unit_price_snapshot: number | null;
    }>
  ).map((row) => ({
    name: row.name_snapshot,
    nameDa: row.name_snapshot_da,
    sku: row.sku_snapshot,
    quantity: row.quantity,
    basePrice: row.base_price_snapshot,
    unitPrice: row.unit_price_snapshot,
  }));

  return {
    orderReference: order.order_reference as string | null,
    customerEmail: userResult.data?.user?.email ?? null,
    companyName: (profile?.company_name as string | null) ?? null,
    cvrNumber: (profile?.cvr_number as string | null) ?? null,
    externalCustomerNumber: order.external_customer_number_snapshot as string | null,
    deliveryRecipientName: order.delivery_recipient_name as string,
    deliveryAddressLine1: order.delivery_address_line1 as string,
    deliveryAddressLine2: order.delivery_address_line2 as string | null,
    deliveryPostalCode: order.delivery_postal_code as string,
    deliveryCity: order.delivery_city as string,
    deliveryCountry: order.delivery_country as string,
    paymentMethod: order.payment_method as string,
    totalAmount: order.total_amount as number | null,
    subtotalAmount: order.subtotal_amount as number | null,
    vatAmount: order.vat_amount as number | null,
    discountLabel: order.discount_label as string | null,
    vatRate: order.vat_rate as number | null,
    vatType: order.vat_type as string | null,
    vatNote: order.vat_note as string | null,
    items,
  };
}

/**
 * "sv" (Pidos oprindelige varenavn) bruges KUN til fakturanotifikationen
 * til salg — det er arbejdsinstruktionen til manuel bestilling hos Pido,
 * og en oversættelse her øger risikoen for fejlbestilling. "da" (med
 * fallback til navnet, hvis en dansk oversættelse mangler) bruges alle
 * andre steder, inkl. kundens egen ordrebekræftelse.
 */
function formatItemsList(items: OrderMailItem[], language: "sv" | "da"): string {
  return items
    .map((item) => {
      const name = language === "da" ? (item.nameDa ?? item.name) : item.name;
      const normalPriceText = formatPrice(item.basePrice);
      const unitPriceText = formatPrice(item.unitPrice);
      const lineRabat =
        item.basePrice != null && item.unitPrice != null
          ? (item.basePrice - item.unitPrice) * item.quantity
          : null;
      const rabatText = lineRabat && lineRabat > 0 ? ` · Rabat: -${formatPrice(lineRabat)}` : "";
      const lineTotalText =
        item.unitPrice != null
          ? formatPrice(item.unitPrice * item.quantity)
          : "Pris oplyses snarest";
      return `- ${name} (${item.sku}) · ${item.quantity} stk · Normalpris: ${normalPriceText}/stk${rabatText} · Pris: ${unitPriceText}/stk · Linjesum: ${lineTotalText}`;
    })
    .join("\n");
}

/**
 * includeVatNote: kun sand for den interne salgsnotifikation.
 * vat_note (den lovpligtige fakturatekst) må ALDRIG nå kundens egen
 * ordrebekræftelse eller kvitteringsside — den faktiske faktura kommer fra
 * det eksterne regnskabssystem, ikke herfra. vat_rate/vat_type (de
 * tekniske felter) vises stadig begge steder.
 */
function formatTotals(data: OrderMailData, includeVatNote: boolean): string {
  const pricedItems = data.items.filter((item) => item.basePrice != null);
  if (pricedItems.length === 0) {
    return `Total: ${formatPrice(data.totalAmount)}`;
  }

  const normalTotal = pricedItems.reduce(
    (sum, item) => sum + item.basePrice! * item.quantity,
    0,
  );
  // Rabatten er ex-moms — sammenlignes med subtotalAmount (ex-moms,
  // rabatteret), ikke totalAmount (som nu er inkl. moms).
  const discountTotal = normalTotal - (data.subtotalAmount ?? normalTotal);

  const lines = [`Normalpris i alt: ${formatPrice(normalTotal)}`];
  if (discountTotal > 0) {
    lines.push(`Rabat (${data.discountLabel ?? "ukendt"}): -${formatPrice(discountTotal)}`);
  }

  for (const line of formatVatBreakdownLines({
    subtotalAmount: data.subtotalAmount,
    vatAmount: data.vatAmount,
    totalAmount: data.totalAmount,
    vatRate: data.vatRate,
  })) {
    lines.push(`${line.label}: ${line.value}`);
  }

  // vat_note (den lovpligtige fakturatekst) må ALDRIG nå kundens egen
  // ordrebekræftelse — kun den interne salgsnotifikation.
  if (includeVatNote && data.vatRate != null && data.vatNote) {
    lines.push(data.vatNote);
  }

  return lines.join("\n");
}

function formatDeliveryAddress(data: OrderMailData): string {
  return formatAddressLines({
    companyName: data.companyName,
    attentionName: data.deliveryRecipientName,
    streetAddress: data.deliveryAddressLine1,
    addressLine2: data.deliveryAddressLine2,
    postalCode: data.deliveryPostalCode,
    city: data.deliveryCity,
    country: data.deliveryCountry,
  }).join("\n");
}

/**
 * Trigges med det samme en faktura-ordre oprettes, uafhængigt af
 * Quickpay-flowet helt. Ingen /admin/orders-side findes endnu, så alle
 * detaljer er i selve mailen — ikke bare et link.
 */
export async function sendInvoiceOrderNotification(orderId: string): Promise<void> {
  const data = await loadOrderMailData(orderId);
  if (!data) return;

  let salesEmail: string;
  try {
    salesEmail = getSalesNotificationEmail();
  } catch (err) {
    console.error(`[order-mail] fakturanotifikation ordre=${orderId}: kan ikke sendes`, err);
    return;
  }

  const subject = `Ny fakturaordre — ${data.companyName ?? "Ukendt kunde"} — ${formatPrice(data.totalAmount)}`;

  const externalCustomerNumberLine = data.externalCustomerNumber
    ? `\nEksternt kundenummer: ${data.externalCustomerNumber}`
    : "";

  const body = `Ny ordre med faktura som betalingsmetode.

Kunde: ${data.companyName ?? "Ukendt"}${data.cvrNumber ? ` (CVR ${data.cvrNumber})` : ""}
Kundens email: ${data.customerEmail ?? "ukendt"}
Ordrereference: ${data.orderReference ?? "ukendt"}${externalCustomerNumberLine}

Ordrelinjer (varenavne som hos Pido, til bestilling):
${formatItemsList(data.items, "sv")}

Leveringsadresse:
${formatDeliveryAddress(data)}

${formatTotals(data, true)}
`;

  await sendMailWithRetry(
    { to: [salesEmail], subject, body, from: ORDER_FROM_ADDRESS },
    `fakturanotifikation ordre=${orderId}`,
  );
}

/**
 * Faktura: sendes med det samme ordren oprettes. Kort: sendes FØRST fra
 * Quickpay-callbacket når en capture er bekræftet — aldrig ved selve
 * checkout-kaldet, da betalingen kan fejle eller annulleres undervejs.
 */
export async function sendOrderConfirmation(orderId: string): Promise<void> {
  const data = await loadOrderMailData(orderId);
  if (!data) return;

  if (!data.customerEmail) {
    console.error("[order-mail] ordrebekræftelse: ingen kunde-email fundet", orderId);
    return;
  }

  const isInvoice = data.paymentMethod === "faktura";

  // 14 dage matcher handelsbetingelsernes §4 (fakturaforfald) — hardkodet
  // som resten af forretningsreglerne i systemet, ikke læst fra en
  // konfigurerbar kilde (ingen findes for denne regel i dag).
  const paymentStatusDa = isInvoice
    ? "Afventer fakturabehandling — vores salgsafdeling kontakter dig.\nBetalingsfrist: 14 dage fra fakturadato."
    : "Betalt med kort";
  const paymentStatusEn = isInvoice
    ? "Awaiting invoice processing — our sales team will contact you.\nPayment due: 14 days from the invoice date."
    : "Paid by card";

  const orderUrl = `${getSiteUrl()}/shop/ordrer/${orderId}`;

  const subject = "Ordrebekræftelse — Bygnor / Order confirmation — Bygnor";

  // Ordrelinjer/adresse/totaler vises kun ÉN gang, ikke duplikeret pr.
  // sprog: formatItemsList/formatTotals har hardkodede danske labels
  // ("stk", "Normalpris", "Moms" osv.) delt med ordrevisning/admin/
  // kvittering, og der findes intet engelsk produktnavn i data-modellen
  // (kun "da"/"sv", se formatItemsList) — at gengive den samme danske
  // tekst under en engelsk overskrift ville se oversat ud uden at være
  // det. Hilsen/status/link gentages derfor fuldt ud på begge sprog;
  // selve datablokken er sprog-neutral nok (tal, adresse, varenumre) til
  // at stå fælles under en bilingual sektionslabel.
  const body = `Dansk

Tak for din bestilling hos Bygnor.

Ordrereference: ${data.orderReference ?? "ukendt"}
Betalingsstatus: ${paymentStatusDa}

English

Thank you for your order with Bygnor.

Order reference: ${data.orderReference ?? "unknown"}
Payment status: ${paymentStatusEn}

—

Ordrelinjer / Order lines:
${formatItemsList(data.items, "da")}

Leveringsadresse / Delivery address:
${formatDeliveryAddress(data)}

${formatTotals(data, false)}

Se din ordre her / View your order here:
${orderUrl}

Med venlig hilsen / Best regards,
Bygnor
`;

  await sendMailWithRetry(
    {
      to: [data.customerEmail],
      subject,
      body,
      from: ORDER_FROM_ADDRESS,
      replyTo: "kontakt@bygnor.com",
    },
    `ordrebekræftelse ordre=${orderId}`,
  );
}

/**
 * Quickpay-callbacket rapporterede en fuldført capture, men et af de
 * finansielle felter (beløb/valuta/test-mode) matchede ikke det vi
 * forventede for ordren — se app/api/quickpay/callback/route.ts. Ordren
 * markeres bevidst hverken betalt eller fejlet i det tilfælde (se
 * migration 0034's kommentar), så uden denne mail ville en reel uoverens-
 * stemmelse kunne ligge uopdaget i quickpay_callback_events. Holdes kort
 * med vilje — detaljerne står i selve rækken, mailen er kun en vækker.
 */
export async function sendQuickpayMismatchAlert(
  orderReference: string | null,
  orderId: string,
  reason: string,
): Promise<void> {
  let salesEmail: string;
  try {
    salesEmail = getSalesNotificationEmail();
  } catch (err) {
    console.error(
      `[order-mail] Quickpay-mismatch-alarm ordre=${orderId}: kan ikke sendes`,
      err,
    );
    return;
  }

  const subject = `Quickpay-callback matcher ikke ordren — ${orderReference ?? orderId}`;

  const body = `Et Quickpay-callback rapporterede en gennemført betaling, men matchede ikke det forventede for ordren. Ordrens status er IKKE ændret — den kræver manuelt gennemsyn.

Ordrereference: ${orderReference ?? "ukendt"}
Hvad matchede ikke: ${reason}

Se hele det modtagne callback (og ordren) her:
${getSiteUrl()}/admin/orders/${orderId}
`;

  await sendMailWithRetry(
    { to: [salesEmail], subject, body },
    `Quickpay-mismatch-alarm ordre=${orderId}`,
  );
}
