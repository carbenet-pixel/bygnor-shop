"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Ikke logget ind.", success: false };
  }

  const result = await createCampaignCode(readCampaignCodeInput(formData), user.id);

  if (!result.success) {
    return { error: result.error, success: false };
  }

  revalidatePath("/admin/campaign-codes");
  return { error: null, success: true };
}

export async function updateCampaignCodeAction(formData: FormData) {
  const id = (formData.get("campaignCodeId") as string) ?? "";
  if (!id) return;

  await updateCampaignCode(id, readCampaignCodeInput(formData));

  revalidatePath("/admin/campaign-codes");
  revalidatePath(`/admin/campaign-codes/${id}`);
}
