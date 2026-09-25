"use client";

import { useActionState } from "react";
import { initiateCardCheckoutAction, type CheckoutState } from "./checkout-actions";

const initialState: CheckoutState = { error: null };

export const CARD_CHECKOUT_FORM_ID = "card-checkout-form";

export function CheckoutButton({ termsAccepted }: { termsAccepted: boolean }) {
  const [state, formAction, isPending] = useActionState(
    initiateCardCheckoutAction,
    initialState,
  );

  return (
    <form
      id={CARD_CHECKOUT_FORM_ID}
      action={formAction}
      className="mt-4 w-full sm:w-auto"
    >
      <input type="hidden" name="termsAccepted" value={termsAccepted ? "on" : ""} />
      {state.error && <p className="mb-2 text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={isPending || !termsAccepted}
        className="w-full rounded-md bg-bygnor-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:brightness-90 disabled:opacity-60 sm:w-auto"
      >
        {isPending ? "Starter betaling…" : "Gå til betaling med kort"}
      </button>
    </form>
  );
}
