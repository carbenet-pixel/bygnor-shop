"use client";

import { useActionState, useEffect, useState } from "react";
import { toDataURL } from "qrcode";
import { confirmSetup, type ConfirmSetupState } from "./actions";

const initialState: ConfirmSetupState = { error: false };

export function Setup2FAForm({
  factorId,
  uri,
  secret,
}: {
  factorId: string;
  uri: string;
  secret: string;
}) {
  const [state, formAction, isPending] = useActionState(
    confirmSetup,
    initialState,
  );
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    toDataURL(uri, { width: 200, margin: 1 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [uri]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="factorId" value={factorId} />

      <div className="flex justify-center">
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- generated client-side data URI, not a static asset
          <img
            src={qrDataUrl}
            alt="QR-kode til to-faktor login"
            width={200}
            height={200}
            className="rounded-md border border-slate-200"
          />
        ) : (
          <div className="flex h-[200px] w-[200px] items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-xs text-slate-400">
            {qrError ? "Kunne ikke generere QR-kode" : "Genererer QR-kode…"}
          </div>
        )}
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
