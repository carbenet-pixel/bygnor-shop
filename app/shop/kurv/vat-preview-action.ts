"use server";

import { resolveVatSnapshot, computeVatBreakdown, type VatAmounts } from "@/lib/vat-rules";

export type VatPreviewResult = VatAmounts & {
  vatRate: number | null;
  countryKnown: boolean;
};

/**
 * Tynd genbrug af den eksisterende server-side moms-opslagslogik til
 * kurvens live-forhåndsvisning — ingen ny mapping, ingen sats duplikeret.
 * Samme funktioner som selve ordreoprettelsen (checkout-actions.ts) driver
 * sig efter (via create_customer_order()/vat_rules), blot kaldt her uden
 * at oprette nogen ordre.
 */
export async function previewVat(
  country: string,
  subtotal: number,
): Promise<VatPreviewResult> {
  const snapshot = country.trim() ? await resolveVatSnapshot(country) : null;

  return {
    ...computeVatBreakdown(subtotal, snapshot),
    vatRate: snapshot?.vatRate ?? null,
    countryKnown: snapshot != null,
  };
}
