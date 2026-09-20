"use server";

import { revalidatePath } from "next/cache";
import { updateVatRule } from "@/lib/vat-rules";

export async function updateVatRuleAction(formData: FormData) {
  const destinationCountry = (formData.get("destinationCountry") as string) ?? "";
  const vatRateRaw = ((formData.get("vatRate") as string) ?? "").trim();
  const invoiceNote = ((formData.get("invoiceNote") as string) ?? "").trim();
  const isActive = formData.get("isActive") === "on";

  if (!destinationCountry || !vatRateRaw) return;

  const vatRate = Number(vatRateRaw);
  if (!Number.isFinite(vatRate)) return;

  await updateVatRule(destinationCountry, vatRate, invoiceNote, isActive);

  revalidatePath("/admin/vat-rules");
}
