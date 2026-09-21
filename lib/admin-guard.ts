import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getUserRole, type UserRole } from "@/lib/supabase/get-user-role";

/**
 * Sikkerhedsaudit-fund #2/#4: admin Server Actions tjekkede hverken rolle,
 * AAL2 eller mål-kontoens type i selve handlingen — kun proxy.ts's sti-
 * baserede gate beskyttede dem, og den kender intet til hvem/hvad et
 * indsendt id peger på. requireRole()/requireTargetRole() er den fælles,
 * betroede erstatning — kaldes FØRST i enhver admin Server Action, aldrig
 * kun stolet på via URL'en.
 */
export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

type AdminRole = "admin" | "superadmin";

const ROLE_RANK: Record<AdminRole, number> = {
  admin: 1,
  superadmin: 2,
};

export type RequireRoleResult = { userId: string; role: AdminRole };

/**
 * Tjekker, i rækkefølge: logget ind → rolle mindst minRole (superadmin
 * opfylder også et 'admin'-krav) → AAL2 (bekræftet 2FA). Kaster
 * AuthorizationError ved første fejlende tjek — se lib/admin-guard.ts'
 * header-kommentar for hvorfor et kast, ikke en redirect, er den fælles
 * mekanisme her (fire forskellige fejlårsager passer dårligt til ét
 * redirect-mål, og handlingerne har to forskellige retur-mønstre i forvejen).
 */
export async function requireRole(minRole: AdminRole): Promise<RequireRoleResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AuthorizationError("Ikke logget ind.");
  }

  const role = await getUserRole(user.id);
  if (role !== "admin" && role !== "superadmin") {
    throw new AuthorizationError("Din konto har ikke adgang til denne handling.");
  }

  if (ROLE_RANK[role] < ROLE_RANK[minRole]) {
    throw new AuthorizationError("Din konto har ikke adgang til denne handling.");
  }

  // getAuthenticatorAssuranceLevel() læser det aktuelle sessions-JWT — ikke
  // et nyt opslag i databasen. En session der aldrig bestod /login/verify
  // eller /login/setup-2fa (fx ved at navigere direkte til en beskyttet
  // side/handling lige efter password-login) sidder fast på aal1 her.
  const { data: aalData, error: aalError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (aalError || !aalData || aalData.currentLevel !== "aal2") {
    throw new AuthorizationError("Bekræft to-faktor-login for at fortsætte.");
  }

  return { userId: user.id, role };
}

/**
 * Tjekker at et INDSENDT mål-id (fx et formularfelt som "customerId") rent
 * faktisk peger på en konto af en tilladt type — kalderens egen rolle er
 * allerede afklaret af requireRole() på dette tidspunkt, dette er alene et
 * IDOR-tjek på hvad handlingen forsøges rettet MOD. Selv-targeting (kan en
 * admin ramme sin egen konto med denne handling) er bevidst IKKE en del af
 * denne funktion — det er handlingsspecifikt, ikke en generel rolle-regel,
 * og tjekkes derfor direkte i de få actions hvor det er relevant.
 */
export async function requireTargetRole(
  targetUserId: string,
  allowedRoles: readonly UserRole[],
): Promise<void> {
  if (!targetUserId) {
    throw new AuthorizationError("Mangler mål for handlingen.");
  }

  const targetRole = await getUserRole(targetUserId);

  if (!targetRole || !allowedRoles.includes(targetRole)) {
    throw new AuthorizationError("Denne handling kan ikke udføres på den valgte konto.");
  }
}
