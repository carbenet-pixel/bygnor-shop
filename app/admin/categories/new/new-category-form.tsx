"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createCategoryAction, type CategoryFormState } from "../actions";
import { slugify } from "@/lib/format";

const initialState: CategoryFormState = { error: null, success: false };

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#185FA5] focus:ring-2 focus:ring-[#185FA5]/20";
const labelClass = "mb-1 block text-sm font-medium text-slate-700";

export function NewCategoryForm() {
  const [state, formAction, isPending] = useActionState(
    createCategoryAction,
    initialState,
  );
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) {
      setName("");
      setSlug("");
      setSlugTouched(false);
    }
  }

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="max-w-md space-y-4">
      {state.success && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          Kategorien er oprettet.
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
        <input
          id="name"
          name="name"
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="slug" className={labelClass}>
          Slug
        </label>
        <input
          id="slug"
          name="slug"
          required
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="imageUrl" className={labelClass}>
          Billede-URL (valgfri)
        </label>
        <input
          id="imageUrl"
          name="imageUrl"
          placeholder="https://…"
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-[#5A9D3C] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d8632] disabled:opacity-60"
      >
        Opret kategori
      </button>
    </form>
  );
}
