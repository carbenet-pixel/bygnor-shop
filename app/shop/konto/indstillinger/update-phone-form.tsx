"use client";

import { useActionState } from "react";
import { updatePhoneAction, type UpdatePhoneState } from "./actions";

const initialState: UpdatePhoneState = { error: null, success: false };

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#185FA5] focus:ring-2 focus:ring-[#185FA5]/20";
const labelClass = "mb-1 block text-sm font-medium text-slate-700";

export function UpdatePhoneForm({ initialPhone }: { initialPhone: string | null }) {
  const [state, formAction, isPending] = useActionState(updatePhoneAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          Telefonnummer opdateret.
        </div>
      )}

      <div>
        <label htmlFor="phone" className={labelClass}>
          Telefonnummer
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          defaultValue={initialPhone ?? ""}
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-[#5A9D3C] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d8632] disabled:opacity-60"
      >
        Gem telefonnummer
      </button>
    </form>
  );
}
