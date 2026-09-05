"use server";

import { revalidatePath } from "next/cache";
import { addToCart } from "@/lib/cart";

export type AddToCartState = { error: string | null; addedAt: number };

export async function addToCartAction(
  prevState: AddToCartState,
  formData: FormData,
): Promise<AddToCartState> {
  const productId = (formData.get("productId") as string) ?? "";
  const quantityRaw = (formData.get("quantity") as string) ?? "1";
  const quantity = Number.parseInt(quantityRaw, 10);

  if (!productId) {
    return { error: "Ukendt produkt.", addedAt: prevState.addedAt };
  }

  const result = await addToCart(productId, Number.isFinite(quantity) ? quantity : 1);

  if (!result.success) {
    return { error: result.error, addedAt: prevState.addedAt };
  }

  revalidatePath("/shop", "layout");
  revalidatePath("/shop/kurv");

  return { error: null, addedAt: Date.now() };
}