"use server";

import { revalidatePath, refresh } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listAddresses, type DeliveryAddress } from "@/lib/delivery-addresses";
import { getCart, clearPurchasedCartItems, type CartItem } from "@/lib/cart";
import { createPaymentAndLink } from "@/lib/quickpay";
import { sendInvoiceOrderNotification, sendOrderConfirmation } from "@/lib/order-mail";

export type CheckoutState = { error: string | null };

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

/**
 * Håndhæves også server-side, ikke kun via den deaktiverede knap i UI'et —
 * en deaktiveret knap forhindrer ikke et direkte POST til denne action.
 */
function requireTermsAccepted(formData: FormData): { error: string } | null {
  if (formData.get("termsAccepted") !== "on") {
    return {
      error: "Du skal acceptere handelsbetingelserne og privatlivspolitikken for at gennemføre bestillingen.",
    };
  }
  return null;
}

type CreateCustomerOrderRow = {
  order_id: string;
  order_reference: string;
  subtotal_amount: number | null;
  vat_amount: number | null;
  total_amount: number | null;
};

/**
 * ENESTE vej til at oprette en ordre (migration 0032/0033) — kunden har
 * ikke længere direkte INSERT-adgang til orders/order_items overhovedet.
 * RPC'en genberegner ALT server-side (pris, rabat, kampagnekode, moms) og
 * opretter ordrehoved + alle linjer i én transaktion — herfra sendes
 * ALDRIG et beløb, kun produkt-id'er/antal og ren tekst (leverings-
 * adresse, betalingsmetode, kampagnekode). Se create_customer_order() i
 * 0033 for selve genberegningen, som spejler (og nu er den autoritative
 * version af) lib/discount-groups.ts, lib/campaign-codes.ts og
 * lib/vat-rules.ts — de TS-funktioner rører vi ikke, de driver fortsat
 * kun kurv-sidens forhåndsvisning.
 *
 * error.code 'P0001' er plpgsql's standard-SQLSTATE for et almindeligt
 * `raise exception` UDEN eksplicit ERRCODE — det er sådan funktionens
 * egne, bevidste danske fejlbeskeder ("Din konto er ikke godkendt til
 * fakturabetaling." osv.) kan skelnes fra en uventet databasefejl (som
 * aldrig bør vises råt til kunden), samme mønster som `error.code ===
 * "23505"` allerede brugte i denne fil før omlægningen.
 */
async function callCreateCustomerOrder(
  customerId: string,
  items: CartItem[],
  paymentMethod: "kort" | "faktura",
  deliveryAddress: ResolvedDeliveryAddress,
  campaignCodeRaw: string,
): Promise<{ order: CreateCustomerOrderRow } | { error: string }> {
  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin.rpc("create_customer_order", {
    p_customer_id: customerId,
    p_items: items.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
    p_payment_method: paymentMethod,
    p_delivery_recipient_name: deliveryAddress.recipientName,
    p_delivery_address_line1: deliveryAddress.addressLine1,
    p_delivery_address_line2: deliveryAddress.addressLine2,
    p_delivery_postal_code: deliveryAddress.postalCode,
    p_delivery_city: deliveryAddress.city,
    p_delivery_country: deliveryAddress.country,
    p_campaign_code: campaignCodeRaw.trim() || null,
  });

  if (error || !data || data.length === 0) {
    console.error("[callCreateCustomerOrder]", error);
    if (error?.code === "P0001") {
      return { error: error.message };
    }
    return { error: "Kunne ikke oprette ordren. Prøv igen." };
  }

  return { order: data[0] as CreateCustomerOrderRow };
}

/**
 * Starter kort-betaling for hele kurven: opretter ordre + ordrelinjer via
 * create_customer_order() (rabat/moms/pris genberegnet server-side), beder
 * Quickpay om et betalingslink for det AF FUNKTIONEN returnerede beløb
 * (aldrig et lokalt genberegnet tal), og redirecter kunden dertil.
 * Faktura-sporet rører denne funktion ikke ved.
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

  const termsError = requireTermsAccepted(formData);
  if (termsError) {
    return termsError;
  }

  const cart = await getCart();
  if (cart.items.length === 0) {
    return { error: "Kurven er tom." };
  }

  // Hurtigt, venligt fejlsvar uden en RPC-tur — den reelle, autoritative
  // håndhævelse af denne regel sker inde i create_customer_order() selv.
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

  const campaignCodeRaw = (formData.get("campaignCode") as string) ?? "";

  const created = await callCreateCustomerOrder(
    user.id,
    cart.items,
    "kort",
    resolved,
    campaignCodeRaw,
  );
  if ("error" in created) {
    return { error: created.error };
  }
  const { order } = created;

  if (order.total_amount == null) {
    // Bør ikke kunne ske — create_customer_order() afviser allerede kort
    // uden en kendt pris — men beholdt som sidste sikkerhedsnet, så vi
    // aldrig kalder Quickpay uden et beløb.
    console.error("[initiateCardCheckoutAction] RPC returnerede intet total_amount", order);
    return { error: "Kunne ikke beregne et beløb for kurven." };
  }

  let linkUrl: string;
  try {
    const amountInOre = Math.round(order.total_amount * 100);
    const result = await createPaymentAndLink(order.order_reference, amountInOre);
    linkUrl = result.linkUrl;

    // orders har intet update-grant til authenticated (0011/0032) —
    // Quickpay-referencerne skrives via service_role. Fejler DENNE
    // skrivning (forbigående DB-fejl/netværk), har callback-handleren
    // ingen vej til at matche en senere Quickpay-bekræftelse til ordren
    // (den slår op på quickpay_payment_id) — kunden må derfor IKKE sendes
    // videre til Quickpay i så fald.
    const supabaseAdmin = createAdminClient();
    const { error: quickpayRefError } = await supabaseAdmin
      .from("orders")
      .update({
        quickpay_payment_id: result.paymentId,
        quickpay_link_url: result.linkUrl,
      })
      .eq("id", order.order_id);

    if (quickpayRefError) {
      // Ordren efterlades bevidst i den status create_customer_order()
      // allerede satte (afventer_betaling) — samme princip som når selve
      // Quickpay-kaldet fejler nedenfor: vi ved ikke med sikkerhed at
      // betalingen fejlede (linket blev rent faktisk oprettet hos
      // Quickpay), kun at VI mistede sporet af det, så en gættet
      // betaling_fejlet ville være misvisende. Kunden ser aldrig linket
      // (ingen redirect), så intet betalingsforsøg kan reelt ske.
      console.error(
        "[initiateCardCheckoutAction] kunne ikke gemme quickpay_payment_id",
        order.order_id,
        quickpayRefError,
      );
      return { error: "Kunne ikke starte betalingen. Prøv igen." };
    }
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

  const termsError = requireTermsAccepted(formData);
  if (termsError) {
    return termsError;
  }

  // Hurtigt, venligt fejlsvar uden en RPC-tur — samme regel håndhæves
  // (uændret) igen inde i create_customer_order() selv, jf. prompten.
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

  const campaignCodeRaw = (formData.get("campaignCode") as string) ?? "";

  const created = await callCreateCustomerOrder(
    user.id,
    cart.items,
    "faktura",
    resolved,
    campaignCodeRaw,
  );
  if ("error" in created) {
    return { error: created.error };
  }
  const { order } = created;

  if (cart.id) {
    // Kun de FAKTISK bestilte linjer fjernes (audit-fund #14) — en vare
    // kunden har tilføjet i en anden fane mens denne ordre blev oprettet
    // bliver stående. Bruger service_role for konsistens med kort-sporet
    // (route.ts), som er tvunget til det (intet session ved et webhook).
    const supabaseAdmin = createAdminClient();
    await clearPurchasedCartItems(supabaseAdmin, cart.id, order.order_id);

    // Kurven er ryddet med det samme her (modsat kort, hvor det sker i
    // Quickpay-callbacket) — sørg for at /shop/kurv og kurv-badge'et i
    // headeren ikke viser en forældet, cachet version bagefter.
    revalidatePath("/shop/kurv");
    revalidatePath("/shop", "layout");
    refresh();
  }

  await Promise.all([
    sendInvoiceOrderNotification(order.order_id),
    sendOrderConfirmation(order.order_id),
  ]);

  redirect(`/shop/checkout/kvittering?order=${order.order_reference}`);
}
