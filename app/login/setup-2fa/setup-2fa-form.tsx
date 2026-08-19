"use client";

import { useActionState } from "react";
import { confirmSetup, type ConfirmSetupState } from "./actions";

const initialState: ConfirmSetupState = { error: false };

export function Setup2FAForm({
  factorId,
  qrCodeSrc,
  secret,
}: {
  factorId: string;
  qrCodeSrc: string;
  secret: string;
}) {
  const [state, formAction, isPending] = useActionState(
    confirmSetup,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="factorId" value={factorId} />

      <div className="flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- dynamically generated data URI, not a static asset */}
        <img
          src={qrCodeSrc}
          alt="QR-kode til to-faktor login"
          width={200}
          height={200}
          className="rounded-md border border-slate-200"
        />
      </div>

      <p className="text-center text-xs text-slate-400">
        Kan du ikke scanne koden? Indtast denne nøgle manuelt:{" "}
        <span className="font-mono text-slate-500">{secret}</span>
      </p>

      {state.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Forkert kode — prøv igen
        </div>
      )}

      <div>
        <label
          htmlFor="code"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          6-cifret kode
        </label>
        <input
          id="code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-center text-lg tracking-widest text-slate-900 outline-none focus:border-[#185FA5] focus:ring-2 focus:ring-[#185FA5]/20"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-[#5A9D3C] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d8632] focus:outline-none focus:ring-2 focus:ring-[#5A9D3C]/40 disabled:opacity-60"
      >
        Bekræft og fortsæt
      </button>
    </form>
  );
}
