import Link from "next/link";
import { listOrdersForCustomer, PAYMENT_METHOD_LABELS } from "@/lib/orders";
import { formatPrice, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const cellClass = "px-4 py-3 align-middle";

export default async function KontoOrdrerPage() {
  const orders = await listOrdersForCustomer();

  if (orders.length === 0) {
    return (
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
    );
  }

  return (
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
  );
}
