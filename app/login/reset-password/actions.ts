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
    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      return { error: "Linket er ugyldigt eller udløbet — anmod om et nyt" };
    }
  } else {
    // Invite-link — sessionen er allerede etableret client-side af
    // HashSessionGate (hash-fragment-tokens skrevet til cookies). Bekræft
    // den findes i stedet for at antage det.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Linket er ugyldigt eller udløbet — anmod om et nyt" };
    }
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password,
  });

  if (updateError) {
    return { error: "Kunne ikke opdatere kodeordet — prøv igen" };
  }

  redirect("/login?reset=success");
}
