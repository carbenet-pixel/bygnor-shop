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
