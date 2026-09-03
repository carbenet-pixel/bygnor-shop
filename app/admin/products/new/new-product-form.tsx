"use client";

import { useActionState, useEffect, useRef } from "react";
import { createProductAction, type CreateProductState } from "./actions";
import type { ProductGroupAdmin } from "@/lib/product-groups";
import type { Vendor } from "@/lib/vendors";
import { STOCK_STATUS_OPTIONS } from "@/lib/product-constants";

const initialState: CreateProductState = { error: null, success: false, warning: null };

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#185FA5] focus:ring-2 focus:ring-[#185FA5]/20";
const labelClass = "mb-1 block text-sm font-medium text-slate-700";

export function NewProductForm({
  productGroups,
  vendors,
}: {
  productGroups: ProductGroupAdmin[];
  vendors: Vendor[];
}) {
  const [state, formAction, isPending] = useActionState(
    createProductAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state]);

  const categoryNames = [...new Set(productGroups.map((g) => g.categoryName))];

  return (
    <form ref={formRef} action={formAction} className="max-w-xl space-y-6">
      {state.success && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          Produktet er oprettet.
        </div>
      )}

      {state.warning && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
          {state.warning}
        </div>
      )}

      {state.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Grundlæggende</h2>

        <div>
          <label htmlFor="sku" className={labelClass}>
            Varenummer (SKU)
          </label>
          <input id="sku" name="sku" required className={inputClass} />
        </div>

        <div>
          <label htmlFor="name" className={labelClass}>
            Navn
          </label>
          <input id="name" name="name" required className={inputClass} />
        </div>

        <div>
          <label htmlFor="description" className={labelClass}>
            Beskrivelse (valgfri)
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="productGroupId" className={labelClass}>
            Produktgruppe
          </label>
          <select
            id="productGroupId"
            name="productGroupId"
            required
            className={inputClass}
          >
            <option value="">Vælg produktgruppe…</option>
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
          <select id="vendorId" name="vendorId" required className={inputClass}>
            <option value="">Vælg leverandør…</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Pris og lager
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="basePrice" className={labelClass}>
              Pris (valgfri)
            </label>
            <input
              id="basePrice"
              name="basePrice"
              type="number"
              min="0"
              step="0.01"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="vatRate" className={labelClass}>
              Momssats (%)
            </label>
            <input
              id="vatRate"
              name="vatRate"
              type="number"
              min="0"
              step="0.01"
              defaultValue={25}
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
              id="stockStatus"
              name="stockStatus"
              defaultValue="bestillingsvare"
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
              id="leadTimeDays"
              name="leadTimeDays"
              type="number"
              min="0"
              step="1"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="catalogPage" className={labelClass}>
            Katalogside (valgfri)
          </label>
          <input
            id="catalogPage"
            name="catalogPage"
            type="number"
            min="0"
            step="1"
            className={inputClass}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="active"
            name="active"
            type="checkbox"
            defaultChecked
            className="h-4 w-4"
          />
          <label htmlFor="active" className="text-sm font-medium text-slate-700">
            Aktiv
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Billede (valgfri)
        </h2>
        <div>
          <label htmlFor="image" className={labelClass}>
            Konverteres automatisk til webkvalitets-JPG ved upload.
          </label>
          <input
            id="image"
            name="image"
            type="file"
            accept="image/*"
            className={inputClass}
          />
        </div>
      </section>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-[#5A9D3C] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d8632] disabled:opacity-60"
      >
        Opret produkt
      </button>
    </form>
  );
}
