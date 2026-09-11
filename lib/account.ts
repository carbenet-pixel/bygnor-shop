import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCustomerDiscount, type CustomerDiscount } from "@/lib/discount-groups";

export type CustomerAccountInfo = {
  email: string | null;
  companyName: string | null;
  externalCustomerNumber: string | null;
  phone: string | null;
  discount: CustomerDiscount;
};

/**
 * Kundens egen, læsevisning-kun kontoinfo til /shop/konto/indstillinger —
 * ikke en admin-funktion (modsat lib/customers.ts), derfor session-bundet
 * klient og kun EGEN profil (samme RLS-afgrænsning som resten af
 * kundefladen, se migration 0001 "Bruger kan se egen profil").
 */
export async function getOwnAccountInfo(): Promise<CustomerAccountInfo | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, discount] = await Promise.all([
    supabase
      .from("profiles")
      .select("company_name, external_customer_number, phone")
      .eq("id", user.id)
      .maybeSingle(),
    getCustomerDiscount(),
  ]);

  return {
    email: user.email ?? null,
    companyName: (profile?.company_name as string | null) ?? null,
    externalCustomerNumber: (profile?.external_customer_number as string | null) ?? null,
    phone: (profile?.phone as string | null) ?? null,
    discount,
  };
}

export type UpdatePhoneResult = { success: boolean; error?: string };

/**
 * Eneste kontooplysning kunden selv må redigere — firma/CVR/rabat/
 * betalingsmetode forbliver admin-only (se lib/customers.ts). Skriver
 * via den session-bundne klient, RLS afgrænser allerede til egen profil.
 */
export async function updateOwnPhone(phone: string): Promise<UpdatePhoneResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Ikke logget ind." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ phone })
    .eq("id", user.id);

  if (error) {
    console.error("[updateOwnPhone]", error);
    return { success: false, error: "Kunne ikke opdatere telefonnummer — prøv igen." };
  }

  return { success: true };
}
