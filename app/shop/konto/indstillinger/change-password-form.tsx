"use client";

import { useActionState } from "react";
import { changePasswordAction, type ChangePasswordState } from "./actions";

const initialState: ChangePasswordState = { error: null, success: false };

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-foreground outline-none focus:border-bygnor-blue focus:ring-2 focus:ring-bygnor-blue/20";
const labelClass = "mb-1 block text-sm font-medium text-slate-700";

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(
    changePasswordAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          Kodeord opdateret.
        </div>
      )}

      <div>
        <label htmlFor="password" className={labelClass}>
          Nyt kodeord
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className={labelClass}>
          Bekræft nyt kodeord
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-bygnor-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:brightness-90 disabled:opacity-60"
      >
        Skift kodeord
      </button>
    </form>
  );
}
