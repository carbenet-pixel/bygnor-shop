import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Generisk MFA-administration via Admin API — gælder ENHVER profil (kunde,
 * admin, superadmin), ikke kun kunder. Oprindeligt bygget kun til kunder
 * (se /admin/customers/[id]), men flyttet hertil da /admin/users skulle
 * genbruge præcis samme logik for interne brugere — ingen duplikeret
 * implementering af selve nulstillingen.
 */

export async function getUserMfaEnabled(userId: string): Promise<boolean> {
  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin.auth.admin.mfa.listFactors({
    userId,
  });

  if (error) {
    console.error("[getUserMfaEnabled]", error);
    return false;
  }

  return data.factors.some((f) => f.factor_type === "totp");
}

export type ResetUserMfaResult = { success: boolean };

/**
 * En almindelig brugersession kan kun afmelde SIN EGEN MFA-faktor
 * (supabase.auth.mfa.unenroll) — en anden brugers faktorer kan kun
 * fjernes via Admin API'et, som her. deleteFactor() logger selv brugeren
 * ud af alle aktive sessioner, hvis faktoren var verificeret, så
 * ændringen slår igennem med det samme, ikke først ved udløb. Næste
 * login rammer login()'s listFactors()-tjek (app/login/page.tsx), som
 * så sender brugeren gennem /login/setup-2fa igen, præcis som en helt ny
 * bruger.
 */
export async function resetUserMfa(userId: string): Promise<ResetUserMfaResult> {
  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin.auth.admin.mfa.listFactors({
    userId,
  });

  if (error) {
    console.error("[resetUserMfa] listFactors", error);
    return { success: false };
  }

  let allSucceeded = true;
  for (const factor of data.factors) {
    const { error: deleteError } = await supabaseAdmin.auth.admin.mfa.deleteFactor({
      id: factor.id,
      userId,
    });
    if (deleteError) {
      console.error("[resetUserMfa] deleteFactor", deleteError);
      allSucceeded = false;
    }
  }

  return { success: allSucceeded };
}
