import Link from "next/link";
import { listOrdersForCustomer, PAYMENT_METHOD_LABELS } from "@/lib/orders";
import { formatPrice, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const cellClass = "px-4 py-3 align-middle";

export default async function CustomerOrdersPage() {
  const orders = await listOrdersForCustomer();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link
        href="/shop/katalog"
        className="mb-4 inline-block text-xs text-slate-400 hover:text-[#185FA5]"
      >
        ← Tilbage til katalog
      </Link>

      <h1 className="mb-6 text-xl font-semibold text-slate-900">Mine ordrer</h1>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="mb-4 text-sm text-slate-500">
            Du har ikke afgivet nogen ordrer endnu.
          </p>
          <Link
            href="/shop/katalog"
            className="text-sm font-medium text-[#185FA5] hover:underline"
          >
            Gå til kataloget →
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
              <tr>
                <th className={cellClass}>Ordrereference</th>
                <th className={cellClass}>Dato</th>
                <th className={cellClass}>Betaling</th>
                <th className={cellClass}>Status</th>
                <th className={cellClass}>Ekspedition</th>
                <th className={cellClass}>Beløb</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className={cellClass}>
                    <Link
                      href={`/shop/ordrer/${order.id}`}
                      className="font-medium text-slate-900 hover:text-[#185FA5] hover:underline"
                    >
                      {order.orderReference ?? order.id}
                    </Link>
                  </td>
                  <td className={`${cellClass} text-slate-500`}>
                    {formatDate(order.createdAt)}
                  </td>
                  <td className={cellClass}>
                    {PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}
                  </td>
                  <td className={`${cellClass} text-slate-500`}>
                    {order.paymentStatusLabel}
                  </td>
                  <td className={`${cellClass} text-slate-500`}>
                    {order.fulfillmentStatusLabel}
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
