"use client";

import { useActionState } from "react";
import { addToCartAction, type AddToCartState } from "./actions";

const initialState: AddToCartState = { error: null, addedAt: 0 };

export function AddToCartForm({ productId }: { productId: string }) {
  const [state, formAction, isPending] = useActionState(
    addToCartAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="productId" value={productId} />
      <input
        type="number"
        name="quantity"
        min={1}
        defaultValue={1}
        aria-label="Antal"
        className="w-16 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-[#185FA5] focus:ring-2 focus:ring-[#185FA5]/20"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-[#5A9D3C] px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#4d8632] disabled:opacity-60"
      >
        Læg i kurv
      </button>
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
      {state.addedAt > 0 && !state.error && (
        <span
          key={state.addedAt}
          className="save-confirmation text-xs font-medium text-green-600"
        >
          Tilføjet ✓
        </span>
      )}
    </form>
  );
}
