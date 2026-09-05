import Link from "next/link";
import { listOrdersAdmin } from "@/lib/orders-admin";
import { formatPrice, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const cellClass = "px-4 py-3 align-middle";
const inputClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#185FA5] focus:ring-2 focus:ring-[#185FA5]/20";

const STATUS_OPTIONS = [
  "afventer",
  "afventer_betaling",
  "betalt",
  "betaling_fejlet",
  "annulleret",
  "behandlet",
  "afsendt",
];

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  kort: "Kort",
  faktura: "Faktura",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; paymentMethod?: string }>;
}) {
  const { status, paymentMethod } = await searchParams;
  const orders = await listOrdersAdmin({ status, paymentMethod });

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Ordrer</h1>
      <p className="mb-6 text-sm text-slate-500">
        {orders.length} {orders.length === 1 ? "ordre" : "ordrer"}
      </p>

      <form action="/admin/orders" method="GET" className="mb-6 flex flex-wrap gap-3">
        <select name="status" defaultValue={status ?? ""} className={inputClass}>
          <option value="">Alle statusser</option>
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
            href="/admin/orders"
            className="flex items-center text-sm text-slate-500 hover:text-[#185FA5]"
          >
            Nulstil
          </Link>
        )}
      </form>

      {orders.length === 0 ? (
        <p className="text-sm text-slate-500">Ingen ordrer matcher filteret.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
              <tr>
                <th className={cellClass}>Ordrereference</th>
                <th className={cellClass}>Kunde</th>
                <th className={cellClass}>Dato</th>
                <th className={cellClass}>Betaling</th>
                <th className={cellClass}>Status</th>
                <th className={cellClass}>Beløb</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => {
                const needsAction = order.status === "afventer" && order.paymentMethod === "faktura";
                return (
                  <tr key={order.id} className={needsAction ? "bg-amber-50" : undefined}>
                    <td className={cellClass}>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-medium text-slate-900 hover:text-[#185FA5] hover:underline"
                      >
                        {order.orderReference ?? order.id}
                      </Link>
                      {needsAction && (
                        <span className="ml-2 rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800">
                          Kræver handling
                        </span>
                      )}
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
                    <td className={cellClass}>{order.status}</td>
                    <td className={`${cellClass} font-medium text-slate-900`}>
                      {formatPrice(order.totalAmount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
