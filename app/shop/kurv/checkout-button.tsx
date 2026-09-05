"use client";

import { useActionState } from "react";
import { initiateCardCheckoutAction, type CheckoutState } from "./checkout-actions";

const initialState: CheckoutState = { error: null };

export function CheckoutButton() {
  const [state, formAction, isPending] = useActionState(
    initiateCardCheckoutAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-4 w-full sm:w-auto">
      {state.error && <p className="mb-2 text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-[#5A9D3C] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d8632] disabled:opacity-60 sm:w-auto"
      >
        {isPending ? "Starter betaling…" : "Gå til betaling med kort"}
      </button>
    </form>
  );
}
