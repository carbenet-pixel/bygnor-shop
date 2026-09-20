import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { roundCurrency } from "@/lib/format";

export type VatRule = {
  destinationCountry: string;
  vatRate: number;
  vatType: string;
  invoiceNote: string;
  isActive: boolean;
};

/**
 * Til admin-UI'et (/admin/vat-rules) — samme "hent alt, rediger i UI'et"-
 * mønster som lib/discount-groups.ts.
 */
export async function listVatRules(): Promise<VatRule[]> {
  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin
    .from("vat_rules")
    .select("destination_country, vat_rate, vat_type, invoice_note, is_active")
    .order("destination_country", { ascending: true });

  if (error || !data) {
    console.error("[listVatRules]", error);
    return [];
  }

  return data.map((row) => ({
    destinationCountry: row.destination_country as string,
    vatRate: row.vat_rate as number,
    vatType: row.vat_type as string,
    invoiceNote: row.invoice_note as string,
    isActive: row.is_active as boolean,
  }));
}

export type UpdateVatRuleResult = { success: boolean; error?: string };

/**
 * Kun vat_rate/invoice_note/is_active er beregnet til at blive rettet her —
 * destination_country og vat_type er den strukturelle del af reglen, ikke
 * noget der skal ændres fra dag til dag i admin-UI'et.
 */
export async function updateVatRule(
  destinationCountry: string,
  vatRate: number,
  invoiceNote: string,
  isActive: boolean,
): Promise<UpdateVatRuleResult> {
  if (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 100) {
    return { success: false, error: "Momssatsen skal være mellem 0 og 100." };
  }

  const supabaseAdmin = createAdminClient();

  const { error } = await supabaseAdmin
    .from("vat_rules")
    .update({
      vat_rate: vatRate,
      invoice_note: invoiceNote,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("destination_country", destinationCountry);

  if (error) {
    console.error("[updateVatRule]", error);
    return { success: false, error: "Kunne ikke opdatere momsreglen." };
  }

  return { success: true };
}

export type VatSnapshot = {
  vatRate: number;
  vatType: string;
  vatDestination: string;
  vatNote: string;
};

/**
 * delivery_addresses.country (og den midlertidige engangsadresses eget
 * landefelt) er fritekst, ikke en landekode-vælger — vat_rules er derimod
 * nøglet på landekode (DK/GL/FO), som prompten selv bad om. Denne mapping
 * er ren plumbing for at forbinde de to, IKKE en antagelse om satser/
 * lovtekster — udvid listen hvis flere stavemåder/lande bliver relevante.
 */
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  danmark: "DK",
  denmark: "DK",
  dk: "DK",
  grønland: "GL",
  greenland: "GL",
  gl: "GL",
  færøerne: "FO",
  "faroe islands": "FO",
  fo: "FO",
};

function resolveDestinationCountryCode(countryFreeText: string): string | null {
  return COUNTRY_NAME_TO_CODE[countryFreeText.trim().toLowerCase()] ?? null;
}

/**
 * Slår den aktive momsregel op for leveringslandet og bygger det snapshot
 * der fryses på ordren ved oprettelse (se checkout-actions.ts). Intet match
 * (ukendt land, eller ingen aktiv regel for landet) giver bevidst null,
 * IKKE en gættet standardsats — jf. kravet om ikke selv at antage satser.
 */
export async function resolveVatSnapshot(
  countryFreeText: string,
): Promise<VatSnapshot | null> {
  const code = resolveDestinationCountryCode(countryFreeText);
  if (!code) {
    console.error(
      "[resolveVatSnapshot] ukendt leveringsland, intet moms-snapshot dannet:",
      countryFreeText,
    );
    return null;
  }

  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin
    .from("vat_rules")
    .select("vat_rate, vat_type, invoice_note")
    .eq("destination_country", code)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    console.error(
      "[resolveVatSnapshot] ingen aktiv momsregel fundet for",
      code,
      error,
    );
    return null;
  }

  return {
    vatRate: data.vat_rate as number,
    vatType: data.vat_type as string,
    vatDestination: code,
    vatNote: data.invoice_note as string,
  };
}

export type VatAmounts = {
  subtotalAmount: number | null;
  vatAmount: number | null;
  totalAmount: number | null;
};

/**
 * subtotal er den rabatterede, ex-moms varesum (samme tal
 * computeDiscountedTotal() i checkout-actions.ts altid har beregnet).
 * totalAmount er det FAKTISK opkrævede/betalte beløb (inkl. moms) — det er
 * dette tal der skal bruges til Quickpay og som ordrens total, ikke
 * subtotalAmount. Intet vatSnapshot (ukendt leveringsland/ingen aktiv
 * regel) giver bevidst vatAmount=null og totalAmount=subtotal — falder
 * tilbage til den hidtidige (ex-moms) opførsel frem for at gætte en sats.
 */
export function computeVatBreakdown(
  subtotal: number | null,
  vatSnapshot: VatSnapshot | null,
): VatAmounts {
  if (subtotal == null) {
    return { subtotalAmount: null, vatAmount: null, totalAmount: null };
  }
  if (!vatSnapshot) {
    return { subtotalAmount: subtotal, vatAmount: null, totalAmount: subtotal };
  }
  const vatAmount = roundCurrency((subtotal * vatSnapshot.vatRate) / 100);
  return {
    subtotalAmount: subtotal,
    vatAmount,
    totalAmount: roundCurrency(subtotal + vatAmount),
  };
}
