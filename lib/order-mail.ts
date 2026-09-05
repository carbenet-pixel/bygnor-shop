import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail, type MailMessage } from "@/lib/mail";
import { formatPrice } from "@/lib/format";

// Fast modtager for fakturaordrer — ikke en env-variabel, samme mønster som
// FROM_ADDRESS i lib/mail.ts (en fast forretningsadresse, ikke noget der
// forventes konfigureret pr. miljø).
const SALES_EMAIL = "salg@bygnor.com";

type OrderMailItem = {
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number | null;
};

type OrderMailData = {
  orderReference: string | null;
  customerEmail: string | null;
  companyName: string | null;
  cvrNumber: string | null;
  deliveryRecipientName: string;
  deliveryAddressLine1: string;
  deliveryAddressLine2: string | null;
  deliveryPostalCode: string;
  deliveryCity: string;
  deliveryCountry: string;
  paymentMethod: string;
  totalAmount: number | null;
  items: OrderMailItem[];
};

async function loadOrderMailData(orderId: string): Promise<OrderMailData | null> {
  const supabaseAdmin = createAdminClient();

  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select(
      "order_reference, customer_id, delivery_recipient_name, delivery_address_line1, delivery_address_line2, delivery_postal_code, delivery_city, delivery_country, payment_method, total_amount, order_items(name_snapshot, sku_snapshot, quantity, unit_price_snapshot)",
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
      sku_snapshot: string;
      quantity: number;
      unit_price_snapshot: number | null;
    }>
  ).map((row) => ({
    name: row.name_snapshot,
    sku: row.sku_snapshot,
    quantity: row.quantity,
    unitPrice: row.unit_price_snapshot,
  }));

  return {
    orderReference: order.order_reference as string | null,
    customerEmail: userResult.data?.user?.email ?? null,
    companyName: (profile?.company_name as string | null) ?? null,
    cvrNumber: (profile?.cvr_number as string | null) ?? null,
    deliveryRecipientName: order.delivery_recipient_name as string,
    deliveryAddressLine1: order.delivery_address_line1 as string,
    deliveryAddressLine2: order.delivery_address_line2 as string | null,
    deliveryPostalCode: order.delivery_postal_code as string,
    deliveryCity: order.delivery_city as string,
    deliveryCountry: order.delivery_country as string,
    paymentMethod: order.payment_method as string,
    totalAmount: order.total_amount as number | null,
    items,
  };
}

function formatItemsList(items: OrderMailItem[]): string {
  return items
    .map((item) => {
      const unitPriceText = formatPrice(item.unitPrice);
      const lineTotalText =
        item.unitPrice != null
          ? formatPrice(item.unitPrice * item.quantity)
          : "Pris oplyses snarest";
      return `- ${item.name} (${item.sku}) · ${item.quantity} stk · ${unitPriceText}/stk · Linjesum: ${lineTotalText}`;
    })
    .join("\n");
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

  const subject = `Ny fakturaordre — ${data.companyName ?? "Ukendt kunde"} — ${formatPrice(data.totalAmount)}`;

  const body = `Ny ordre med faktura som betalingsmetode.

Kunde: ${data.companyName ?? "Ukendt"}${data.cvrNumber ? ` (CVR ${data.cvrNumber})` : ""}
Kundens email: ${data.customerEmail ?? "ukendt"}
Ordrereference: ${data.orderReference ?? "ukendt"}

Ordrelinjer:
${formatItemsList(data.items)}

Leveringsadresse:
${formatDeliveryAddress(data)}

Samlet beløb: ${formatPrice(data.totalAmount)}
`;

  await sendMailWithRetry({ to: [SALES_EMAIL], subject, body }, `fakturanotifikation ordre=${orderId}`);
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
${formatItemsList(data.items)}

Leveringsadresse:
${formatDeliveryAddress(data)}

Betalingsstatus: ${paymentStatusText}
Samlet beløb: ${formatPrice(data.totalAmount)}
`;

  await sendMailWithRetry(
    { to: [data.customerEmail], subject, body },
    `ordrebekræftelse ordre=${orderId}`,
  );
}
