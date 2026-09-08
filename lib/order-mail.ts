import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail, type MailMessage } from "@/lib/mail";
import { formatPrice } from "@/lib/format";

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
  discountLabel: string | null;
  items: OrderMailItem[];
};

async function loadOrderMailData(orderId: string): Promise<OrderMailData | null> {
  const supabaseAdmin = createAdminClient();

  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select(
      "order_reference, customer_id, external_customer_number_snapshot, delivery_recipient_name, delivery_address_line1, delivery_address_line2, delivery_postal_code, delivery_city, delivery_country, payment_method, total_amount, discount_label, order_items(name_snapshot, name_snapshot_da, sku_snapshot, quantity, base_price_snapshot, unit_price_snapshot)",
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
    discountLabel: order.discount_label as string | null,
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

function formatTotals(data: OrderMailData): string {
  const pricedItems = data.items.filter((item) => item.basePrice != null);
  if (pricedItems.length === 0) {
    return `Samlet beløb: ${formatPrice(data.totalAmount)}`;
  }

  const normalTotal = pricedItems.reduce(
    (sum, item) => sum + item.basePrice! * item.quantity,
    0,
  );
  const discountTotal = normalTotal - (data.totalAmount ?? normalTotal);

  const lines = [`Normalpris i alt: ${formatPrice(normalTotal)}`];
  if (discountTotal > 0) {
    lines.push(`Rabat (${data.discountLabel ?? "ukendt"}): -${formatPrice(discountTotal)}`);
  }
  lines.push(`Samlet beløb (endelig pris): ${formatPrice(data.totalAmount)}`);
  return lines.join("\n");
}

function formatDeliveryAddress(data: OrderMailData): string {
  return [
    data.deliveryRecipientName,
    data.deliveryAddressLine1,
    data.deliveryAddressLine2,
    `${data.deliveryPostalCode} ${data.deliveryCity}`,
    data.deliveryCountry,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * sendMail kaster ved fejl — her fanges det altid, så en mislykket mail
 * aldrig kan vælte selve ordre-/betalingsflowet. Ét gentagelsesforsøg,
 * derefter tydelig logning af nok info til at sende manuelt.
 */
async function sendMailWithRetry(message: MailMessage, context: string): Promise<void> {
  try {
    await sendMail(message);
    return;
  } catch (err) {
    console.error(`[order-mail] ${context}: første forsøg fejlede, prøver igen`, err);
  }

  try {
    await sendMail(message);
  } catch (err) {
    console.error(
      `[order-mail] ${context}: andet forsøg fejlede også — send manuelt. to=${message.to.join(",")} subject="${message.subject}"`,
      err,
    );
  }
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

${formatTotals(data)}
`;

  await sendMailWithRetry({ to: [salesEmail], subject, body }, `fakturanotifikation ordre=${orderId}`);
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

  const paymentStatusText =
    data.paymentMethod === "kort"
      ? "Betalt med kort"
      : "Afventer fakturabehandling — vores salgsafdeling kontakter dig";

  const subject = "Ordrebekræftelse — Bygnor";

  const body = `Tak for din bestilling hos Bygnor.

Ordrereference: ${data.orderReference ?? "ukendt"}

Ordrelinjer:
${formatItemsList(data.items, "da")}

Leveringsadresse:
${formatDeliveryAddress(data)}

Betalingsstatus: ${paymentStatusText}
${formatTotals(data)}
`;

  await sendMailWithRetry(
    { to: [data.customerEmail], subject, body },
    `ordrebekræftelse ordre=${orderId}`,
  );
}
