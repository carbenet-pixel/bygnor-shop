"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ResetPasswordState = {
  error: string | null;
  needsMfa: boolean;
};

export async function resetPassword(
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const code = formData.get("code") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  const totpCode = ((formData.get("totpCode") as string) ?? "").trim();

  if (password !== confirmPassword) {
    return { error: "Kodeordene stemmer ikke overens", needsMfa: false };
  }

  const supabase = await createClient();

  // Sørg for at en session findes. ?code= er engangsbrug (PKCE) — hvis et
  // tidligere skridt i SAMME flow (fx et forudgående 2FA-forsøg på denne
  // side) allerede har vekslet den, er koden brugt op og skal ikke veksles
  // igen. Tjek derfor altid for en eksisterende session først.
  const {
    data: { user: existingUser },
  } = await supabase.auth.getUser();

  if (!existingUser) {
    if (!code) {
      return { error: "Linket er ugyldigt eller udløbet — anmod om et nyt", needsMfa: false };
    }

    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    // DEBUG — remove once the reset-password/AAL2 flow is confirmed working.
    console.log(
      `[resetPassword] exchangeCodeForSession error=${exchangeError ? JSON.stringify({ message: exchangeError.message, code: exchangeError.code, status: exchangeError.status }) : "null"}`,
    );

    if (exchangeError) {
      return { error: "Linket er ugyldigt eller udløbet — anmod om et nyt", needsMfa: false };
    }
  }

  // Et 2FA-forsøg blev sendt med — verificér det og løft sessionen til AAL2
  // FØR vi forsøger at skifte kodeordet.
  if (totpCode) {
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const factor = factorsData?.totp[0];

    if (!factor) {
      return {
        error: "Kunne ikke finde en 2FA-metode på kontoen — kontakt en administrator",
        needsMfa: false,
      };
    }

    const { error: mfaError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: factor.id,
      code: totpCode,
    });

    // DEBUG — remove once the reset-password/AAL2 flow is confirmed working.
    console.log(
      `[resetPassword] mfa.challengeAndVerify error=${mfaError ? JSON.stringify({ message: mfaError.message, code: mfaError.code, status: mfaError.status }) : "null"}`,
    );

    if (mfaError) {
      return { error: "Forkert kode — prøv igen", needsMfa: true };
    }
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password,
  });

  // DEBUG — remove once the reset-password/AAL2 flow is confirmed working.
  console.log(
    `[resetPassword] updateUser error=${updateError ? JSON.stringify({ name: updateError.name, message: updateError.message, code: updateError.code, status: updateError.status }) : "null"}`,
  );

  if (updateError) {
    if (updateError.code === "weak_password") {
      // Supabase's egen besked afspejler dynamisk det faktiske krav (længde
      // og/eller kompleksitet), så vi undgår at hardkode eller gætte det.
      return {
        error: `Kodeordet opfylder ikke kravene: ${updateError.message}`,
        needsMfa: false,
      };
    }
    if (updateError.code === "insufficient_aal") {
      // Kontoen har to-faktor login aktiveret — bed om koden i stedet for at
      // afvise. Kodeordet er allerede indtastet og bevares af formularen.
      return { error: null, needsMfa: true };
    }
    return { error: "Kunne ikke opdatere kodeordet — prøv igen", needsMfa: false };
  }

  redirect("/login?reset=success");
}
