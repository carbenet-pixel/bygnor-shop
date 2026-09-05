"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listAddresses, type DeliveryAddress } from "@/lib/delivery-addresses";
import { getCart, type CartItem } from "@/lib/cart";
import { createPaymentAndLink } from "@/lib/quickpay";
import { sendInvoiceOrderNotification, sendOrderConfirmation } from "@/lib/order-mail";

export type CheckoutState = { error: string | null };

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

function generateOrderReference(): string {
  // Quickpays order_id skal matche ^[a-zA-Z0-9]{4,20}$ — UUID uden
  // bindestreger er altid 32 hex-tegn, trunkeres til 20. Bruges også til
  // faktura-ordrer for en ensartet, kort ordrereference på tværs af begge
  // betalingsspor.
  return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
}

async function createOrderWithReference(
  supabase: SupabaseServerClient,
  input: {
    customerId: string;
    customerEmail: string | null;
    deliveryAddress: DeliveryAddress;
    paymentMethod: "kort" | "faktura";
    status: string;
    totalAmount: number | null;
  },
): Promise<{ orderId: string; orderReference: string } | { error: string }> {
  let orderReference = generateOrderReference();

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        customer_id: input.customerId,
        delivery_recipient_name:
          input.deliveryAddress.contactName ?? input.customerEmail ?? "Ukendt",
        delivery_address_line1: input.deliveryAddress.streetAddress,
        delivery_address_line2: input.deliveryAddress.label,
        delivery_postal_code: input.deliveryAddress.postalCode ?? "",
        delivery_city: input.deliveryAddress.city ?? "",
        delivery_country: input.deliveryAddress.country,
        payment_method: input.paymentMethod,
        status: input.status,
        total_amount: input.totalAmount,
        order_reference: orderReference,
      })
      .select("id")
      .single();

    if (!error && order) {
      return { orderId: order.id as string, orderReference };
    }
    if (error && error.code !== "23505") {
      console.error("[createOrderWithReference]", error);
      return { error: "Kunne ikke oprette ordren. Prøv igen." };
    }
    orderReference = generateOrderReference();
  }

  return { error: "Kunne ikke generere et unikt ordre-id. Prøv igen." };
}

async function insertOrderItems(
  supabase: SupabaseServerClient,
  orderId: string,
  items: CartItem[],
): Promise<string | null> {
  const { error } = await supabase.from("order_items").insert(
    items.map((item) => ({
      order_id: orderId,
      product_id: item.productId,
      sku_snapshot: item.sku,
      name_snapshot: item.name,
      unit_price_snapshot: item.basePrice,
      quantity: item.quantity,
    })),
  );

  if (error) {
    console.error("[insertOrderItems]", error);
    return "Kunne ikke oprette ordrelinjerne. Prøv igen.";
  }
  return null;
}

/**
 * Starter kort-betaling for hele kurven: opretter en ordre + ordrelinjer,
 * beder Quickpay om et betalingslink, og redirecter kunden dertil.
 * Faktura-sporet rører denne funktion ikke ved.
 */
export async function initiateCardCheckoutAction(
  _prevState: CheckoutState,
  _formData: FormData,
): Promise<CheckoutState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Ikke logget ind." };
  }

  const cart = await getCart();
  if (cart.items.length === 0) {
    return { error: "Kurven er tom." };
  }

  // Vi kan ikke sende kunden til betaling for et beløb vi ikke kender —
  // ikke dækket af den oprindelige prompt, men nødvendigt for at undgå at
  // opkræve et ufuldstændigt beløb.
  if (cart.items.some((item) => item.basePrice == null)) {
    return {
      error:
        "Kurven indeholder varer uden pris endnu — fjern dem, eller vent til prisen er sat, før du kan gå til betaling.",
    };
  }

  // Ingen leveringsadresse-valg bygget endnu — bruger kundens første
  // adresse (listAddresses sorterer standard-adressen først, hvis en er
  // sat). Kontakt Bygnor hvis ingen findes.
  const addresses = await listAddresses(user.id);
  const deliveryAddress = addresses[0];
  if (!deliveryAddress) {
    return {
      error: "Ingen leveringsadresse fundet på din konto — kontakt Bygnor.",
    };
  }

  const totalAmount = cart.items.reduce(
    (sum, item) => sum + item.basePrice! * item.quantity,
    0,
  );

  const created = await createOrderWithReference(supabase, {
    customerId: user.id,
    customerEmail: user.email ?? null,
    deliveryAddress,
    paymentMethod: "kort",
    status: "afventer_betaling",
    totalAmount,
  });
  if ("error" in created) {
    return { error: created.error };
  }
  const { orderId, orderReference } = created;

  const itemsError = await insertOrderItems(supabase, orderId, cart.items);
  if (itemsError) {
    return { error: itemsError };
  }

  let linkUrl: string;
  try {
    const amountInOre = Math.round(totalAmount * 100);
    const result = await createPaymentAndLink(orderReference, amountInOre);
    linkUrl = result.linkUrl;

    // orders har kun select+insert til authenticated (0011) — statusfelter
    // og Quickpay-referencer opdateres via service_role.
    const supabaseAdmin = createAdminClient();
    await supabaseAdmin
      .from("orders")
      .update({
        quickpay_payment_id: result.paymentId,
        quickpay_link_url: result.linkUrl,
      })
      .eq("id", orderId);
  } catch (err) {
    console.error("[initiateCardCheckoutAction] quickpay", err);
    return { error: "Kunne ikke starte betalingen hos Quickpay. Prøv igen." };
  }

  // Ordrebekræftelsen til kunden sendes IKKE her — først når Quickpay-
  // callbacket bekræfter en godkendt capture (se app/api/quickpay/callback).
  redirect(linkUrl);
}

/**
 * Fakturaflow: kun for kunder med profiles.invoice_approved. I modsætning
 * til kort er der ingen ekstern betalingsbekræftelse at vente på — ordren
 * er endelig med det samme, kurven ryddes med det samme, og begge mails
 * (sælger-notifikation + kundens ordrebekræftelse) sendes med det samme.
 * Kan oprettes selvom nogle linjer mangler pris (sælger følger op manuelt).
 */
export async function initiateInvoiceCheckoutAction(
  _prevState: CheckoutState,
  _formData: FormData,
): Promise<CheckoutState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Ikke logget ind." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("invoice_approved")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.invoice_approved) {
    return { error: "Din konto er ikke godkendt til fakturabetaling." };
  }

  const cart = await getCart();
  if (cart.items.length === 0) {
    return { error: "Kurven er tom." };
  }

  const addresses = await listAddresses(user.id);
  const deliveryAddress = addresses[0];
  if (!deliveryAddress) {
    return {
      error: "Ingen leveringsadresse fundet på din konto — kontakt Bygnor.",
    };
  }

  const pricedItems = cart.items.filter((item) => item.basePrice != null);
  const totalAmount =
    pricedItems.length > 0
      ? pricedItems.reduce((sum, item) => sum + item.basePrice! * item.quantity, 0)
      : null;

  const created = await createOrderWithReference(supabase, {
    customerId: user.id,
    customerEmail: user.email ?? null,
    deliveryAddress,
    paymentMethod: "faktura",
    status: "afventer",
    totalAmount,
  });
  if ("error" in created) {
    return { error: created.error };
  }
  const { orderId, orderReference } = created;

  const itemsError = await insertOrderItems(supabase, orderId, cart.items);
  if (itemsError) {
    return { error: itemsError };
  }

  if (cart.id) {
    await supabase.from("cart_items").delete().eq("cart_id", cart.id);
  }

  await Promise.all([
    sendInvoiceOrderNotification(orderId),
    sendOrderConfirmation(orderId),
  ]);

  redirect(`/shop/checkout/kvittering?order=${orderReference}`);
}
