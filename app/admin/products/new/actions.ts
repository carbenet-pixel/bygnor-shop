"use server";

import { revalidatePath } from "next/cache";
import { createProduct, updateProductImageUrl } from "@/lib/products-admin";
import { convertAndUploadProductImage } from "@/lib/product-image";

export type CreateProductState = {
  error: string | null;
  success: boolean;
  warning: string | null;
};

function parseOptionalNumber(raw: FormDataEntryValue | null): number | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function createProductAction(
  _prevState: CreateProductState,
  formData: FormData,
): Promise<CreateProductState> {
  const sku = ((formData.get("sku") as string) ?? "").trim();
  const vatRateRaw = parseOptionalNumber(formData.get("vatRate"));

  const result = await createProduct(sku, {
    name: ((formData.get("name") as string) ?? "").trim(),
    description: ((formData.get("description") as string) ?? "").trim() || null,
    productGroupId: (formData.get("productGroupId") as string) ?? "",
    vendorId: (formData.get("vendorId") as string) ?? "",
    catalogPage: parseOptionalNumber(formData.get("catalogPage")),
    basePrice: parseOptionalNumber(formData.get("basePrice")),
    vatRate: vatRateRaw ?? 25,
    stockStatus: (formData.get("stockStatus") as string) ?? "bestillingsvare",
    leadTimeDays: parseOptionalNumber(formData.get("leadTimeDays")),
    active: formData.get("active") === "on",
  });

  if (!result.success) {
    return { error: result.error, success: false, warning: null };
  }

  revalidatePath("/admin/products");

  const image = formData.get("image");
  let warning: string | null = null;

  if (image instanceof File && image.size > 0) {
    const uploadResult = await convertAndUploadProductImage(sku, image);
    if (uploadResult.success) {
      await updateProductImageUrl(result.id, uploadResult.url);
      revalidatePath("/shop/katalog");
    } else {
      warning = `Produktet er oprettet, men billedet kunne ikke uploades: ${uploadResult.error}`;
    }
  }

  return { error: null, success: true, warning };
}
