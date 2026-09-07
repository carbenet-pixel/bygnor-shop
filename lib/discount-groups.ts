import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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

export type CustomerDiscount = {
  percent: number;
  label: string;
};

/**
 * Den aktuelt loggede ind kundes reelle rabat: profiles.individual_discount
 * (Fase 2), når sat, OVERSTYRER rabatgruppens sats — det er den eneste
 * meningsfulde tolkning af at begge felter findes på samme profil (bekræftet
 * mod rigtige data: en kunde med discount_group='standard' (0%) har
 * individual_discount=3, som tydeligvis skal være den effektive sats).
 * Ellers bruges gruppens discount_percent. Ingen session → 0%.
 */
export async function getCustomerDiscount(): Promise<CustomerDiscount> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { percent: 0, label: "Standard (0%)" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("discount_group, individual_discount")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return { percent: 0, label: "Standard (0%)" };
  }

  if (profile.individual_discount != null) {
    const percent = profile.individual_discount as number;
    return { percent, label: `Individuel rabat (${percent}%)` };
  }

  const { data: group } = await supabase
    .from("discount_groups")
    .select("name, discount_percent")
    .eq("id", profile.discount_group as string)
    .maybeSingle();

  if (!group) {
    return { percent: 0, label: "Standard (0%)" };
  }

  const percent = group.discount_percent as number;
  return { percent, label: `${group.name as string} (${percent}%)` };
}
