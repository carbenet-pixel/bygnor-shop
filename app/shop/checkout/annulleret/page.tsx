import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function CancelledCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderReference } = await searchParams;

  if (orderReference) {
    // RLS-tjek via den session-bundne klient bekræfter ejerskab, FØR vi
    // bruger service_role til selve opdateringen (orders har ingen update-
    // grant til authenticated, jf. 0011).
    const supabase = await createClient();
    const { data: order } = await supabase
      .from("orders")
      .select("id")
      .eq("order_reference", orderReference)
      .maybeSingle();

    if (order) {
      // Atomisk, betinget statusskift — samme mønster som Quickpay-
      // callbackets (app/api/quickpay/callback/route.ts, audit-fund #7/#8):
      // WHERE'et ER selve concurrency-sikringen, ikke den ovenfor
      // udlæste (og potentielt allerede forældede) status. Et sent
      // capture-callback der lander samtidig kan derfor ikke blive
      // overskrevet af denne — og denne kan ikke overskrive en allerede
      // betalt ordre — uanset hvilken af de to rammer databasen først.
      // Gør siden sikker at genbesøge (reload, tilbage-knap, gammelt
      // link) uden bivirkninger ud over det første, gyldige skift.
      const supabaseAdmin = createAdminClient();
      const { error } = await supabaseAdmin
        .from("orders")
        .update({ status: "annulleret" })
        .eq("id", order.id)
        .eq("status", "afventer_betaling");

      if (error) {
        console.error("[annulleret] kunne ikke opdatere ordre til annulleret", order.id, error);
      }
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="mb-2 text-xl font-semibold text-slate-900">
        Betalingen blev annulleret
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        Din kurv er bevaret, så du kan prøve igen når du er klar.
      </p>
      <Link
        href="/shop/kurv"
        className="inline-block rounded-md bg-[#185FA5] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#144e88]"
      >
        Tilbage til kurven
      </Link>
    </div>
  );
}
