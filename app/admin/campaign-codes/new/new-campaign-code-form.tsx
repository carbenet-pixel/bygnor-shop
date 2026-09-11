"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCampaignCodeAction, type CampaignCodeFormState } from "../actions";
import type { Vendor } from "@/lib/vendors";
import { DISCOUNT_TYPE_OPTIONS } from "@/lib/campaign-code-constants";

const initialState: CampaignCodeFormState = { error: null, success: false };

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#185FA5] focus:ring-2 focus:ring-[#185FA5]/20";
const labelClass = "mb-1 block text-sm font-medium text-slate-700";

export function NewCampaignCodeForm({ vendors }: { vendors: Vendor[] }) {
  const [state, formAction, isPending] = useActionState(
    createCampaignCodeAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="max-w-xl space-y-6">
      {state.success && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          Kampagnekoden er oprettet.
        </div>
      )}
      {state.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label htmlFor="code" className={labelClass}>
            Kode
          </label>
          <input
            id="code"
            name="code"
            required
            placeholder="fx SOMMER2026"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="vendorId" className={labelClass}>
            Leverandør (valgfri — tom betyder alle)
          </label>
          <select id="vendorId" name="vendorId" defaultValue="" className={inputClass}>
            <option value="">Alle leverandører</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="discountType" className={labelClass}>
              Rabattype
            </label>
            <select
              id="discountType"
              name="discountType"
              defaultValue="percent"
              className={inputClass}
            >
              {DISCOUNT_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {type === "percent" ? "Procent" : "Fast beløb (kr)"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="discountValue" className={labelClass}>
              Rabatværdi
            </label>
            <input
              id="discountValue"
              name="discountValue"
              type="number"
              min="0"
              step="0.01"
              required
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className={labelClass}>
              Startdato
            </label>
            <input
              id="startDate"
              name="startDate"
              type="datetime-local"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="endDate" className={labelClass}>
              Slutdato
            </label>
            <input
              id="endDate"
              name="endDate"
              type="datetime-local"
              required
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="isActive"
            name="isActive"
            type="checkbox"
            defaultChecked
            className="h-4 w-4"
          />
          <label htmlFor="isActive" className="text-sm font-medium text-slate-700">
            Aktiv
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-[#5A9D3C] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d8632] disabled:opacity-60"
      >
        Opret kampagnekode
      </button>
    </form>
  );
}
