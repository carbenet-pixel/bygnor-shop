// Ingen server-only-afhængigheder her med vilje — importeres både fra
// Server Components og fra catalog-browser.tsx, som er en Client Component.
export function formatPrice(price: number | null): string {
  if (price == null) {
    return "Pris oplyses snarest";
  }
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
  }).format(price);
}

/** Runder til 2 decimaler (øre) — bruges ved rabatberegning, så linjepriser
 * altid er et reelt kronebeløb, og summen af de viste linjer matcher den
 * viste total. */
export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * GUI og kundevendte tekster viser altid det danske produktnavn, med
 * fallback til det oprindelige (svenske) navn for produkter der endnu
 * ikke er oversat — se products.name_da / order_items.name_snapshot_da.
 * Bruges ALDRIG til fakturanotifikationen til salg, som bevidst forbliver
 * svensk (Pidos eget varenavn, til bestilling).
 */
export function displayName(item: { name: string; nameDa: string | null }): string {
  return item.nameDa ?? item.name;
}

/**
 * mailto-link til "Kontakt os for tilbud" (price_on_request-produkter) —
 * emailadressen selv skal hentes server-side (lib/contact.ts, ikke
 * NEXT_PUBLIC_-prefikset), men selve subject-opbygningen er ren
 * strengmanipulation og deles derfor her mellem server- og client-brug.
 */
export function buildQuoteRequestMailto(
  email: string,
  sku: string,
  name: string,
): string {
  const subject = encodeURIComponent(`Prisforespørgsel: ${sku} – ${name}`);
  return `mailto:${email}?subject=${subject}`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("da-DK", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

const COMBINING_DIACRITICS = new RegExp("[̀-ͯ]", "g");

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
