"use server";

import { revalidatePath } from "next/cache";
import { AuthorizationError, requireRole } from "@/lib/admin-guard";
import {
  createCampaignCode,
  updateCampaignCode,
  type CampaignCodeInput,
  type DiscountType,
} from "@/lib/campaign-codes";

export type CampaignCodeFormState = { error: string | null; success: boolean };

function readCampaignCodeInput(formData: FormData): CampaignCodeInput {
  return {
    code: ((formData.get("code") as string) ?? "").trim(),
    vendorId: ((formData.get("vendorId") as string) ?? "").trim() || null,
    discountType: ((formData.get("discountType") as string) ?? "percent") as DiscountType,
    discountValue: Number(formData.get("discountValue")),
    startDate: ((formData.get("startDate") as string) ?? "").trim(),
    endDate: ((formData.get("endDate") as string) ?? "").trim(),
    isActive: formData.get("isActive") === "on",
  };
}

export async function createCampaignCodeAction(
  _prevState: CampaignCodeFormState,
  formData: FormData,
): Promise<CampaignCodeFormState> {
  let userId: string;
  try {
    ({ userId } = await requireRole("admin"));
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { error: err.message, success: false };
    }
    throw err;
  }

  const result = await createCampaignCode(readCampaignCodeInput(formData), userId);

  if (!result.success) {
    return { error: result.error, success: false };
  }

  revalidatePath("/admin/campaign-codes");
  return { error: null, success: true };
}

export async function updateCampaignCodeAction(formData: FormData) {
  await requireRole("admin");

  const id = (formData.get("campaignCodeId") as string) ?? "";
  if (!id) return;

  await updateCampaignCode(id, readCampaignCodeInput(formData));

  revalidatePath("/admin/campaign-codes");
  revalidatePath(`/admin/campaign-codes/${id}`);
}
