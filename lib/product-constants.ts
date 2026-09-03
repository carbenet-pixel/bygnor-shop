// Ingen server-only-afhængigheder her med vilje — importeres både fra
// Server Components og fra klient-formularer (new-product-form.tsx m.fl.).
export const STOCK_STATUS_OPTIONS = ["bestillingsvare", "på_lager", "udgået"] as const;
