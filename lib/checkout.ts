import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Om den aktuelle kunde er godkendt til fakturabetaling
 * (profiles.invoice_approved, sat af admin/superadmin — se migration 0011).
 */
export async function isInvoiceApproved(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("profiles")
    .select("invoice_approved")
    .eq("id", user.id)
    .maybeSingle();

  return data?.invoice_approved === true;
}
