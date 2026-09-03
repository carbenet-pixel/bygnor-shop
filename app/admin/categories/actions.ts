"use server";

import { revalidatePath } from "next/cache";
import { createCategory, updateCategory } from "@/lib/categories";
import { slugify } from "@/lib/format";

export type CategoryFormState = { error: string | null; success: boolean };

function readCategoryInput(formData: FormData) {
  const name = ((formData.get("name") as string) ?? "").trim();
  const rawSlug = ((formData.get("slug") as string) ?? "").trim();

  return {
    name,
    slug: rawSlug || slugify(name),
    imageUrl: ((formData.get("imageUrl") as string) ?? "").trim() || null,
  };
}

export async function updateCategoryAction(formData: FormData) {
  const categoryId = (formData.get("categoryId") as string) ?? "";
  if (!categoryId) return;

  await updateCategory(categoryId, readCategoryInput(formData));

  revalidatePath("/admin/categories");
  revalidatePath("/admin/product-groups");
  revalidatePath("/shop");
  revalidatePath("/shop/katalog");
}

export async function createCategoryAction(
  _prevState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const result = await createCategory(readCategoryInput(formData));

  if (!result.success) {
    return { error: result.error, success: false };
  }

  revalidatePath("/admin/categories");
  revalidatePath("/admin/product-groups");
  revalidatePath("/shop");

  return { error: null, success: true };
}
