"use server";

import { revalidatePath } from "next/cache";
import { updateCustomer } from "@/lib/customers";

function parseOptionalNumber(raw: FormDataEntryValue | null): number | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function updateCustomerAction(formData: FormData) {
  const customerId = formData.get("customerId") as string;
  const discountGroup = ((formData.get("discountGroup") as string) ?? "").trim();
  const isActive = formData.get("isActive") === "on";
  const paymentMethod = ((formData.get("paymentMethod") as string) ?? "").trim();

  if (!customerId || !discountGroup) return;

  await updateCustomer({
    customerId,
    discountGroup,
    individualDiscount: parseOptionalNumber(formData.get("individualDiscount")),
    isActive,
    paymentMethod,
    creditLimit: parseOptionalNumber(formData.get("creditLimit")),
    paymentTermsDays: parseOptionalNumber(formData.get("paymentTermsDays")),
  });

  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${customerId}`);
}
