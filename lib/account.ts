import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCustomerDiscount, type CustomerDiscount } from "@/lib/discount-groups";

export type CustomerAccountInfo = {
  email: string | null;
  companyName: string | null;
  externalCustomerNumber: string | null;
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
      .select("company_name, external_customer_number")
      .eq("id", user.id)
      .maybeSingle(),
    getCustomerDiscount(),
  ]);

  return {
    email: user.email ?? null,
    companyName: (profile?.company_name as string | null) ?? null,
    externalCustomerNumber: (profile?.external_customer_number as string | null) ?? null,
    discount,
  };
}
