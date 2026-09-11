// Ingen server-only-afhængigheder her med vilje — importeres både fra
// Server Components og fra klient-formularer (new-campaign-code-form.tsx),
// samme mønster som lib/product-constants.ts.
export type DiscountType = "percent" | "fixed";
export const DISCOUNT_TYPE_OPTIONS: DiscountType[] = ["percent", "fixed"];
