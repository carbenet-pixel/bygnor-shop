import Link from "next/link";
import {
  listOrdersAdmin,
  FULFILLMENT_STATUS_LABELS,
  FULFILLMENT_STATUS_BADGE_CLASSES,
} from "@/lib/orders-admin";
import { formatPrice, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const cellClass = "px-4 py-3 align-middle";
const inputClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#185FA5] focus:ring-2 focus:ring-[#185FA5]/20";

const STATUS_OPTIONS = ["afventer", "afventer_betaling", "betalt", "betaling_fejlet", "annulleret"];

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  kort: "Kort",
  faktura: "Faktura",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; paymentMethod?: string; all?: string }>;
}) {
  const { status, paymentMethod, all } = await searchParams;
  const showAll = all === "1";
  const orders = await listOrdersAdmin({ status, paymentMethod, showAll });

  const toggleParams = new URLSearchParams();
  if (status) toggleParams.set("status", status);
  if (paymentMethod) toggleParams.set("paymentMethod", paymentMethod);
  if (!showAll) toggleParams.set("all", "1");
  const toggleHref = `/admin/orders${toggleParams.toString() ? `?${toggleParams.toString()}` : ""}`;

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Ordrer</h1>
      <p className="mb-6 text-sm text-slate-500">
        {orders.length} {orders.length === 1 ? "ordre" : "ordrer"} —{" "}
        {showAll
          ? "alle ordrer, nyeste først"
          : "kræver handling (ny/bestilt hos leverandør), ældste først"}
      </p>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <form action="/admin/orders" method="GET" className="flex flex-wrap gap-3">
          {showAll && <input type="hidden" name="all" value="1" />}
          <select name="status" defaultValue={status ?? ""} className={inputClass}>
            <option value="">Alle betalingsstatusser</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select name="paymentMethod" defaultValue={paymentMethod ?? ""} className={inputClass}>
            <option value="">Alle betalingsmetoder</option>
            <option value="kort">Kort</option>
            <option value="faktura">Faktura</option>
          </select>
          <button
            type="submit"
            className="rounded-md bg-[#185FA5] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#144e88]"
          >
            Filtrér
          </button>
          {(status || paymentMethod) && (
            <Link
              href={showAll ? "/admin/orders?all=1" : "/admin/orders"}
              className="flex items-center text-sm text-slate-500 hover:text-[#185FA5]"
            >
              Nulstil filtre
            </Link>
          )}
        </form>

        <Link
          href={toggleHref}
          className="text-sm font-medium text-[#185FA5] hover:underline"
        >
          {showAll ? "Vis kun ordrer der kræver handling" : "Vis alle ordrer →"}
        </Link>
      </div>

      {orders.length === 0 ? (
        <p className="text-sm text-slate-500">
          {showAll ? "Ingen ordrer matcher filteret." : "Ingen ordrer kræver handling lige nu."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
              <tr>
                <th className={cellClass}>Ordrereference</th>
                <th className={cellClass}>Kunde</th>
                <th className={cellClass}>Dato</th>
                <th className={cellClass}>Betaling</th>
                <th className={cellClass}>Betalingsstatus</th>
                <th className={cellClass}>Ekspedition</th>
                <th className={cellClass}>Beløb</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className={order.fulfillmentStatus === "ny" ? "bg-rose-50" : undefined}
                >
                  <td className={cellClass}>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-medium text-slate-900 hover:text-[#185FA5] hover:underline"
                    >
                      {order.orderReference ?? order.id}
                    </Link>
                  </td>
                  <td className={`${cellClass} text-slate-500`}>
                    {order.customerName ?? "—"}
                  </td>
                  <td className={`${cellClass} text-slate-500`}>
                    {formatDate(order.createdAt)}
                  </td>
                  <td className={cellClass}>
                    {PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}
                  </td>
                  {/* Bevidst uden farve — betalingsstatus må aldrig kunne
                      aflæses som et signal om ordren er færdigbehandlet. */}
                  <td className={`${cellClass} text-slate-500`}>{order.status}</td>
                  <td className={cellClass}>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        FULFILLMENT_STATUS_BADGE_CLASSES[order.fulfillmentStatus] ??
                        "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {FULFILLMENT_STATUS_LABELS[order.fulfillmentStatus] ??
                        order.fulfillmentStatus}
                    </span>
                  </td>
                  <td className={`${cellClass} font-medium text-slate-900`}>
                    {formatPrice(order.totalAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
