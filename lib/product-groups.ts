import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type ProductGroupAdmin = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  productCount: number;
};

export async function listProductGroupsAdmin(): Promise<ProductGroupAdmin[]> {
  const supabaseAdmin = createAdminClient();

  const [
    { data: groups, error: groupsError },
    { data: categories },
    { data: products },
  ] = await Promise.all([
    supabaseAdmin.from("product_groups").select("id, name, category_id").order("name"),
    supabaseAdmin.from("categories").select("id, name"),
    supabaseAdmin.from("products").select("product_group_id"),
  ]);

  if (groupsError || !groups) {
    console.error("[listProductGroupsAdmin]", groupsError);
    return [];
  }

  const categoryNameById = new Map(
    (categories ?? []).map((c) => [c.id as string, c.name as string]),
  );

  const countByGroup = new Map<string, number>();
  for (const p of products ?? []) {
    const groupId = p.product_group_id as string;
    countByGroup.set(groupId, (countByGroup.get(groupId) ?? 0) + 1);
  }

  return groups
    .map((g) => ({
      id: g.id as string,
      name: g.name as string,
      categoryId: g.category_id as string,
      categoryName: categoryNameById.get(g.category_id as string) ?? "—",
      productCount: countByGroup.get(g.id as string) ?? 0,
    }))
    .sort(
      (a, b) =>
        a.categoryName.localeCompare(b.categoryName, "da") ||
        a.name.localeCompare(b.name, "da"),
    );
}

export type ProductGroupInput = {
  name: string;
  categoryId: string;
};

export type ProductGroupResult = { success: true } | { success: false; error: string };

export async function createProductGroup(
  input: ProductGroupInput,
): Promise<ProductGroupResult> {
  if (!input.name || !input.categoryId) {
    return { success: false, error: "Navn og kategori er påkrævet." };
  }

  const supabaseAdmin = createAdminClient();

  const { error } = await supabaseAdmin.from("product_groups").insert({
    name: input.name,
    category_id: input.categoryId,
  });

  if (error) {
    console.error("[createProductGroup]", error);
    return { success: false, error: "Kunne ikke oprette produktgruppen." };
  }

  return { success: true };
}

export async function updateProductGroup(
  id: string,
  input: ProductGroupInput,
): Promise<ProductGroupResult> {
  if (!input.name || !input.categoryId) {
    return { success: false, error: "Navn og kategori er påkrævet." };
  }

  const supabaseAdmin = createAdminClient();

  const { error } = await supabaseAdmin
    .from("product_groups")
    .update({ name: input.name, category_id: input.categoryId })
    .eq("id", id);

  if (error) {
    console.error("[updateProductGroup]", error);
    return { success: false, error: "Kunne ikke opdatere produktgruppen." };
  }

  return { success: true };
}
