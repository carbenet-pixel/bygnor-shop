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
 * Den aktuelt loggede ind kundes reelle rabat: den HØJESTE af rabatgruppens
 * sats og profiles.individual_discount — bekræftet af Søren. Individuel
 * rabat trumfer altså kun når den er STRENGT højere end gruppens sats,
 * ikke en ubetinget overstyring (den tidligere antagelse holdt kun på ét
 * testdatapunkt, hvor gruppen tilfældigvis var 0% — se rettelsen her).
 * Ingen session → 0%.
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

  const { data: group } = await supabase
    .from("discount_groups")
    .select("name, discount_percent")
    .eq("id", profile.discount_group as string)
    .maybeSingle();

  const groupPercent = (group?.discount_percent as number | undefined) ?? 0;
  const groupName = (group?.name as string | undefined) ?? "Standard";
  const individualPercent = profile.individual_discount as number | null;

  if (individualPercent != null && individualPercent > groupPercent) {
    return { percent: individualPercent, label: `Individuel rabat (${individualPercent}%)` };
  }

  return { percent: groupPercent, label: `${groupName} (${groupPercent}%)` };
}
