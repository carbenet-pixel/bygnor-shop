import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getOrderAdmin,
  INVOICE_STATUS_OPTIONS,
  FULFILLMENT_STATUS_OPTIONS,
  FULFILLMENT_STATUS_LABELS,
  FULFILLMENT_STATUS_BADGE_CLASSES,
} from "@/lib/orders-admin";
import { formatPrice, formatDate } from "@/lib/format";
import { SaveButton } from "@/components/save-button";
import { updateOrderStatusAction, updateOrderFulfillmentStatusAction } from "../actions";

export const dynamic = "force-dynamic";

const cellClass = "px-3 py-2 align-middle";
const labelClass = "mb-1 block text-sm font-medium text-slate-700";
const inputClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#185FA5] focus:ring-2 focus:ring-[#185FA5]/20";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  kort: "Kort",
  faktura: "Faktura",
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderAdmin(id);

  if (!order) {
    notFound();
  }

  const isInvoice = order.paymentMethod === "faktura";
  const paymentFormId = `order-status-${order.id}`;
  const fulfillmentFormId = `order-fulfillment-${order.id}`;

  const pricedItems = order.items.filter((item) => item.basePrice != null);
  const normalTotal = pricedItems.reduce(
    (sum, item) => sum + item.basePrice! * item.quantity,
    0,
  );
  const discountTotal =
    pricedItems.length > 0 ? normalTotal - (order.totalAmount ?? normalTotal) : 0;

  return (
    <div>
      <Link
        href="/admin/orders"
        className="mb-4 inline-block text-xs text-slate-400 hover:text-[#185FA5]"
      >
        ← Tilbage til ordrer
      </Link>

      <h1 className="mb-1 text-xl font-semibold text-slate-900">
        {order.orderReference ?? order.id}
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        Oprettet {formatDate(order.createdAt)}
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Kunde</h2>
          <p className="text-sm text-slate-900">{order.customerName ?? "Ukendt"}</p>
          {order.cvrNumber && (
            <p className="text-sm text-slate-500">CVR {order.cvrNumber}</p>
          )}
          <p className="text-sm text-slate-500">{order.customerEmail ?? "—"}</p>
          <div className="mt-3">
            <span className={labelClass}>Eksternt kundenummer (KNI/Aarhus-fragt)</span>
            <p className="text-sm text-slate-900">{order.externalCustomerNumber ?? ""}</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Leveringsadresse
          </h2>
          <p className="text-sm text-slate-900">{order.deliveryRecipientName}</p>
          <p className="text-sm text-slate-500">{order.deliveryAddressLine1}</p>
          {order.deliveryAddressLine2 && (
            <p className="text-sm text-slate-500">{order.deliveryAddressLine2}</p>
          )}
          <p className="text-sm text-slate-500">
            {order.deliveryPostalCode} {order.deliveryCity}
          </p>
          <p className="text-sm text-slate-500">{order.deliveryCountry}</p>
        </div>
      </div>

      {/* Betaling og ekspedition er bevidst to adskilte kort — betalingsstatus
          er ikke et signal om ordren er håndteret. */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Betaling</h2>
          <div className="space-y-4">
            <div>
              <span className={labelClass}>Betalingsmetode</span>
              <p className="text-sm text-slate-900">
                {PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}
              </p>
            </div>

            <div>
              <span className={labelClass}>Betalingsstatus</span>
              {isInvoice ? (
                <div>
                  <form id={paymentFormId} action={updateOrderStatusAction}>
                    <input type="hidden" name="orderId" value={order.id} />
                  </form>
                  <div className="flex items-center gap-2">
                    <select
                      form={paymentFormId}
                      name="status"
                      defaultValue={order.status}
                      className={inputClass}
                    >
                      {INVOICE_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <SaveButton formId={paymentFormId} action={updateOrderStatusAction} />
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-900">{order.status}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Styres udelukkende af Quickpay-callbacket — kan ikke
                    redigeres her.
                  </p>
                </>
              )}
            </div>

            {!isInvoice && (
              <div>
                <span className={labelClass}>Quickpay payment-id</span>
                <p className="text-sm text-slate-900">
                  {order.quickpayPaymentId ?? "—"}
                </p>
              </div>
            )}

            <div>
              <span className={labelClass}>Rabat</span>
              <p className="text-sm text-slate-900">
                {order.discountLabel ?? `${order.discountPercent}%`}
              </p>
            </div>

            {pricedItems.length > 0 && (
              <div>
                <span className={labelClass}>Normalpris i alt</span>
                <p className="text-sm text-slate-900">{formatPrice(normalTotal)}</p>
              </div>
            )}

            {discountTotal > 0 && (
              <div>
                <span className={labelClass}>Rabat i alt</span>
                <p className="text-sm text-emerald-700">
                  -{formatPrice(discountTotal)}
                </p>
              </div>
            )}

            <div>
              <span className={labelClass}>Samlet beløb (endelig pris)</span>
              <p className="text-sm font-semibold text-slate-900">
                {formatPrice(order.totalAmount)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Ekspedition
          </h2>
          <p className="mb-4 text-xs text-slate-500">
            Gælder uanset betalingsmetode og betalingsstatus — en betalt
            kort-ordre skal ekspederes på lige fod med en fakturaordre.
          </p>

          <span
            className={`mb-3 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              FULFILLMENT_STATUS_BADGE_CLASSES[order.fulfillmentStatus] ??
              "bg-slate-100 text-slate-500"
            }`}
          >
            {FULFILLMENT_STATUS_LABELS[order.fulfillmentStatus] ??
              order.fulfillmentStatus}
          </span>

          <form id={fulfillmentFormId} action={updateOrderFulfillmentStatusAction}>
            <input type="hidden" name="orderId" value={order.id} />
          </form>
          <div className="flex items-center gap-2">
            <select
              form={fulfillmentFormId}
              name="fulfillmentStatus"
              defaultValue={order.fulfillmentStatus}
              className={inputClass}
            >
              {FULFILLMENT_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {FULFILLMENT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <SaveButton
              formId={fulfillmentFormId}
              action={updateOrderFulfillmentStatusAction}
            />
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
              <th className={cellClass}>Normalpris</th>
              <th className={cellClass}>Rabat</th>
              <th className={cellClass}>Pris pr. stk</th>
              <th className={cellClass}>Linjesum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {order.items.map((item, index) => {
              const lineRabat =
                item.basePrice != null && item.unitPrice != null
                  ? (item.basePrice - item.unitPrice) * item.quantity
                  : null;
              return (
                <tr key={index}>
                  <td className={`${cellClass} font-medium text-slate-900`}>
                    {item.name}
                  </td>
                  <td className={`${cellClass} text-slate-500`}>{item.sku}</td>
                  <td className={cellClass}>{item.quantity}</td>
                  <td className={`${cellClass} text-slate-500`}>
                    {formatPrice(item.basePrice)}
                  </td>
                  <td className={cellClass}>
                    {lineRabat == null || lineRabat === 0 ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <span className="text-emerald-700">
                        -{formatPrice(lineRabat)}
                      </span>
                    )}
                  </td>
                  <td className={cellClass}>{formatPrice(item.unitPrice)}</td>
                  <td className={cellClass}>
                    {item.unitPrice != null
                      ? formatPrice(item.unitPrice * item.quantity)
                      : "Pris oplyses snarest"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
