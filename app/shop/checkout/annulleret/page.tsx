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
      .select("id, status")
      .eq("order_reference", orderReference)
      .maybeSingle();

    if (order && order.status === "afventer_betaling") {
      const supabaseAdmin = createAdminClient();
      await supabaseAdmin
        .from("orders")
        .update({ status: "annulleret" })
        .eq("id", order.id);
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
