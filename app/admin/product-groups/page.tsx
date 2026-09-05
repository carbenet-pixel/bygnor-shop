import Link from "next/link";
import { listProductGroupsAdmin } from "@/lib/product-groups";
import { listCategoriesAdmin } from "@/lib/categories";
import { SaveButton } from "@/components/save-button";
import { updateProductGroupAction } from "./actions";

export const dynamic = "force-dynamic";

const cellClass = "px-4 py-3 align-middle";
const inputClass =
  "rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900 outline-none focus:border-[#185FA5] focus:ring-2 focus:ring-[#185FA5]/20";

export default async function ProductGroupsPage() {
  const [groups, categories] = await Promise.all([
    listProductGroupsAdmin(),
    listCategoriesAdmin(),
  ]);

  const groupsByCategory = new Map<string, typeof groups>();
  for (const group of groups) {
    const list = groupsByCategory.get(group.categoryId) ?? [];
    list.push(group);
    groupsByCategory.set(group.categoryId, list);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-xl font-semibold text-slate-900">
            Produktgrupper
          </h1>
          <p className="text-sm text-slate-500">Kun synlig for superadmin.</p>
        </div>
        <Link
          href="/admin/product-groups/new"
          className="rounded-md bg-[#5A9D3C] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d8632]"
        >
          Opret produktgruppe
        </Link>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-slate-500">Ingen produktgrupper endnu.</p>
      ) : (
        categories.map((category) => {
          const groupsInCategory = groupsByCategory.get(category.id) ?? [];
          if (groupsInCategory.length === 0) return null;

          return (
            <section key={category.id} className="mb-8">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">
                {category.name}
              </h2>
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                    <tr>
                      <th className={cellClass}>Navn</th>
                      <th className={cellClass}>Kategori</th>
                      <th className={cellClass}>Produkter</th>
                      <th className={cellClass}></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {groupsInCategory.map((group) => {
                      const formId = `group-${group.id}`;
                      return (
                        <tr key={group.id}>
                          <td className={cellClass}>
                            <form id={formId} action={updateProductGroupAction}>
                              <input
                                type="hidden"
                                name="groupId"
                                value={group.id}
                              />
                            </form>
                            <input
                              form={formId}
                              name="name"
                              defaultValue={group.name}
                              className={`${inputClass} w-64`}
                            />
                          </td>
                          <td className={cellClass}>
                            <select
                              form={formId}
                              name="categoryId"
                              defaultValue={group.categoryId}
                              className={inputClass}
                            >
                              {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className={`${cellClass} text-slate-500`}>
                            {group.productCount}
                          </td>
                          <td className={cellClass}>
                            <SaveButton
                              formId={formId}
                              action={updateProductGroupAction}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
