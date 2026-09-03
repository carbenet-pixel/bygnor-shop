import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type CategoryAdmin = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
};

export async function listCategoriesAdmin(): Promise<CategoryAdmin[]> {
  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin
    .from("categories")
    .select("id, name, slug, image_url")
    .order("name");

  if (error || !data) {
    console.error("[listCategoriesAdmin]", error);
    return [];
  }

  return data.map((c) => ({
    id: c.id as string,
    name: c.name as string,
    slug: c.slug as string,
    imageUrl: c.image_url as string | null,
  }));
}

export type CategoryInput = {
  name: string;
  slug: string;
  imageUrl: string | null;
};

export type CategoryResult = { success: true } | { success: false; error: string };

export async function createCategory(input: CategoryInput): Promise<CategoryResult> {
  if (!input.name || !input.slug) {
    return { success: false, error: "Navn og slug er påkrævet." };
  }

  const supabaseAdmin = createAdminClient();

  const { error } = await supabaseAdmin.from("categories").insert({
    name: input.name,
    slug: input.slug,
    image_url: input.imageUrl,
  });

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Slug findes allerede — vælg et andet." };
    }
    console.error("[createCategory]", error);
    return { success: false, error: "Kunne ikke oprette kategorien." };
  }

  return { success: true };
}

export async function updateCategory(
  id: string,
  input: CategoryInput,
): Promise<CategoryResult> {
  if (!input.name || !input.slug) {
    return { success: false, error: "Navn og slug er påkrævet." };
  }

  const supabaseAdmin = createAdminClient();

  const { error } = await supabaseAdmin
    .from("categories")
    .update({ name: input.name, slug: input.slug, image_url: input.imageUrl })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Slug findes allerede — vælg et andet." };
    }
    console.error("[updateCategory]", error);
    return { success: false, error: "Kunne ikke opdatere kategorien." };
  }

  return { success: true };
}
