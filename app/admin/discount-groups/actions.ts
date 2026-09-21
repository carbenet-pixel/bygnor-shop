"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/admin-guard";
import { updateDiscountGroup } from "@/lib/discount-groups";

export async function updateDiscountGroupAction(formData: FormData) {
  await requireRole("superadmin");

  const id = formData.get("id") as string;
  const raw = ((formData.get("discountPercent") as string) ?? "").trim();

  if (!id || !raw) return;

  const discountPercent = Number(raw);
  if (!Number.isFinite(discountPercent)) return;

  await updateDiscountGroup(id, discountPercent);

  revalidatePath("/admin/discount-groups");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/customers/new");
}
