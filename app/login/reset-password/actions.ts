"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ResetPasswordState = {
  error: string | null;
};

export async function resetPassword(
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const code = formData.get("code") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (password !== confirmPassword) {
    return { error: "Kodeordene stemmer ikke overens" };
  }

  const supabase = await createClient();

  if (code) {
    // Password-reset (PKCE) — veksl koden til en session.
    const { data: exchangeData, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    // DEBUG — remove once the reset-password error is confirmed fixed.
    console.log(
      `[resetPassword] exchangeCodeForSession userId=${exchangeData?.user?.id ?? "null"} error=${exchangeError ? JSON.stringify({ message: exchangeError.message, code: exchangeError.code, status: exchangeError.status }) : "null"}`,
    );

    if (exchangeError) {
      return { error: "Linket er ugyldigt eller udløbet — anmod om et nyt" };
    }
  } else {
    // Invite-link — sessionen er allerede etableret client-side af
    // HashSessionGate (hash-fragment-tokens skrevet til cookies). Bekræft
    // den findes i stedet for at antage det.
    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser();

    // DEBUG — remove once the reset-password error is confirmed fixed.
    console.log(
      `[resetPassword] getUser userId=${user?.id ?? "null"} error=${getUserError ? JSON.stringify({ message: getUserError.message, code: getUserError.code, status: getUserError.status }) : "null"}`,
    );

    if (!user) {
      return { error: "Linket er ugyldigt eller udløbet — anmod om et nyt" };
    }
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password,
  });

  // DEBUG — remove once the reset-password error is confirmed fixed.
  console.log(
    `[resetPassword] updateUser error=${updateError ? JSON.stringify({ name: updateError.name, message: updateError.message, code: updateError.code, status: updateError.status }) : "null"}`,
  );

  if (updateError) {
    if (updateError.code === "weak_password") {
      // Supabase's egen besked afspejler dynamisk det faktiske krav (længde
      // og/eller kompleksitet), så vi undgår at hardkode eller gætte det.
      return { error: `Kodeordet opfylder ikke kravene: ${updateError.message}` };
    }
    return { error: "Kunne ikke opdatere kodeordet — prøv igen" };
  }

  redirect("/login?reset=success");
}
