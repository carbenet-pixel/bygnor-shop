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

export type PostalAddressInfo = {
  companyName: string | null;
  attentionName: string | null;
  streetAddress: string;
  addressLine2?: string | null;
  postalCode: string | null;
  city: string | null;
  country: string;
};

/**
 * Fælles, fragt-klar formatering af en leveringsadresse — samme
 * linjerækkefølge i kurven, ordrebekræftelsen (kunde og admin) og
 * fakturamailen til salg. "attentionName" er delivery_addresses.contact_name
 * (eller den midlertidige engangsadresses "Modtagernavn") — det er ikke
 * kundens firmanavn, som altid hentes separat fra profiles.company_name.
 * Att-linjen og adresselinje 2 udelades helt når de er tomme, i stedet for
 * en synligt tom linje.
 */
export function formatAddressLines(address: PostalAddressInfo): string[] {
  const lines: string[] = [address.companyName ?? "—"];
  if (address.attentionName) {
    lines.push(`Att: ${address.attentionName}`);
  }
  lines.push(address.streetAddress);
  if (address.addressLine2) {
    lines.push(address.addressLine2);
  }
  lines.push(`${address.postalCode ?? ""} ${address.city ?? ""}`.trim());
  lines.push(address.country);
  return lines;
}

export type VatBreakdownInput = {
  subtotalAmount: number | null;
  vatAmount: number | null;
  totalAmount: number | null;
  vatRate: number | null;
};

export type VatBreakdownLine = { label: string; value: string; emphasis?: boolean };

/**
 * Fælles moms-opstilling — samme tre linjer (varer ekskl. moms, moms,
 * total) i kurven, kvitteringssiden, kunde-/admin-ordrevisningen og begge
 * ordre-mails. vatRate/vatAmount kan være null (ukendt leveringsland/ingen
 * aktiv momsregel) — vises da som en tydelig "kan ikke beregnes"-linje i
 * stedet for at gætte 0 kr, jf. princippet om aldrig at antage en sats.
 * Momslinjen vises altid når der er en subtotal, ALDRIG skjult ved 0% —
 * gennemsigtighed for GL/FO-ordrer, ikke kun DK.
 */
export function formatVatBreakdownLines(input: VatBreakdownInput): VatBreakdownLine[] {
  const lines: VatBreakdownLine[] = [];

  if (input.subtotalAmount != null) {
    lines.push({ label: "Varer (ekskl. moms)", value: formatPrice(input.subtotalAmount) });

    if (input.vatRate != null && input.vatAmount != null) {
      lines.push({ label: `Moms (${input.vatRate}%)`, value: formatPrice(input.vatAmount) });
    } else {
      lines.push({ label: "Moms", value: "Kan ikke beregnes (ukendt leveringsland)" });
    }
  }

  // Altid en Total-linje, også når intet kan beregnes endnu (formatPrice(null)
  // giver selv "Pris oplyses snarest") — samme fallback som resten af UI'et
  // bruger for uprissatte varer, ikke en tom/manglende linje.
  lines.push({ label: "Total", value: formatPrice(input.totalAmount), emphasis: true });

  return lines;
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
