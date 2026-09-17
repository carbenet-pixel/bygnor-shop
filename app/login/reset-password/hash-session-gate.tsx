"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ResetPasswordForm } from "./reset-password-form";

type Status = "checking" | "ready" | "invalid";

/**
 * Invite-links (fra inviteUserByEmail) understøtter ikke PKCE og ankommer
 * derfor med tokens i URL'ens hash-fragment (#access_token=...&type=invite)
 * i stedet for en ?code=-query-parameter. Hash-fragmenter sendes aldrig til
 * serveren, så dette kan kun afgøres client-side.
 *
 * createClient() (@supabase/ssr) hardkoder flowType:"pkce", og GoTrue-js's
 * egen automatiske detectSessionInUrl afviser derfor denne slags
 * hash-fragment-links med AuthPKCEGrantCodeExchangeError ("Not a valid PKCE
 * flow url."), FØR den når at læse access_token/refresh_token ud — der
 * bliver aldrig etableret en session, og fejlen "sluges" stille af klienten.
 * Vi parser derfor selv access_token/refresh_token fra hash'en og kalder
 * setSession() direkte, som ikke har dette flowType/URL-formats-tjek.
 */
export function HashSessionGate() {
  const [status, setStatus] = useState<Status>("checking");
  // Hash-fragmentet kan kun konsumeres én gang — vi rydder det med det
  // samme, så et andet kald (fx React Strict Mode's bevidste
  // dobbelt-kørsel af effects i dev) ikke finder tokens der allerede er
  // fjernet fra URL'en og fejlagtigt overskriver en gyldig session med
  // "invalid". Denne ref sikrer at selve konsumeringen kun sker én gang
  // pr. side-indlæsning, uanset hvor mange gange effekten køres.
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    async function establishSessionFromHash() {
      const rawHash = window.location.hash;
      const params = new URLSearchParams(
        rawHash.startsWith("#") ? rawHash.slice(1) : rawHash,
      );
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (rawHash) {
        // Fjern tokens fra adresselinjen/historikken med det samme, uanset
        // om de viser sig gyldige eller ej.
        window.history.replaceState(
          window.history.state,
          "",
          window.location.pathname + window.location.search,
        );
      }

      if (!accessToken || !refreshToken) {
        setStatus("invalid");
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      setStatus(!error && data.session ? "ready" : "invalid");
    }

    establishSessionFromHash();
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
