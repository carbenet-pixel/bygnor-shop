import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type Vendor = {
  id: string;
  name: string;
};

export async function listVendors(): Promise<Vendor[]> {
  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin
    .from("vendors")
    .select("id, name")
    .order("name");

  if (error || !data) {
    console.error("[listVendors]", error);
    return [];
  }

  return data.map((v) => ({ id: v.id as string, name: v.name as string }));
}
