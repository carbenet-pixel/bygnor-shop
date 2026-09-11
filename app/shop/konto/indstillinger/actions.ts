"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateOwnPhone } from "@/lib/account";

export type ChangePasswordState = { error: string | null; success: boolean };

export type UpdatePhoneState = { error: string | null; success: boolean };

/**
 * Eneste kontaktoplysning kunden selv må redigere — firma/CVR/rabat/
 * betalingsmetode forbliver read-only (admin-redigeret, se
 * app/admin/customers/[id]). Simpel validering: kun ikke-tomt krævet.
 */
export async function updatePhoneAction(
  _prevState: UpdatePhoneState,
  formData: FormData,
): Promise<UpdatePhoneState> {
  const phone = ((formData.get("phone") as string) ?? "").trim();

  if (!phone) {
    return { error: "Telefonnummer må ikke være tomt.", success: false };
  }

  const result = await updateOwnPhone(phone);
  if (!result.success) {
    return { error: result.error ?? "Kunne ikke opdatere telefonnummer.", success: false };
  }

  return { error: null, success: true };
}

/**
 * Ingen bekræftelse af nuværende kodeord — sessionen er allerede
 * autentificeret (og, hvis kunden har 2FA, allerede løftet til AAL2 via
 * login-flowet), så der er intet ekstra at bekræfte. updateUser() kræver
 * selv AAL2 hvis kontoen har MFA (insufficient_aal), håndteret eksplicit
 * herunder — samme mønster som app/login/reset-password/actions.ts.
 */
export async function changePasswordAction(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const password = (formData.get("password") as string) ?? "";
  const confirmPassword = (formData.get("confirmPassword") as string) ?? "";

  if (password !== confirmPassword) {
    return { error: "Kodeordene stemmer ikke overens.", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    if (error.code === "weak_password") {
      // Supabase's egen besked afspejler dynamisk det faktiske krav, så vi
      // undgår at hardkode eller gætte det, jf. reset-password/actions.ts.
      return {
        error: `Kodeordet opfylder ikke kravene: ${error.message}`,
        success: false,
      };
    }
    if (error.code === "insufficient_aal") {
      return {
        error: "Log ud og ind igen (med 2FA-koden) før du kan skifte kodeord.",
        success: false,
      };
    }
    console.error("[changePasswordAction]", error);
    return { error: "Kunne ikke skifte kodeord — prøv igen.", success: false };
  }

  return { error: null, success: true };
}

/**
 * Afmelder kundens EGEN TOTP-faktor og sender dem direkte gennem den
 * eksisterende /login/setup-2fa-flow igen — den enroller altid en ny
 * faktor uforbeholdent ved besøg (se app/login/setup-2fa/page.tsx), så
 * ingen parallel opsætningskode er nødvendig her.
 */
export async function resetOwnMfaAction(): Promise<void> {
  const supabase = await createClient();
  const { data: factorsData } = await supabase.auth.mfa.listFactors();

  for (const factor of factorsData?.totp ?? []) {
    await supabase.auth.mfa.unenroll({ factorId: factor.id });
  }

  redirect("/login/setup-2fa");
}
