"use server";

import { revalidatePath } from "next/cache";
import { updateProduct, updateProductImageUrl } from "@/lib/products-admin";
import { convertAndUploadProductImage } from "@/lib/product-image";

function parseOptionalNumber(raw: FormDataEntryValue | null): number | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function updateProductAction(formData: FormData) {
  const productId = (formData.get("productId") as string) ?? "";
  if (!productId) return;

  await updateProduct(productId, {
    name: ((formData.get("name") as string) ?? "").trim(),
    description: ((formData.get("description") as string) ?? "").trim() || null,
    productGroupId: (formData.get("productGroupId") as string) ?? "",
    vendorId: (formData.get("vendorId") as string) ?? "",
    catalogPage: parseOptionalNumber(formData.get("catalogPage")),
    basePrice: parseOptionalNumber(formData.get("basePrice")),
    vatRate: parseOptionalNumber(formData.get("vatRate")) ?? 25,
    stockStatus: (formData.get("stockStatus") as string) ?? "bestillingsvare",
    leadTimeDays: parseOptionalNumber(formData.get("leadTimeDays")),
    active: formData.get("active") === "on",
  });

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/shop/katalog");
}

export type UploadImageState = { error: string | null; success: boolean };

export async function uploadProductImageAction(
  _prevState: UploadImageState,
  formData: FormData,
): Promise<UploadImageState> {
  const productId = (formData.get("productId") as string) ?? "";
  const sku = (formData.get("sku") as string) ?? "";
  const image = formData.get("image");

  if (!productId || !sku) {
    return { error: "Mangler produkt-id eller SKU.", success: false };
  }
  if (!(image instanceof File) || image.size === 0) {
    return { error: "Vælg en billedfil først.", success: false };
  }

  const result = await convertAndUploadProductImage(sku, image);
  if (!result.success) {
    return { error: result.error, success: false };
  }

  await updateProductImageUrl(productId, result.url);

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/shop/katalog");

  return { error: null, success: true };
}
