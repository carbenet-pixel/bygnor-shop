import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

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
    .select("status, total_amount")
    .eq("order_reference", orderReference)
    .maybeSingle();

  if (!order) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      {order.status === "afventer_betaling" && (
        <>
          <h1 className="mb-2 text-xl font-semibold text-slate-900">
            Betaling behandles
          </h1>
          <p className="mb-6 text-sm text-slate-500">
            Vi har endnu ikke fået den endelige bekræftelse fra Quickpay —
            det kan tage et øjeblik. Denne side opdaterer sig ikke automatisk.
          </p>
          <Link
            href={`/shop/checkout/kvittering?order=${orderReference}`}
            className="mb-6 inline-block text-sm font-medium text-[#185FA5] hover:underline"
          >
            Opdater status
          </Link>
        </>
      )}

      {order.status === "betalt" && (
        <>
          <h1 className="mb-2 text-xl font-semibold text-slate-900">
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
          <h1 className="mb-2 text-xl font-semibold text-slate-900">
            Betalingen mislykkedes
          </h1>
          <p className="mb-6 text-sm text-slate-500">
            Der opstod et problem med betalingen hos Quickpay. Din kurv er
            bevaret, så du kan prøve igen.
          </p>
        </>
      )}

      <div>
        <Link
          href="/shop/katalog"
          className="inline-block rounded-md bg-[#185FA5] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#144e88]"
        >
          Til kataloget
        </Link>
      </div>
    </div>
  );
}
