"use server";

import crypto from "node:crypto";
import { revalidatePath, refresh } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listAddresses, type DeliveryAddress } from "@/lib/delivery-addresses";
import { getCart, type CartItem } from "@/lib/cart";
import { getCustomerDiscount } from "@/lib/discount-groups";
import { createPaymentAndLink } from "@/lib/quickpay";
import { sendInvoiceOrderNotification, sendOrderConfirmation } from "@/lib/order-mail";
import { roundCurrency } from "@/lib/format";

export type CheckoutState = { error: string | null };

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

function generateOrderReference(): string {
  // Quickpays order_id skal matche ^[a-zA-Z0-9]{4,20}$ — UUID uden
  // bindestreger er altid 32 hex-tegn, trunkeres til 20. Bruges også til
  // faktura-ordrer for en ensartet, kort ordrereference på tværs af begge
  // betalingsspor.
  return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
}

type ResolvedDeliveryAddress = {
  recipientName: string;
  addressLine1: string;
  addressLine2: string | null;
  postalCode: string;
  city: string;
  country: string;
};

/**
 * Læser leveringsadressen fra formularen: enten den valgte alternative
 * engangsadresse (useAlternativeAddress="on"), eller kundens standard-
 * adresse som fallback. Ingen "gemte adresser"-bog — kun ét alternativ
 * pr. ordre, jf. prompten.
 */
function resolveDeliveryAddress(
  formData: FormData,
  defaultAddress: DeliveryAddress | undefined,
  customerEmail: string | null,
): ResolvedDeliveryAddress | { error: string } {
  const useAlternative = formData.get("useAlternativeAddress") === "on";

  if (useAlternative) {
    const recipientName = ((formData.get("altRecipientName") as string) ?? "").trim();
    const addressLine1 = ((formData.get("altAddressLine1") as string) ?? "").trim();
    const addressLine2 = ((formData.get("altAddressLine2") as string) ?? "").trim() || null;
    const postalCode = ((formData.get("altPostalCode") as string) ?? "").trim();
    const city = ((formData.get("altCity") as string) ?? "").trim();
    const country = ((formData.get("altCountry") as string) ?? "").trim();

    if (!recipientName || !addressLine1 || !postalCode || !city || !country) {
      return {
        error: "Udfyld alle påkrævede felter for den alternative leveringsadresse.",
      };
    }

    return { recipientName, addressLine1, addressLine2, postalCode, city, country };
  }

  if (!defaultAddress) {
    return {
      error: "Ingen leveringsadresse fundet på din konto — kontakt Bygnor.",
    };
  }

  return {
    recipientName: defaultAddress.contactName ?? customerEmail ?? "Ukendt",
    addressLine1: defaultAddress.streetAddress,
    addressLine2: defaultAddress.label,
    postalCode: defaultAddress.postalCode ?? "",
    city: defaultAddress.city ?? "",
    country: defaultAddress.country,
  };
}

async function createOrderWithReference(
  supabase: SupabaseServerClient,
  input: {
    customerId: string;
    deliveryAddress: ResolvedDeliveryAddress;
    paymentMethod: "kort" | "faktura";
    status: string;
    totalAmount: number | null;
    discountPercent: number;
    discountLabel: string;
  },
): Promise<{ orderId: string; orderReference: string } | { error: string }> {
  let orderReference = generateOrderReference();

  // Fastfryses ved oprettelse (samme princip som leveringsadresse/priser) —
  // en senere ændring af kundens eksterne kundenummer må ikke ændre
  // historiske ordrer. Valgfrit felt, så null er en normal værdi her.
  const { data: profile } = await supabase
    .from("profiles")
    .select("external_customer_number")
    .eq("id", input.customerId)
    .maybeSingle();
  const externalCustomerNumberSnapshot =
    (profile?.external_customer_number as string | null) ?? null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        customer_id: input.customerId,
        delivery_recipient_name: input.deliveryAddress.recipientName,
        delivery_address_line1: input.deliveryAddress.addressLine1,
        delivery_address_line2: input.deliveryAddress.addressLine2,
        delivery_postal_code: input.deliveryAddress.postalCode,
        delivery_city: input.deliveryAddress.city,
        delivery_country: input.deliveryAddress.country,
        payment_method: input.paymentMethod,
        status: input.status,
        total_amount: input.totalAmount,
        order_reference: orderReference,
        discount_percent: input.discountPercent,
        discount_label: input.discountLabel,
        external_customer_number_snapshot: externalCustomerNumberSnapshot,
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

/**
 * Beregner rabatteret pris pr. linje (base_price_snapshot = normalpris,
 * unit_price_snapshot = det kunden reelt betaler) og indsætter ordrelinjerne.
 * Varer uden base_price ("pris oplyses snarest") får fortsat ingen pris —
 * intet at beregne rabat på.
 */
async function insertOrderItems(
  supabase: SupabaseServerClient,
  orderId: string,
  items: CartItem[],
  discountPercent: number,
): Promise<string | null> {
  const { error } = await supabase.from("order_items").insert(
    items.map((item) => ({
      order_id: orderId,
      product_id: item.productId,
      sku_snapshot: item.sku,
      name_snapshot: item.name,
      name_snapshot_da: item.nameDa,
      base_price_snapshot: item.basePrice,
      unit_price_snapshot:
        item.basePrice != null
          ? roundCurrency(item.basePrice * (1 - discountPercent / 100))
          : null,
      quantity: item.quantity,
    })),
  );

  if (error) {
    console.error("[insertOrderItems]", error);
    return "Kunne ikke oprette ordrelinjerne. Prøv igen.";
  }
  return null;
}

function computeDiscountedTotal(items: CartItem[], discountPercent: number): number | null {
  const pricedItems = items.filter((item) => item.basePrice != null);
  if (pricedItems.length === 0) return null;

  return roundCurrency(
    pricedItems.reduce((sum, item) => {
      const discountedUnit = roundCurrency(item.basePrice! * (1 - discountPercent / 100));
      return sum + discountedUnit * item.quantity;
    }, 0),
  );
}

/**
 * Starter kort-betaling for hele kurven: opretter en ordre + ordrelinjer
 * (med kundens rabat anvendt), beder Quickpay om et betalingslink for det
 * RABATTEREDE beløb, og redirecter kunden dertil. Faktura-sporet rører
 * denne funktion ikke ved.
 */
export async function initiateCardCheckoutAction(
  _prevState: CheckoutState,
  formData: FormData,
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

  const addresses = await listAddresses(user.id);
  const resolved = resolveDeliveryAddress(formData, addresses[0], user.email ?? null);
  if ("error" in resolved) {
    return { error: resolved.error };
  }

  const discount = await getCustomerDiscount();
  const totalAmount = computeDiscountedTotal(cart.items, discount.percent);
  if (totalAmount == null) {
    return { error: "Kunne ikke beregne et beløb for kurven." };
  }

  const created = await createOrderWithReference(supabase, {
    customerId: user.id,
    deliveryAddress: resolved,
    paymentMethod: "kort",
    status: "afventer_betaling",
    totalAmount,
    discountPercent: discount.percent,
    discountLabel: discount.label,
  });
  if ("error" in created) {
    return { error: created.error };
  }
  const { orderId, orderReference } = created;

  const itemsError = await insertOrderItems(supabase, orderId, cart.items, discount.percent);
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
  formData: FormData,
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
  const resolved = resolveDeliveryAddress(formData, addresses[0], user.email ?? null);
  if ("error" in resolved) {
    return { error: resolved.error };
  }

  const discount = await getCustomerDiscount();
  const totalAmount = computeDiscountedTotal(cart.items, discount.percent);

  const created = await createOrderWithReference(supabase, {
    customerId: user.id,
    deliveryAddress: resolved,
    paymentMethod: "faktura",
    status: "afventer",
    totalAmount,
    discountPercent: discount.percent,
    discountLabel: discount.label,
  });
  if ("error" in created) {
    return { error: created.error };
  }
  const { orderId, orderReference } = created;

  const itemsError = await insertOrderItems(supabase, orderId, cart.items, discount.percent);
  if (itemsError) {
    return { error: itemsError };
  }

  if (cart.id) {
    await supabase.from("cart_items").delete().eq("cart_id", cart.id);

    // Kurven er ryddet med det samme her (modsat kort, hvor det sker i
    // Quickpay-callbacket) — sørg for at /shop/kurv og kurv-badge'et i
    // headeren ikke viser en forældet, cachet version bagefter.
    revalidatePath("/shop/kurv");
    revalidatePath("/shop", "layout");
    refresh();
  }

  await Promise.all([
    sendInvoiceOrderNotification(orderId),
    sendOrderConfirmation(orderId),
  ]);

  redirect(`/shop/checkout/kvittering?order=${orderReference}`);
}
