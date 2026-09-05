"use server";

import { revalidatePath } from "next/cache";
import { updateCartItemQuantity, removeCartItem } from "@/lib/cart";

export async function updateCartItemAction(formData: FormData) {
  const cartItemId = (formData.get("cartItemId") as string) ?? "";
  const quantityRaw = (formData.get("quantity") as string) ?? "";
  const quantity = Number.parseInt(quantityRaw, 10);

  if (!cartItemId || !Number.isFinite(quantity)) return;

  await updateCartItemQuantity(cartItemId, quantity);

  revalidatePath("/shop/kurv");
  revalidatePath("/shop", "layout");
}

export async function removeCartItemAction(formData: FormData) {
  const cartItemId = (formData.get("cartItemId") as string) ?? "";
  if (!cartItemId) return;

  await removeCartItem(cartItemId);

  revalidatePath("/shop/kurv");
  revalidatePath("/shop", "layout");
}
