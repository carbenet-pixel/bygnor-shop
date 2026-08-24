import { getDiscountGroups } from "@/lib/discount-groups";
import { updateDiscountGroupAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function DiscountGroupsPage() {
  const groups = await getDiscountGroups();

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">
        Rabatgrupper
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        Kun synlig for superadmin. Ændringer gælder med det samme for alle
        kunder i den pågældende gruppe.
      </p>

      <div className="max-w-md space-y-3">
        {groups.map((group) => {
          const formId = `group-${group.id}`;
          return (
            <div
              key={group.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {group.name}
                </p>
                <p className="text-xs text-slate-400">{group.id}</p>
              </div>

              <form
                id={formId}
                action={updateDiscountGroupAction}
                className="flex items-center gap-2"
              >
                <input type="hidden" name="id" value={group.id} />
                <input
                  name="discountPercent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  defaultValue={group.discountPercent}
                  className="w-20 rounded-md border border-slate-300 px-2 py-1 text-right text-sm text-slate-900 outline-none focus:border-[#185FA5] focus:ring-2 focus:ring-[#185FA5]/20"
                />
                <span className="text-sm text-slate-500">%</span>
                <button
                  type="submit"
                  className="rounded-md bg-[#5A9D3C] px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-[#4d8632]"
                >
                  Gem
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
