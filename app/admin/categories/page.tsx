import Link from "next/link";
import { listCategoriesAdmin } from "@/lib/categories";
import { ProductImage } from "@/app/shop/product-image";
import { SaveButton } from "@/components/save-button";
import { updateCategoryAction } from "./actions";

export const dynamic = "force-dynamic";

const cellClass = "px-4 py-3 align-middle";
const inputClass =
  "rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900 outline-none focus:border-[#185FA5] focus:ring-2 focus:ring-[#185FA5]/20";

export default async function AdminCategoriesPage() {
  const categories = await listCategoriesAdmin();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-xl font-semibold text-slate-900">
            Kategorier
          </h1>
          <p className="text-sm text-slate-500">Kun synlig for superadmin.</p>
        </div>
        <Link
          href="/admin/categories/new"
          className="rounded-md bg-[#5A9D3C] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d8632]"
        >
          Opret kategori
        </Link>
      </div>

      {categories.length === 0 ? (
        <p className="text-sm text-slate-500">Ingen kategorier endnu.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
              <tr>
                <th className={cellClass}>Billede</th>
                <th className={cellClass}>Navn</th>
                <th className={cellClass}>Slug</th>
                <th className={cellClass}>Billede-URL</th>
                <th className={cellClass}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map((category) => {
                const formId = `category-${category.id}`;
                return (
                  <tr key={category.id}>
                    <td className={cellClass}>
                      <ProductImage
                        imageUrl={category.imageUrl}
                        alt={category.name}
                        className="h-12 w-12 rounded-md"
                        sizes="48px"
                      />
                    </td>
                    <td className={cellClass}>
                      <form id={formId} action={updateCategoryAction}>
                        <input
                          type="hidden"
                          name="categoryId"
                          value={category.id}
                        />
                      </form>
                      <input
                        form={formId}
                        name="name"
                        defaultValue={category.name}
                        className={`${inputClass} w-40`}
                      />
                    </td>
                    <td className={cellClass}>
                      <input
                        form={formId}
                        name="slug"
                        defaultValue={category.slug}
                        className={`${inputClass} w-36`}
                      />
                    </td>
                    <td className={cellClass}>
                      <input
                        form={formId}
                        name="imageUrl"
                        placeholder="https://…"
                        defaultValue={category.imageUrl ?? ""}
                        className={`${inputClass} w-56`}
                      />
                    </td>
                    <td className={cellClass}>
                      <SaveButton formId={formId} action={updateCategoryAction} />
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
