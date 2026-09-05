"use server";

import { revalidatePath } from "next/cache";
import { updateInvoiceOrderStatus } from "@/lib/orders-admin";

export async function updateOrderStatusAction(formData: FormData) {
  const orderId = (formData.get("orderId") as string) ?? "";
  const status = (formData.get("status") as string) ?? "";

  if (!orderId || !status) return;

  await updateInvoiceOrderStatus(orderId, status);

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}
