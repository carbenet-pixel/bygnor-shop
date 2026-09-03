"use client";

import { useActionState } from "react";

type SaveButtonState = { savedAt: number };

const initialState: SaveButtonState = { savedAt: 0 };

/**
 * Drop-in erstatning for en almindelig `<button form={formId} type="submit">`,
 * der viser en kort "Gemt ✓"-bekræftelse efter en vellykket server action.
 * Bruger `formAction` (ikke formularens egen `action`) til at hægte
 * useActionState på — virker derfor uændret sammen med det eksisterende
 * `form={formId}`-mønster, uden at røre selve formularerne eller de
 * underliggende server actions.
 */
export function SaveButton({
  formId,
  action,
  label = "Gem",
  buttonClassName = "rounded-md bg-[#5A9D3C] px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-[#4d8632] disabled:opacity-60",
}: {
  formId: string;
  action: (formData: FormData) => void | Promise<void>;
  label?: string;
  buttonClassName?: string;
}) {
  const [state, dispatch, isPending] = useActionState(
    async (
      _prevState: SaveButtonState,
      formData: FormData,
    ): Promise<SaveButtonState> => {
      await action(formData);
      return { savedAt: Date.now() };
    },
    initialState,
  );

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="submit"
        form={formId}
        formAction={dispatch}
        disabled={isPending}
        className={buttonClassName}
      >
        {label}
      </button>
      {state.savedAt > 0 && (
        <span
          key={state.savedAt}
          className="save-confirmation text-xs font-medium text-green-600"
        >
          Gemt ✓
        </span>
      )}
    </span>
  );
}
