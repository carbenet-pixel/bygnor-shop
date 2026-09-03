import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductAdmin, STOCK_STATUS_OPTIONS } from "@/lib/products-admin";
import { listProductGroupsAdmin } from "@/lib/product-groups";
import { listVendors } from "@/lib/vendors";
import { SaveButton } from "@/app/admin/save-button";
import { updateProductAction } from "../actions";
import { ProductImageUploadForm } from "./product-image-upload-form";

export const dynamic = "force-dynamic";

const labelClass = "mb-1 block text-sm font-medium text-slate-700";
const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#185FA5] focus:ring-2 focus:ring-[#185FA5]/20";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [product, productGroups, vendors] = await Promise.all([
    getProductAdmin(id),
    listProductGroupsAdmin(),
    listVendors(),
  ]);

  if (!product) {
    notFound();
  }

  const formId = `product-detail-${product.id}`;
  const categoryNames = [...new Set(productGroups.map((g) => g.categoryName))];

  return (
    <div>
      <Link
        href="/admin/products"
        className="mb-4 inline-block text-xs text-slate-400 hover:text-[#185FA5]"
      >
        ← Tilbage til produkter
      </Link>

      <h1 className="mb-1 text-xl font-semibold text-slate-900">
        {product.name}
      </h1>
      <p className="mb-6 text-sm text-slate-500">Varenr. {product.sku}</p>

      <div className="mb-6 max-w-xl">
        <ProductImageUploadForm
          productId={product.id}
          sku={product.sku}
          imageUrl={product.imageUrl}
        />
      </div>

      <form id={formId} action={updateProductAction}>
        <input type="hidden" name="productId" value={product.id} />
      </form>

      <div className="max-w-xl space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label htmlFor="name" className={labelClass}>
            Navn
          </label>
          <input
            form={formId}
            id="name"
            name="name"
            required
            defaultValue={product.name}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="description" className={labelClass}>
            Beskrivelse (valgfri)
          </label>
          <textarea
            form={formId}
            id="description"
            name="description"
            rows={3}
            defaultValue={product.description ?? ""}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="productGroupId" className={labelClass}>
            Produktgruppe
          </label>
          <select
            form={formId}
            id="productGroupId"
            name="productGroupId"
            required
            defaultValue={product.productGroupId}
            className={inputClass}
          >
            {categoryNames.map((categoryName) => (
              <optgroup key={categoryName} label={categoryName}>
                {productGroups
                  .filter((g) => g.categoryName === categoryName)
                  .map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="vendorId" className={labelClass}>
            Leverandør
          </label>
          <select
            form={formId}
            id="vendorId"
            name="vendorId"
            required
            defaultValue={product.vendorId}
            className={inputClass}
          >
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="basePrice" className={labelClass}>
              Pris (valgfri)
            </label>
            <input
              form={formId}
              id="basePrice"
              name="basePrice"
              type="number"
              min="0"
              step="0.01"
              defaultValue={product.basePrice ?? ""}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="vatRate" className={labelClass}>
              Momssats (%)
            </label>
            <input
              form={formId}
              id="vatRate"
              name="vatRate"
              type="number"
              min="0"
              step="0.01"
              defaultValue={product.vatRate}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="stockStatus" className={labelClass}>
              Lagerstatus
            </label>
            <select
              form={formId}
              id="stockStatus"
              name="stockStatus"
              defaultValue={product.stockStatus}
              className={inputClass}
            >
              {STOCK_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="leadTimeDays" className={labelClass}>
              Leveringstid (dage, valgfri)
            </label>
            <input
              form={formId}
              id="leadTimeDays"
              name="leadTimeDays"
              type="number"
              min="0"
              step="1"
              defaultValue={product.leadTimeDays ?? ""}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="catalogPage" className={labelClass}>
            Katalogside (valgfri)
          </label>
          <input
            form={formId}
            id="catalogPage"
            name="catalogPage"
            type="number"
            min="0"
            step="1"
            defaultValue={product.catalogPage ?? ""}
            className={inputClass}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            form={formId}
            id="active"
            name="active"
            type="checkbox"
            defaultChecked={product.active}
            className="h-4 w-4"
          />
          <label htmlFor="active" className="text-sm font-medium text-slate-700">
            Aktiv
          </label>
        </div>

        <SaveButton
          formId={formId}
          action={updateProductAction}
          label="Gem ændringer"
          buttonClassName="rounded-md bg-[#5A9D3C] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d8632] disabled:opacity-60"
        />
      </div>
    </div>
  );
}
