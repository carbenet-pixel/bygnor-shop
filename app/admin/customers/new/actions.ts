"use server";

import { redirect } from "next/navigation";
import {
  createCustomerAsAdmin,
  type AdminCreateCustomerErrorCode,
} from "@/lib/customer-application";

export type CreateCustomerState = {
  error: AdminCreateCustomerErrorCode | null;
};

function parseOptionalNumber(raw: FormDataEntryValue | null): number | undefined {
  if (typeof raw !== "string" || raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export async function createCustomer(
  _prevState: CreateCustomerState,
  formData: FormData,
): Promise<CreateCustomerState> {
  const paymentMethod = formData.get("paymentMethod");

  const result = await createCustomerAsAdmin({
    companyName: ((formData.get("companyName") as string) ?? "").trim(),
    cvrNumber: ((formData.get("cvrNumber") as string) ?? "").trim(),
    contactName: ((formData.get("contactName") as string) ?? "").trim(),
    email: ((formData.get("email") as string) ?? "").trim(),
    streetAddress: ((formData.get("streetAddress") as string) ?? "").trim(),
    postalCode: ((formData.get("postalCode") as string) ?? "").trim(),
    city: ((formData.get("city") as string) ?? "").trim(),
    country: ((formData.get("country") as string) ?? "").trim(),
    phone: ((formData.get("phone") as string) ?? "").trim() || undefined,
    // Sendes ukoerceret videre — createCustomerAsAdmin validerer selv at det
    // rent faktisk er 'kort' eller 'kredit'.
    paymentMethod: paymentMethod as "kort" | "kredit",
    discountGroup:
      ((formData.get("discountGroup") as string) ?? "").trim() || undefined,
    individualDiscount: parseOptionalNumber(formData.get("individualDiscount")),
    creditLimit: parseOptionalNumber(formData.get("creditLimit")),
    paymentTermsDays: parseOptionalNumber(formData.get("paymentTermsDays")),
  });

  if (!result.success) {
    return { error: result.error };
  }

  redirect("/admin/customers/new?success=1");
}
