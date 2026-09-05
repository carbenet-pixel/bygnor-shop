"use client";

import { useActionState } from "react";
import { initiateInvoiceCheckoutAction, type CheckoutState } from "./checkout-actions";

const initialState: CheckoutState = { error: null };

export function InvoiceCheckoutButton() {
  const [state, formAction, isPending] = useActionState(
    initiateInvoiceCheckoutAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-2 w-full sm:w-auto">
      {state.error && <p className="mb-2 text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 sm:w-auto"
      >
        {isPending ? "Opretter ordre…" : "Bestil på faktura"}
      </button>
    </form>
  );
}
