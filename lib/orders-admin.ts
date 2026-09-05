import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type OrderAdminListItem = {
  id: string;
  orderReference: string | null;
  customerName: string | null;
  createdAt: string;
  paymentMethod: string;
  status: string;
  totalAmount: number | null;
};

export type ListOrdersFilter = {
  status?: string;
  paymentMethod?: string;
};

export async function listOrdersAdmin(
  filter: ListOrdersFilter = {},
): Promise<OrderAdminListItem[]> {
  const supabaseAdmin = createAdminClient();

  let query = supabaseAdmin
    .from("orders")
    .select("id, customer_id, order_reference, created_at, payment_method, status, total_amount")
    .order("created_at", { ascending: false });

  if (filter.status) {
    query = query.eq("status", filter.status);
  }
  if (filter.paymentMethod) {
    query = query.eq("payment_method", filter.paymentMethod);
  }

  const { data: orders, error } = await query;

  if (error || !orders) {
    console.error("[listOrdersAdmin]", error);
    return [];
  }

  const customerIds = [...new Set(orders.map((o) => o.customer_id as string))];
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, company_name")
    .in("id", customerIds);

  const companyNameById = new Map(
    (profiles ?? []).map((p) => [p.id as string, p.company_name as string | null]),
  );

  return orders.map((order) => ({
    id: order.id as string,
    orderReference: order.order_reference as string | null,
    customerName: companyNameById.get(order.customer_id as string) ?? null,
    createdAt: order.created_at as string,
    paymentMethod: order.payment_method as string,
    status: order.status as string,
    totalAmount: order.total_amount as number | null,
  }));
}

export type OrderAdminItem = {
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number | null;
};

export type OrderAdminDetail = {
  id: string;
  orderReference: string | null;
  customerName: string | null;
  customerEmail: string | null;
  cvrNumber: string | null;
  createdAt: string;
  deliveryRecipientName: string;
  deliveryAddressLine1: string;
  deliveryAddressLine2: string | null;
  deliveryPostalCode: string;
  deliveryCity: string;
  deliveryCountry: string;
  paymentMethod: string;
  status: string;
  totalAmount: number | null;
  quickpayPaymentId: string | null;
  items: OrderAdminItem[];
};

export async function getOrderAdmin(id: string): Promise<OrderAdminDetail | null> {
  const supabaseAdmin = createAdminClient();

  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select(
      "id, customer_id, order_reference, created_at, delivery_recipient_name, delivery_address_line1, delivery_address_line2, delivery_postal_code, delivery_city, delivery_country, payment_method, status, total_amount, quickpay_payment_id, order_items(name_snapshot, sku_snapshot, quantity, unit_price_snapshot)",
    )
    .eq("id", id)
    .single();

  if (error || !order) {
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
    id: order.id as string,
    orderReference: order.order_reference as string | null,
    customerName: (profile?.company_name as string | null) ?? null,
    customerEmail: userResult.data?.user?.email ?? null,
    cvrNumber: (profile?.cvr_number as string | null) ?? null,
    createdAt: order.created_at as string,
    deliveryRecipientName: order.delivery_recipient_name as string,
    deliveryAddressLine1: order.delivery_address_line1 as string,
    deliveryAddressLine2: order.delivery_address_line2 as string | null,
    deliveryPostalCode: order.delivery_postal_code as string,
    deliveryCity: order.delivery_city as string,
    deliveryCountry: order.delivery_country as string,
    paymentMethod: order.payment_method as string,
    status: order.status as string,
    totalAmount: order.total_amount as number | null,
    quickpayPaymentId: order.quickpay_payment_id as string | null,
    items,
  };
}

export const INVOICE_STATUS_OPTIONS = ["afventer", "behandlet", "afsendt", "annulleret"] as const;
const VALID_INVOICE_STATUS = new Set<string>(INVOICE_STATUS_OPTIONS);

export type UpdateOrderStatusResult = { success: true } | { success: false; error: string };

/**
 * Kun for faktura-ordrer — kort-ordrers status styres udelukkende af
 * Quickpay-callbacket (se app/api/quickpay/callback). Betingelsen på
 * payment_method i selve UPDATE'et er en ekstra sikkerhed, ikke kun en
 * UI-skjulning: et forsøg på at ramme en kort-ordre rammer 0 rækker.
 */
export async function updateInvoiceOrderStatus(
  orderId: string,
  status: string,
): Promise<UpdateOrderStatusResult> {
  if (!VALID_INVOICE_STATUS.has(status)) {
    return { success: false, error: "Ugyldig status." };
  }

  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .eq("payment_method", "faktura")
    .select("id");

  if (error) {
    console.error("[updateInvoiceOrderStatus]", error);
    return { success: false, error: "Kunne ikke opdatere status." };
  }

  if (!data || data.length === 0) {
    return { success: false, error: "Ordren er ikke en fakturaordre — status kan ikke ændres her." };
  }

  return { success: true };
}
