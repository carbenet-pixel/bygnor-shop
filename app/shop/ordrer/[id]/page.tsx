import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderForCustomer, PAYMENT_METHOD_LABELS } from "@/lib/orders";
import { formatPrice, formatDate, formatAddressLines, formatVatBreakdownLines } from "@/lib/format";

export const dynamic = "force-dynamic";

const cellClass = "px-3 py-2 align-middle";
const labelClass = "mb-1 block text-sm font-medium text-slate-700";

export default async function CustomerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderForCustomer(id);

  if (!order) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/shop/konto/ordrer"
        className="mb-4 inline-block text-xs text-slate-400 hover:text-bygnor-blue"
      >
        ← Tilbage til mine ordrer
      </Link>

      <h1 className="mb-1 text-xl font-semibold text-foreground">
        {order.orderReference ?? order.id}
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        Oprettet {formatDate(order.createdAt)}
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Leveringsadresse
          </h2>
          {formatAddressLines({
            companyName: order.companyName,
            attentionName: order.deliveryRecipientName,
            streetAddress: order.deliveryAddressLine1,
            addressLine2: order.deliveryAddressLine2,
            postalCode: order.deliveryPostalCode,
            city: order.deliveryCity,
            country: order.deliveryCountry,
          }).map((line, index) => (
            <p
              key={index}
              className={index === 0 ? "text-sm text-foreground" : "text-sm text-slate-500"}
            >
              {line}
            </p>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Status
          </h2>
          <div className="space-y-4">
            <div>
              <span className={labelClass}>Betalingsmetode</span>
              <p className="text-sm text-foreground">
                {PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}
              </p>
            </div>
            <div>
              <span className={labelClass}>Betalingsstatus</span>
              <p className="text-sm text-foreground">{order.paymentStatusLabel}</p>
            </div>
            <div>
              <span className={labelClass}>Ekspeditionsstatus</span>
              <p className="text-sm text-foreground">{order.fulfillmentStatusLabel}</p>
            </div>
            {formatVatBreakdownLines({
              subtotalAmount: order.subtotalAmount,
              vatAmount: order.vatAmount,
              totalAmount: order.totalAmount,
              vatRate: order.vatRate,
            }).map((line) => (
              <div key={line.label}>
                <span className={labelClass}>{line.label}</span>
                <p
                  className={
                    line.emphasis
                      ? "text-sm font-semibold text-foreground"
                      : "text-sm text-foreground"
                  }
                >
                  {line.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
            <tr>
              <th className={cellClass}>Vare</th>
              <th className={cellClass}>Varenr.</th>
              <th className={cellClass}>Antal</th>
              <th className={cellClass}>Pris pr. stk</th>
              <th className={cellClass}>Linjesum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {order.items.map((item, index) => (
              <tr key={index}>
                <td className={`${cellClass} font-medium text-foreground`}>
                  {item.name}
                </td>
                <td className={`${cellClass} text-slate-500`}>{item.sku}</td>
                <td className={cellClass}>{item.quantity}</td>
                <td className={cellClass}>{formatPrice(item.unitPrice)}</td>
                <td className={cellClass}>
                  {item.unitPrice != null
                    ? formatPrice(item.unitPrice * item.quantity)
                    : "Pris oplyses snarest"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
