"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listAddresses } from "@/lib/delivery-addresses";
import { getCart } from "@/lib/cart";
import { createPaymentAndLink } from "@/lib/quickpay";

export type CheckoutState = { error: string | null };

function generateOrderReference(): string {
  // Quickpays order_id skal matche ^[a-zA-Z0-9]{4,20}$ — UUID uden
  // bindestreger er altid 32 hex-tegn, trunkeres til 20.
  return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
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

  let orderReference = generateOrderReference();
  let orderId: string | null = null;

  for (let attempt = 0; attempt < 5 && !orderId; attempt++) {
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        customer_id: user.id,
        delivery_recipient_name: deliveryAddress.contactName ?? user.email ?? "Ukendt",
        delivery_address_line1: deliveryAddress.streetAddress,
        delivery_address_line2: deliveryAddress.label,
        delivery_postal_code: deliveryAddress.postalCode ?? "",
        delivery_city: deliveryAddress.city ?? "",
        delivery_country: deliveryAddress.country,
        payment_method: "kort",
        status: "afventer_betaling",
        total_amount: totalAmount,
        order_reference: orderReference,
      })
      .select("id")
      .single();

    if (!error && order) {
      orderId = order.id as string;
      break;
    }
    if (error && error.code !== "23505") {
      console.error("[initiateCardCheckoutAction] order insert", error);
      return { error: "Kunne ikke oprette ordren. Prøv igen." };
    }
    orderReference = generateOrderReference();
  }

  if (!orderId) {
    return { error: "Kunne ikke generere et unikt ordre-id. Prøv igen." };
  }

  const { error: itemsError } = await supabase.from("order_items").insert(
    cart.items.map((item) => ({
      order_id: orderId,
      product_id: item.productId,
      sku_snapshot: item.sku,
      name_snapshot: item.name,
      unit_price_snapshot: item.basePrice,
      quantity: item.quantity,
    })),
  );

  if (itemsError) {
    console.error("[initiateCardCheckoutAction] order_items insert", itemsError);
    return { error: "Kunne ikke oprette ordrelinjerne. Prøv igen." };
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

  redirect(linkUrl);
}
