import "server-only";
import { createClient } from "@/lib/supabase/server";
import { displayName } from "@/lib/format";

// Kundevendte statustekster — bevidst adskilt fra de interne enum-værdier
// og fra admins egne labels (lib/orders-admin.ts), som bruger andet sprog
// for "ny" ("Ny" for admin, "Modtaget" for kunden).
export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  afventer_betaling: "Afventer betaling",
  betalt: "Betalt",
  betaling_fejlet: "Betaling afvist",
  afventer: "Afventer fakturabehandling",
  annulleret: "Annulleret",
};

export const FULFILLMENT_STATUS_LABELS: Record<string, string> = {
  ny: "Modtaget",
  bestilt_hos_leverandør: "Bestilt hos leverandør",
  afsendt: "Afsendt",
  leveret: "Leveret",
  annulleret: "Annulleret",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  kort: "Kort",
  faktura: "Faktura",
};

export type CustomerOrderListItem = {
  id: string;
  orderReference: string | null;
  createdAt: string;
  paymentMethod: string;
  paymentStatusLabel: string;
  fulfillmentStatusLabel: string;
  totalAmount: number | null;
};

/**
 * En kort-ordre er kun en gyldig forpligtelse når betalingen reelt er
 * gennemført — samme distinktion som admins "kræver handling"-liste (se
 * lib/orders-admin.ts). En faktura-ordre er altid gyldig fra oprettelsen.
 * Anvendes i BÅDE liste og detalje, så et gammelt link til en afvist/
 * afventende kort-ordre ikke virker.
 */
const VALID_CUSTOMER_ORDER_FILTER =
  "payment_method.eq.faktura,and(payment_method.eq.kort,status.eq.betalt)";

/**
 * Kunden ser kun EGNE ordrer. RLS ("Kunde ser egne ordrer, admin ser
 * alle", migration 0011) ville lade en admin/superadmin-session se ALLE
 * ordrer her — derfor filtreres der eksplicit på customer_id, uafhængigt
 * af rolle, så en admin der browser sin egen "Mine ordrer"-side kun ser
 * sine egne (test-)ordrer, som forventet.
 */
export async function listOrdersForCustomer(): Promise<CustomerOrderListItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_reference, created_at, payment_method, status, fulfillment_status, total_amount",
    )
    .eq("customer_id", user.id)
    .or(VALID_CUSTOMER_ORDER_FILTER)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("[listOrdersForCustomer]", error);
    return [];
  }

  return data.map((order) => ({
    id: order.id as string,
    orderReference: order.order_reference as string | null,
    createdAt: order.created_at as string,
    paymentMethod: order.payment_method as string,
    paymentStatusLabel:
      PAYMENT_STATUS_LABELS[order.status as string] ?? (order.status as string),
    fulfillmentStatusLabel:
      FULFILLMENT_STATUS_LABELS[order.fulfillment_status as string] ??
      (order.fulfillment_status as string),
    totalAmount: order.total_amount as number | null,
  }));
}

export type CustomerOrderItem = {
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number | null;
};

export type CustomerOrderDetail = {
  id: string;
  orderReference: string | null;
  createdAt: string;
  deliveryRecipientName: string;
  deliveryAddressLine1: string;
  deliveryAddressLine2: string | null;
  deliveryPostalCode: string;
  deliveryCity: string;
  deliveryCountry: string;
  paymentMethod: string;
  paymentStatusLabel: string;
  fulfillmentStatusLabel: string;
  totalAmount: number | null;
  items: CustomerOrderItem[];
};

/**
 * Viser ALDRIG quickpay_payment_id eller fulfillment_notes — hverken
 * felt hentes i select'en. Samme customer_id-afgrænsning som ovenfor.
 */
export async function getOrderForCustomer(
  id: string,
): Promise<CustomerOrderDetail | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: order, error } = await supabase
    .from("orders")
    .select(
      "id, order_reference, created_at, delivery_recipient_name, delivery_address_line1, delivery_address_line2, delivery_postal_code, delivery_city, delivery_country, payment_method, status, fulfillment_status, total_amount, order_items(name_snapshot, name_snapshot_da, sku_snapshot, quantity, unit_price_snapshot)",
    )
    .eq("id", id)
    .eq("customer_id", user.id)
    .or(VALID_CUSTOMER_ORDER_FILTER)
    .maybeSingle();

  if (error || !order) {
    return null;
  }

  const items = (
    order.order_items as unknown as Array<{
      name_snapshot: string;
      name_snapshot_da: string | null;
      sku_snapshot: string;
      quantity: number;
      unit_price_snapshot: number | null;
    }>
  ).map((row) => ({
    name: displayName({ name: row.name_snapshot, nameDa: row.name_snapshot_da }),
    sku: row.sku_snapshot,
    quantity: row.quantity,
    unitPrice: row.unit_price_snapshot,
  }));

  return {
    id: order.id as string,
    orderReference: order.order_reference as string | null,
    createdAt: order.created_at as string,
    deliveryRecipientName: order.delivery_recipient_name as string,
    deliveryAddressLine1: order.delivery_address_line1 as string,
    deliveryAddressLine2: order.delivery_address_line2 as string | null,
    deliveryPostalCode: order.delivery_postal_code as string,
    deliveryCity: order.delivery_city as string,
    deliveryCountry: order.delivery_country as string,
    paymentMethod: order.payment_method as string,
    paymentStatusLabel:
      PAYMENT_STATUS_LABELS[order.status as string] ?? (order.status as string),
    fulfillmentStatusLabel:
      FULFILLMENT_STATUS_LABELS[order.fulfillment_status as string] ??
      (order.fulfillment_status as string),
    totalAmount: order.total_amount as number | null,
    items,
  };
}
