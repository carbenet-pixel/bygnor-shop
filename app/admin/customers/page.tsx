import { listCustomers } from "@/lib/customers";
import { getDiscountGroups } from "@/lib/discount-groups";
import { updateCustomerAction } from "./actions";

export const dynamic = "force-dynamic";

const cellClass = "px-4 py-3 align-middle";
const inputClass =
  "rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900 outline-none focus:border-[#185FA5] focus:ring-2 focus:ring-[#185FA5]/20";

export default async function AdminCustomersPage() {
  const [customers, discountGroups] = await Promise.all([
    listCustomers(),
    getDiscountGroups(),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Kunder</h1>
      <p className="mb-6 text-sm text-slate-500">
        {customers.length} {customers.length === 1 ? "kunde" : "kunder"}
      </p>

      {customers.length === 0 ? (
        <p className="text-sm text-slate-500">Ingen kunder endnu.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
              <tr>
                <th className={cellClass}>Firma</th>
                <th className={cellClass}>Email</th>
                <th className={cellClass}>Betaling</th>
                <th className={cellClass}>Rabatgruppe</th>
                <th className={cellClass}>Individuel rabat</th>
                <th className={cellClass}>Aktiv</th>
                <th className={cellClass}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((customer) => {
                const formId = `customer-${customer.id}`;
                return (
                  <tr key={customer.id}>
                    <td className={`${cellClass} font-medium text-slate-900`}>
                      {customer.companyName ?? "—"}
                    </td>
                    <td className={`${cellClass} text-slate-500`}>
                      {customer.email ?? "—"}
                    </td>
                    <td className={`${cellClass} text-slate-500`}>
                      {customer.paymentMethod ?? "—"}
                    </td>
                    <td className={cellClass}>
                      <form id={formId} action={updateCustomerAction}>
                        <input
                          type="hidden"
                          name="customerId"
                          value={customer.id}
                        />
                      </form>
                      <select
                        form={formId}
                        name="discountGroup"
                        defaultValue={customer.discountGroupId}
                        className={inputClass}
                      >
                        {discountGroups.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={cellClass}>
                      <input
                        form={formId}
                        type="number"
                        name="individualDiscount"
                        min="0"
                        max="100"
                        step="0.01"
                        placeholder="—"
                        defaultValue={customer.individualDiscount ?? ""}
                        className={`${inputClass} w-24`}
                      />
                    </td>
                    <td className={`${cellClass} text-center`}>
                      <input
                        form={formId}
                        type="checkbox"
                        name="isActive"
                        defaultChecked={customer.isActive}
                        className="h-4 w-4"
                      />
                    </td>
                    <td className={cellClass}>
                      <button
                        form={formId}
                        type="submit"
                        className="rounded-md bg-[#5A9D3C] px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-[#4d8632]"
                      >
                        Gem
                      </button>
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
