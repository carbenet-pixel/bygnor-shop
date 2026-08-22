"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ResetPasswordForm } from "./reset-password-form";

type Status = "checking" | "ready" | "invalid";

/**
 * Invite-links (fra inviteUserByEmail) understøtter ikke PKCE og ankommer
 * derfor med tokens i URL'ens hash-fragment (#access_token=...&type=invite)
 * i stedet for en ?code=-query-parameter. Hash-fragmenter sendes aldrig til
 * serveren, så dette kan kun afgøres client-side.
 *
 * createClient() har detectSessionInUrl slået til som standard (kun i
 * browseren) — den fanger og udveksler hash-tokens automatisk ved
 * initialisering, og skriver sessionen til cookies. Vi venter blot på
 * resultatet.
 */
export function HashSessionGate() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) {
        setStatus(session ? "ready" : "invalid");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session && !cancelled) {
        setStatus("ready");
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  if (status === "checking") {
    return <p className="text-sm text-slate-500">Bekræfter link…</p>;
  }

  if (status === "invalid") {
    return (
      <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        Linket er ugyldigt eller udløbet. Anmod om et{" "}
        <a href="/login/forgot-password" className="underline">
          nyt reset-link
        </a>
        .
      </div>
    );
  }

  return (
    <>
      <p className="mb-6 text-sm text-slate-500">
        Indtast dit nye kodeord herunder.
      </p>
      <ResetPasswordForm code={null} />
    </>
  );
}
