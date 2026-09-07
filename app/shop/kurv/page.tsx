import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCart } from "@/lib/cart";
import { isInvoiceApproved } from "@/lib/checkout";
import { getCustomerDiscount } from "@/lib/discount-groups";
import { listAddresses } from "@/lib/delivery-addresses";
import { formatPrice, roundCurrency } from "@/lib/format";
import { ProductImage } from "../product-image";
import { SaveButton } from "@/components/save-button";
import { updateCartItemAction, removeCartItemAction } from "./actions";
import { CheckoutButton, CARD_CHECKOUT_FORM_ID } from "./checkout-button";
import { InvoiceCheckoutButton, INVOICE_CHECKOUT_FORM_ID } from "./invoice-checkout-button";
import { DeliveryAddressFields } from "./delivery-address-fields";

export const dynamic = "force-dynamic";

const cellClass = "px-4 py-3 align-middle";

export default async function CartPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [cart, invoiceApproved, discount, addresses] = await Promise.all([
    getCart(),
    isInvoiceApproved(),
    getCustomerDiscount(),
    user ? listAddresses(user.id) : Promise.resolve([]),
  ]);

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="mb-2 text-xl font-semibold text-slate-900">
          Kurven er tom
        </h1>
        <p className="mb-6 text-sm text-slate-500">
          Find noget godt i kataloget og læg det i kurven.
        </p>
        <Link
          href="/shop/katalog"
          className="inline-block rounded-md bg-[#185FA5] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#144e88]"
        >
          Gå til kataloget
        </Link>
      </div>
    );
  }

  const defaultAddress = addresses[0]
    ? {
        contactName: addresses[0].contactName,
        streetAddress: addresses[0].streetAddress,
        label: addresses[0].label,
        postalCode: addresses[0].postalCode,
        city: addresses[0].city,
        country: addresses[0].country,
      }
    : null;

  const itemsWithoutPrice = cart.items.filter((item) => item.basePrice == null);
  const pricedItems = cart.items.filter((item) => item.basePrice != null);

  const normalTotal = pricedItems.reduce(
    (sum, item) => sum + item.basePrice! * item.quantity,
    0,
  );
  const discountedTotal = pricedItems.reduce((sum, item) => {
    const discountedUnit = roundCurrency(item.basePrice! * (1 - discount.percent / 100));
    return sum + discountedUnit * item.quantity;
  }, 0);
  const discountTotal = roundCurrency(normalTotal - discountedTotal);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Kurv</h1>
      <p className="mb-6 text-sm text-slate-500">
        {cart.items.length} {cart.items.length === 1 ? "vare" : "varer"} i
        kurven
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
            <tr>
              <th className={cellClass}>Billede</th>
              <th className={cellClass}>Vare</th>
              <th className={cellClass}>Antal</th>
              <th className={cellClass}>Normalpris</th>
              <th className={cellClass}>Rabat</th>
              <th className={cellClass}>Subtotal</th>
              <th className={cellClass}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cart.items.map((item) => {
              const formId = `cart-item-${item.id}`;
              const discountedUnit =
                item.basePrice != null
                  ? roundCurrency(item.basePrice * (1 - discount.percent / 100))
                  : null;
              const lineRabat =
                item.basePrice != null && discountedUnit != null
                  ? roundCurrency((item.basePrice - discountedUnit) * item.quantity)
                  : null;
              const subtotal = discountedUnit != null ? discountedUnit * item.quantity : null;

              return (
                <tr key={item.id}>
                  <td className={cellClass}>
                    <ProductImage
                      imageUrl={item.imageUrl}
                      alt={item.name}
                      className="h-14 w-14 rounded-md"
                      sizes="56px"
                    />
                  </td>
                  <td className={cellClass}>
                    <Link
                      href={`/shop/katalog/${item.productId}`}
                      className="font-medium text-slate-900 hover:text-[#185FA5] hover:underline"
                    >
                      {item.name}
                    </Link>
                    <p className="text-xs text-slate-400">{item.sku}</p>
                  </td>
                  <td className={cellClass}>
                    <form id={formId} action={updateCartItemAction}>
                      <input type="hidden" name="cartItemId" value={item.id} />
                    </form>
                    <input
                      form={formId}
                      type="number"
                      name="quantity"
                      min={1}
                      defaultValue={item.quantity}
                      aria-label="Antal"
                      className="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900 outline-none focus:border-[#185FA5] focus:ring-2 focus:ring-[#185FA5]/20"
                    />
                  </td>
                  <td className={cellClass}>
                    {item.basePrice == null ? (
                      <span className="text-slate-400 italic">
                        Pris oplyses snarest
                      </span>
                    ) : (
                      formatPrice(item.basePrice)
                    )}
                  </td>
                  <td className={cellClass}>
                    {lineRabat == null || lineRabat === 0 ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <span className="text-emerald-700">
                        -{formatPrice(lineRabat)}
                        <span className="block text-xs text-slate-400">
                          ({discount.label})
                        </span>
                      </span>
                    )}
                  </td>
                  <td className={`${cellClass} font-medium text-slate-900`}>
                    {subtotal == null ? (
                      <span className="font-normal text-slate-400 italic">—</span>
                    ) : (
                      formatPrice(subtotal)
                    )}
                  </td>
                  <td className={cellClass}>
                    <div className="flex items-center gap-3">
                      <SaveButton
                        formId={formId}
                        action={updateCartItemAction}
                        label="Opdater"
                      />
                      <form action={removeCartItemAction}>
                        <input type="hidden" name="cartItemId" value={item.id} />
                        <button
                          type="submit"
                          className="text-xs font-medium text-red-600 hover:underline"
                        >
                          Fjern
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-col items-end rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {pricedItems.length === 0 ? (
          <p className="text-sm text-slate-500 italic">
            Pris oplyses snarest for alle varer i kurven.
          </p>
        ) : (
          <>
            {itemsWithoutPrice.length > 0 && (
              <p className="mb-1 text-xs text-slate-500">
                Foreløbig sum (ekskl. {itemsWithoutPrice.length}{" "}
                {itemsWithoutPrice.length === 1 ? "vare" : "varer"} uden pris
                endnu):
              </p>
            )}
            <p className="text-sm text-slate-500">
              Normalpris i alt: {formatPrice(normalTotal)}
            </p>
            {discountTotal > 0 && (
              <p className="text-sm text-emerald-700">
                Rabat ({discount.label}): -{formatPrice(discountTotal)}
              </p>
            )}
            <p className="text-lg font-semibold text-slate-900">
              Endelig pris: {formatPrice(discountedTotal)}
            </p>
          </>
        )}

        <div className="mt-4 w-full">
          <DeliveryAddressFields
            defaultAddress={defaultAddress}
            targetFormIds={[CARD_CHECKOUT_FORM_ID, INVOICE_CHECKOUT_FORM_ID]}
          />
        </div>

        <CheckoutButton />
        {invoiceApproved ? (
          <InvoiceCheckoutButton />
        ) : (
          <p className="mt-2 text-xs text-slate-400">
            Din konto er ikke godkendt til fakturabetaling — kontakt Bygnor
            hvis I ønsker det.
          </p>
        )}
      </div>
    </div>
  );
}
