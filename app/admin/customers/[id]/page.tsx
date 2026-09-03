import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomer } from "@/lib/customers";
import { getDiscountGroups } from "@/lib/discount-groups";
import { listAddresses } from "@/lib/delivery-addresses";
import { updateCustomerAction } from "../actions";
import { PaymentFields } from "../payment-fields";
import { SaveButton } from "@/app/admin/save-button";
import {
  updateAddressAction,
  createAddressAction,
  setDefaultAddressAction,
} from "./actions";

export const dynamic = "force-dynamic";

const labelClass = "mb-1 block text-sm font-medium text-slate-700";
const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#185FA5] focus:ring-2 focus:ring-[#185FA5]/20";
const cellClass = "px-3 py-2 align-middle";
const cellInputClass =
  "w-full min-w-[8rem] rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900 outline-none focus:border-[#185FA5] focus:ring-2 focus:ring-[#185FA5]/20";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [customer, discountGroups, addresses] = await Promise.all([
    getCustomer(id),
    getDiscountGroups(),
    listAddresses(id),
  ]);

  if (!customer) {
    notFound();
  }

  const formId = `customer-detail-${customer.id}`;
  const defaultAddressFormId = `default-address-${customer.id}`;
  const newAddressFormId = `new-address-${customer.id}`;

  return (
    <div>
      <Link
        href="/admin/customers"
        className="mb-4 inline-block text-xs text-slate-400 hover:text-[#185FA5]"
      >
        ← Tilbage til kunder
      </Link>

      <h1 className="mb-1 text-xl font-semibold text-slate-900">
        {customer.companyName ?? "Unavngivet kunde"}
      </h1>
      <p className="mb-6 text-sm text-slate-500">{customer.email ?? "—"}</p>

      <form id={formId} action={updateCustomerAction}>
        <input type="hidden" name="customerId" value={customer.id} />
      </form>

      <div className="max-w-xl space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <span className={labelClass}>Betaling</span>
          <PaymentFields
            formId={formId}
            paymentMethod={customer.paymentMethod}
            creditLimit={customer.creditLimit}
            paymentTermsDays={customer.paymentTermsDays}
          />
        </div>

        <div>
          <label htmlFor="discountGroup" className={labelClass}>
            Rabatgruppe
          </label>
          <select
            form={formId}
            id="discountGroup"
            name="discountGroup"
            defaultValue={customer.discountGroupId}
            className={inputClass}
          >
            {discountGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name} ({group.discountPercent}%)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="individualDiscount" className={labelClass}>
            Individuel rabat (%)
          </label>
          <input
            form={formId}
            id="individualDiscount"
            type="number"
            name="individualDiscount"
            min="0"
            max="100"
            step="0.01"
            placeholder="—"
            defaultValue={customer.individualDiscount ?? ""}
            className={`${inputClass} max-w-32`}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            form={formId}
            id="isActive"
            type="checkbox"
            name="isActive"
            defaultChecked={customer.isActive}
            className="h-4 w-4"
          />
          <label
            htmlFor="isActive"
            className="text-sm font-medium text-slate-700"
          >
            Aktiv
          </label>
        </div>

        <SaveButton
          formId={formId}
          action={updateCustomerAction}
          label="Gem ændringer"
          buttonClassName="rounded-md bg-[#5A9D3C] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d8632] disabled:opacity-60"
        />
      </div>

      <h2 className="mt-10 mb-1 text-lg font-semibold text-slate-900">
        Leveringsadresser
      </h2>
      <p className="mb-4 text-sm text-slate-500">
        Vælg standardadresse med radioknappen, og gem hver ændring for sig.
      </p>

      {/* Delt formular kun for standardvalget — radioknapper med samme
          `name` på tværs af rækker fungerer ikke som én gruppe når de
          peger på forskellige `form`-id'er, så det skal være ét sted. */}
      <form id={defaultAddressFormId} action={setDefaultAddressAction}>
        <input type="hidden" name="customerId" value={customer.id} />
      </form>

      {addresses.length === 0 ? (
        <p className="mb-6 text-sm text-slate-500">
          Ingen leveringsadresser endnu.
        </p>
      ) : (
        <div className="mb-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
              <tr>
                <th className={cellClass}>Standard</th>
                <th className={cellClass}>Label</th>
                <th className={cellClass}>Adresse</th>
                <th className={cellClass}>Postnr</th>
                <th className={cellClass}>By</th>
                <th className={cellClass}>Land</th>
                <th className={cellClass}>Kontakt</th>
                <th className={cellClass}>Telefon</th>
                <th className={cellClass}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {addresses.map((address) => {
                const addrFormId = `address-${address.id}`;
                return (
                  <tr key={address.id}>
                    <td className={`${cellClass} text-center`}>
                      <input
                        form={defaultAddressFormId}
                        type="radio"
                        name="defaultAddressId"
                        value={address.id}
                        defaultChecked={address.isDefault}
                        className="h-4 w-4"
                      />
                    </td>
                    <td className={cellClass}>
                      <form id={addrFormId} action={updateAddressAction}>
                        <input type="hidden" name="addressId" value={address.id} />
                        <input type="hidden" name="customerId" value={customer.id} />
                      </form>
                      <input
                        form={addrFormId}
                        name="label"
                        defaultValue={address.label ?? ""}
                        className={cellInputClass}
                      />
                    </td>
                    <td className={cellClass}>
                      <input
                        form={addrFormId}
                        name="streetAddress"
                        defaultValue={address.streetAddress}
                        required
                        className={cellInputClass}
                      />
                    </td>
                    <td className={cellClass}>
                      <input
                        form={addrFormId}
                        name="postalCode"
                        defaultValue={address.postalCode ?? ""}
                        className={`${cellInputClass} min-w-[5rem]`}
                      />
                    </td>
                    <td className={cellClass}>
                      <input
                        form={addrFormId}
                        name="city"
                        defaultValue={address.city ?? ""}
                        className={cellInputClass}
                      />
                    </td>
                    <td className={cellClass}>
                      <input
                        form={addrFormId}
                        name="country"
                        defaultValue={address.country}
                        required
                        className={cellInputClass}
                      />
                    </td>
                    <td className={cellClass}>
                      <input
                        form={addrFormId}
                        name="contactName"
                        defaultValue={address.contactName ?? ""}
                        className={cellInputClass}
                      />
                    </td>
                    <td className={cellClass}>
                      <input
                        form={addrFormId}
                        name="phone"
                        defaultValue={address.phone ?? ""}
                        className={cellInputClass}
                      />
                    </td>
                    <td className={cellClass}>
                      <SaveButton formId={addrFormId} action={updateAddressAction} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <button
        form={defaultAddressFormId}
        type="submit"
        className="mb-10 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
      >
        Sæt valgt som standard
      </button>

      <div className="max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">
          Tilføj ny adresse
        </h3>
        <form id={newAddressFormId} action={createAddressAction} className="space-y-4">
          <input type="hidden" name="customerId" value={customer.id} />

          <div>
            <label htmlFor="new-streetAddress" className={labelClass}>
              Adresse
            </label>
            <input
              id="new-streetAddress"
              name="streetAddress"
              required
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="new-postalCode" className={labelClass}>
                Postnummer
              </label>
              <input
                id="new-postalCode"
                name="postalCode"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="new-city" className={labelClass}>
                By
              </label>
              <input id="new-city" name="city" required className={inputClass} />
            </div>
          </div>

          <div>
            <label htmlFor="new-country" className={labelClass}>
              Land
            </label>
            <input
              id="new-country"
              name="country"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="new-label" className={labelClass}>
              Label
            </label>
            <input id="new-label" name="label" className={inputClass} />
          </div>

          <div>
            <label htmlFor="new-contactName" className={labelClass}>
              Kontaktperson
            </label>
            <input
              id="new-contactName"
              name="contactName"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="new-phone" className={labelClass}>
              Telefon
            </label>
            <input id="new-phone" name="phone" className={inputClass} />
          </div>

          <button
            type="submit"
            className="rounded-md bg-[#5A9D3C] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d8632]"
          >
            Tilføj adresse
          </button>
        </form>
      </div>
    </div>
  );
}
