"use client";

import { useActionState, useEffect, useRef } from "react";
import { createProductGroupAction, type ProductGroupFormState } from "../actions";
import type { CategoryAdmin } from "@/lib/categories";

const initialState: ProductGroupFormState = { error: null, success: false };

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#185FA5] focus:ring-2 focus:ring-[#185FA5]/20";
const labelClass = "mb-1 block text-sm font-medium text-slate-700";

export function NewProductGroupForm({
  categories,
}: {
  categories: CategoryAdmin[];
}) {
  const [state, formAction, isPending] = useActionState(
    createProductGroupAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="max-w-md space-y-4">
      {state.success && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          Produktgruppen er oprettet.
        </div>
      )}

      {state.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div>
        <label htmlFor="name" className={labelClass}>
          Navn
        </label>
        <input id="name" name="name" required className={inputClass} />
      </div>

      <div>
        <label htmlFor="categoryId" className={labelClass}>
          Kategori
        </label>
        <select id="categoryId" name="categoryId" required className={inputClass}>
          <option value="">Vælg kategori…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-[#5A9D3C] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d8632] disabled:opacity-60"
      >
        Opret produktgruppe
      </button>
    </form>
  );
}
