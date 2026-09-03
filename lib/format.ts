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
