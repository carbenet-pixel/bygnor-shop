import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatPrice, formatVatBreakdownLines } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kvittering" };

export default async function ReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderReference } = await searchParams;

  if (!orderReference) {
    notFound();
  }

  const supabase = await createClient();
  // RLS ("Kunde ser egne ordrer, admin ser alle") afgør synlighed her —
  // ingen ekstra ejerskabs-tjek nødvendig i selve koden.
  const { data: order } = await supabase
    .from("orders")
    .select("status, total_amount, subtotal_amount, vat_amount, vat_rate")
    .eq("order_reference", orderReference)
    .maybeSingle();

  if (!order) {
    notFound();
  }

  const showVatInfo =
    (order.status === "afventer" || order.status === "betalt") &&
    order.subtotal_amount != null;
  const vatBreakdownLines = showVatInfo
    ? formatVatBreakdownLines({
        subtotalAmount: order.subtotal_amount,
        vatAmount: order.vat_amount,
        totalAmount: order.total_amount,
        vatRate: order.vat_rate,
      })
    : [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      {order.status === "afventer" && (
        <>
          <h1 className="mb-2 text-xl font-semibold text-foreground">
            Ordre modtaget
          </h1>
          <p className="mb-6 text-sm text-slate-500">
            Din ordre er registreret med faktura som betalingsmetode
            {order.total_amount != null
              ? ` for ${formatPrice(order.total_amount)}`
              : ""}
            . Vores salgsafdeling kontakter dig snarest.
          </p>
        </>
      )}

      {order.status === "afventer_betaling" && (
        <>
          <h1 className="mb-2 text-xl font-semibold text-foreground">
            Betaling behandles
          </h1>
          <p className="mb-6 text-sm text-slate-500">
            Vi har endnu ikke fået den endelige bekræftelse fra Quickpay —
            det kan tage et øjeblik. Denne side opdaterer sig ikke automatisk.
          </p>
          <Link
            href={`/shop/checkout/kvittering?order=${orderReference}`}
            className="mb-6 inline-block text-sm font-medium text-bygnor-blue hover:underline"
          >
            Opdater status
          </Link>
        </>
      )}

      {order.status === "betalt" && (
        <>
          <h1 className="mb-2 text-xl font-semibold text-foreground">
            Tak for din betaling
          </h1>
          <p className="mb-6 text-sm text-slate-500">
            Din ordre er bekræftet
            {order.total_amount != null
              ? ` for ${formatPrice(order.total_amount)}`
              : ""}
            .
          </p>
        </>
      )}

      {order.status === "betaling_fejlet" && (
        <>
          <h1 className="mb-2 text-xl font-semibold text-foreground">
            Betalingen mislykkedes
          </h1>
          <p className="mb-6 text-sm text-slate-500">
            Der opstod et problem med betalingen hos Quickpay. Din kurv er
            bevaret, så du kan prøve igen.
          </p>
        </>
      )}

      {showVatInfo && (
        <div className="mb-6 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          {vatBreakdownLines.map((line) => (
            <p key={line.label} className={line.emphasis ? "font-semibold text-foreground" : ""}>
              {line.label}: {line.value}
            </p>
          ))}
        </div>
      )}

      <div>
        <Link
          href="/shop/katalog"
          className="inline-block rounded-md bg-bygnor-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:brightness-90"
        >
          Til kataloget
        </Link>
      </div>
    </div>
  );
}
