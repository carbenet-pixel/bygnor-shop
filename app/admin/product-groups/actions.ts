"use server";

import { revalidatePath } from "next/cache";
import { createProductGroup, updateProductGroup } from "@/lib/product-groups";

export type ProductGroupFormState = { error: string | null; success: boolean };

function readGroupInput(formData: FormData) {
  return {
    name: ((formData.get("name") as string) ?? "").trim(),
    categoryId: (formData.get("categoryId") as string) ?? "",
  };
}

export async function updateProductGroupAction(formData: FormData) {
  const groupId = (formData.get("groupId") as string) ?? "";
  if (!groupId) return;

  await updateProductGroup(groupId, readGroupInput(formData));

  revalidatePath("/admin/product-groups");
  revalidatePath("/admin/products");
  revalidatePath("/shop/katalog");
}

export async function createProductGroupAction(
  _prevState: ProductGroupFormState,
  formData: FormData,
): Promise<ProductGroupFormState> {
  const result = await createProductGroup(readGroupInput(formData));

  if (!result.success) {
    return { error: result.error, success: false };
  }

  revalidatePath("/admin/product-groups");
  revalidatePath("/admin/products");

  return { error: null, success: true };
}
