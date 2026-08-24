import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type DiscountGroup = {
  id: string;
  name: string;
  discountPercent: number;
};

export async function getDiscountGroups(): Promise<DiscountGroup[]> {
  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin
    .from("discount_groups")
    .select("id, name, discount_percent")
    .order("discount_percent", { ascending: true });

  if (error || !data) {
    console.error("[getDiscountGroups]", error);
    return [];
  }

  return data.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    discountPercent: row.discount_percent as number,
  }));
}

export type UpdateDiscountGroupResult =
  | { success: true }
  | { success: false; error: string };

export async function updateDiscountGroup(
  id: string,
  discountPercent: number,
): Promise<UpdateDiscountGroupResult> {
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
    return { success: false, error: "Procentsatsen skal være mellem 0 og 100." };
  }

  const supabaseAdmin = createAdminClient();

  const { error } = await supabaseAdmin
    .from("discount_groups")
    .update({ discount_percent: discountPercent, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[updateDiscountGroup]", error);
    return { success: false, error: "Kunne ikke opdatere rabatgruppen." };
  }

  return { success: true };
}
