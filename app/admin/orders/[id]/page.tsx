import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getOrderAdmin,
  INVOICE_STATUS_OPTIONS,
  FULFILLMENT_STATUS_OPTIONS,
  FULFILLMENT_STATUS_LABELS,
  FULFILLMENT_STATUS_BADGE_CLASSES,
} from "@/lib/orders-admin";
import { formatPrice, formatDate, formatAddressLines, formatVatBreakdownLines } from "@/lib/format";
import { SaveButton } from "@/components/save-button";
import { updateOrderStatusAction, updateOrderFulfillmentStatusAction } from "../actions";

export const dynamic = "force-dynamic";

const cellClass = "px-3 py-2 align-middle";
const labelClass = "mb-1 block text-sm font-medium text-slate-700";
const inputClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm text-foreground outline-none focus:border-bygnor-blue focus:ring-2 focus:ring-bygnor-blue/20";

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
  // Rabatten er ex-moms — sammenlignes derfor med subtotalAmount (den
  // ex-moms, rabatterede sum), ikke totalAmount (som nu er inkl. moms).
  const discountTotal =
    pricedItems.length > 0 ? normalTotal - (order.subtotalAmount ?? normalTotal) : 0;

  return (
    <div>
      <Link
        href="/admin/orders"
        className="mb-4 inline-block text-xs text-slate-400 hover:text-bygnor-blue"
      >
        ← Tilbage til ordrer
      </Link>

      <h1 className="mb-1 text-xl font-semibold text-foreground">
        {order.orderReference ?? order.id}
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        Oprettet {formatDate(order.createdAt)}
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Kunde</h2>
          <p className="text-sm text-foreground">{order.customerName ?? "Ukendt"}</p>
          {order.cvrNumber && (
            <p className="text-sm text-slate-500">CVR {order.cvrNumber}</p>
          )}
          <p className="text-sm text-slate-500">{order.customerEmail ?? "—"}</p>
          <div className="mt-3">
            <span className={labelClass}>Eksternt kundenummer (KNI/Aarhus-fragt)</span>
            <p className="text-sm text-foreground">{order.externalCustomerNumber ?? ""}</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Leveringsadresse
          </h2>
          {formatAddressLines({
            companyName: order.customerName,
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
      </div>

      {/* Betaling og ekspedition er bevidst to adskilte kort — betalingsstatus
          er ikke et signal om ordren er håndteret. */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Betaling</h2>
          <div className="space-y-4">
            <div>
              <span className={labelClass}>Betalingsmetode</span>
              <p className="text-sm text-foreground">
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
                  <p className="text-sm text-foreground">{order.status}</p>
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
                <p className="text-sm text-foreground">
                  {order.quickpayPaymentId ?? "—"}
                </p>
              </div>
            )}

            <div>
              <span className={labelClass}>Rabat</span>
              <p className="text-sm text-foreground">
                {order.discountLabel ?? `${order.discountPercent}%`}
              </p>
            </div>

            {pricedItems.length > 0 && (
              <div>
                <span className={labelClass}>Normalpris i alt</span>
                <p className="text-sm text-foreground">{formatPrice(normalTotal)}</p>
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

            <div>
              <span className={labelClass}>Moms-detaljer</span>
              {order.vatRate != null ? (
                <>
                  <p className="text-sm text-foreground">
                    {order.vatDestination}
                    {order.vatType ? ` · ${order.vatType}` : ""}
                  </p>
                  {order.vatNote && (
                    <p className="mt-1 text-xs text-slate-400">{order.vatNote}</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-500">
                  Intet momssnapshot — ukendt leveringsland eller ingen aktiv
                  momsregel på ordretidspunktet.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
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
                  <td className={`${cellClass} font-medium text-foreground`}>
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
