import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { roundCurrency } from "@/lib/format";
import { DISCOUNT_TYPE_OPTIONS, type DiscountType } from "@/lib/campaign-code-constants";

export type { DiscountType };

export type CampaignCodeAdmin = {
  id: string;
  code: string;
  vendorId: string | null;
  vendorName: string | null;
  discountType: DiscountType;
  discountValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
};

function toCampaignCodeAdmin(row: Record<string, unknown>): CampaignCodeAdmin {
  const vendor = row.vendors as unknown as { name: string } | null;
  return {
    id: row.id as string,
    code: row.code as string,
    vendorId: row.vendor_id as string | null,
    vendorName: vendor?.name ?? null,
    discountType: row.discount_type as DiscountType,
    discountValue: row.discount_value as number,
    startDate: row.start_date as string,
    endDate: row.end_date as string,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
  };
}

export async function listCampaignCodesAdmin(): Promise<CampaignCodeAdmin[]> {
  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin
    .from("campaign_codes")
    .select(
      "id, code, vendor_id, discount_type, discount_value, start_date, end_date, is_active, created_at, vendors(name)",
    )
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("[listCampaignCodesAdmin]", error);
    return [];
  }

  return data.map(toCampaignCodeAdmin);
}

export async function getCampaignCodeAdmin(id: string): Promise<CampaignCodeAdmin | null> {
  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin
    .from("campaign_codes")
    .select(
      "id, code, vendor_id, discount_type, discount_value, start_date, end_date, is_active, created_at, vendors(name)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return toCampaignCodeAdmin(data);
}

export type CampaignCodeInput = {
  code: string;
  vendorId: string | null;
  discountType: DiscountType;
  discountValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

function validateCampaignCodeInput(input: CampaignCodeInput): string | null {
  if (!input.code.trim()) return "Kode er påkrævet.";
  if (!DISCOUNT_TYPE_OPTIONS.includes(input.discountType)) return "Ugyldig rabattype.";
  if (!Number.isFinite(input.discountValue) || input.discountValue <= 0) {
    return "Rabatværdi skal være et positivt tal.";
  }
  if (input.discountType === "percent" && input.discountValue > 100) {
    return "Procentrabat kan ikke være over 100.";
  }
  if (!input.startDate || !input.endDate) return "Start- og slutdato er påkrævet.";
  if (new Date(input.endDate) <= new Date(input.startDate)) {
    return "Slutdato skal være efter startdato.";
  }
  return null;
}

export type CampaignCodeResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function createCampaignCode(
  input: CampaignCodeInput,
  createdBy: string,
): Promise<CampaignCodeResult> {
  const fieldsError = validateCampaignCodeInput(input);
  if (fieldsError) return { success: false, error: fieldsError };

  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin
    .from("campaign_codes")
    .insert({
      code: input.code.trim().toUpperCase(),
      vendor_id: input.vendorId,
      discount_type: input.discountType,
      discount_value: input.discountValue,
      start_date: input.startDate,
      end_date: input.endDate,
      is_active: input.isActive,
      created_by: createdBy,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return { success: false, error: "Koden findes allerede." };
    }
    console.error("[createCampaignCode]", error);
    return { success: false, error: "Kunne ikke oprette kampagnekoden." };
  }

  return { success: true, id: data.id as string };
}

export async function updateCampaignCode(
  id: string,
  input: CampaignCodeInput,
): Promise<CampaignCodeResult> {
  const fieldsError = validateCampaignCodeInput(input);
  if (fieldsError) return { success: false, error: fieldsError };

  const supabaseAdmin = createAdminClient();

  const { error } = await supabaseAdmin
    .from("campaign_codes")
    .update({
      code: input.code.trim().toUpperCase(),
      vendor_id: input.vendorId,
      discount_type: input.discountType,
      discount_value: input.discountValue,
      start_date: input.startDate,
      end_date: input.endDate,
      is_active: input.isActive,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Koden findes allerede." };
    }
    console.error("[updateCampaignCode]", error);
    return { success: false, error: "Kunne ikke opdatere kampagnekoden." };
  }

  return { success: true, id };
}

// --- Kundevendt validering og prisberegning ---

export type ValidatedCampaignCode = {
  id: string;
  code: string;
  vendorId: string | null;
  discountType: DiscountType;
  discountValue: number;
};

export type CampaignCodeValidation =
  | { valid: true; campaignCode: ValidatedCampaignCode }
  | { valid: false; error: string };

// Bevidst ÉN generisk fejlbesked for alle afvisningsgrunde (findes ikke,
// inaktiv, endnu ikke startet, udløbet) — en kunde må ikke kunne skelne
// "forkert kode" fra "udløbet kode" og dermed "scanne" sig frem til
// gyldige koder ved at prøve sig frem.
const INVALID_CODE_ERROR = "Ugyldig eller udløbet kampagnekode.";

/**
 * Kaldes UDELUKKENDE server-side (Server Actions/Server Components) via
 * service_role — campaign_codes har intet grant til authenticated (se
 * migration 0027), så dette er den eneste vej til at læse en kode.
 */
export async function validateCampaignCode(rawCode: string): Promise<CampaignCodeValidation> {
  const code = rawCode.trim().toUpperCase();
  if (!code) {
    return { valid: false, error: "Indtast en kampagnekode." };
  }

  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin
    .from("campaign_codes")
    .select("id, code, vendor_id, discount_type, discount_value, start_date, end_date, is_active")
    .eq("code", code)
    .maybeSingle();

  if (error || !data) {
    return { valid: false, error: INVALID_CODE_ERROR };
  }

  const now = new Date();
  const start = new Date(data.start_date as string);
  const end = new Date(data.end_date as string);

  if (!data.is_active || now < start || now > end) {
    return { valid: false, error: INVALID_CODE_ERROR };
  }

  return {
    valid: true,
    campaignCode: {
      id: data.id as string,
      code: data.code as string,
      vendorId: data.vendor_id as string | null,
      discountType: data.discount_type as DiscountType,
      discountValue: data.discount_value as number,
    },
  };
}

export type LineDiscountResult = {
  unitPrice: number;
  campaignDiscountPerUnit: number;
  usedCampaign: boolean;
};

/**
 * En vareline får den BEDSTE (laveste) pris af enten kundens eget rabat-
 * niveau (gruppe/individuel, allerede maxet i lib/discount-groups.ts) eller
 * kampagnekoden — aldrig begge lagt sammen. Kampagnen skal give en STRENGT
 * lavere pris end kundens egen rabat for at "vinde" (samme tie-break-
 * princip som individuel-vs-gruppe: uafgjort går til den eksisterende
 * rabat). Gælder kun linjer hvor koden ikke er leverandør-scopet, eller
 * scopet matcher linjens vendorId — ellers ingen effekt for den linje.
 */
export function computeLineDiscount(
  basePrice: number,
  vendorId: string | null,
  customerDiscountPercent: number,
  campaignCode: ValidatedCampaignCode | null,
): LineDiscountResult {
  const customerPrice = roundCurrency(basePrice * (1 - customerDiscountPercent / 100));

  const campaignApplies =
    campaignCode != null &&
    (campaignCode.vendorId == null || campaignCode.vendorId === vendorId);

  if (!campaignApplies) {
    return { unitPrice: customerPrice, campaignDiscountPerUnit: 0, usedCampaign: false };
  }

  const campaignPrice = roundCurrency(
    campaignCode.discountType === "percent"
      ? basePrice * (1 - campaignCode.discountValue / 100)
      : Math.max(0, basePrice - campaignCode.discountValue),
  );

  if (campaignPrice < customerPrice) {
    return {
      unitPrice: campaignPrice,
      campaignDiscountPerUnit: roundCurrency(basePrice - campaignPrice),
      usedCampaign: true,
    };
  }

  return { unitPrice: customerPrice, campaignDiscountPerUnit: 0, usedCampaign: false };
}
