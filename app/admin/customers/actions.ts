"use server";

import { revalidatePath } from "next/cache";
import { updateCustomer } from "@/lib/customers";

export async function updateCustomerAction(formData: FormData) {
  const customerId = formData.get("customerId") as string;
  const discountGroup = ((formData.get("discountGroup") as string) ?? "").trim();
  const individualDiscountRaw = ((formData.get("individualDiscount") as string) ?? "").trim();
  const isActive = formData.get("isActive") === "on";

  if (!customerId || !discountGroup) return;

  const individualDiscount = individualDiscountRaw
    ? Number(individualDiscountRaw)
    : null;

  await updateCustomer({
    customerId,
    discountGroup,
    individualDiscount,
    isActive,
  });

  revalidatePath("/admin/customers");
}
