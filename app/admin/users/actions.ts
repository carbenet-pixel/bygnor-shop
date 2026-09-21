"use server";

import { revalidatePath } from "next/cache";
import { AuthorizationError, requireRole, requireTargetRole } from "@/lib/admin-guard";
import { resetUserMfa } from "@/lib/mfa-admin";

export async function resetUserMfaAction(formData: FormData) {
  const { userId: callerId } = await requireRole("superadmin");

  const userId = ((formData.get("userId") as string) ?? "").trim();

  if (!userId) return;

  // En superadmin må gerne nulstille en ANDEN superadmins MFA (bekræftet
  // forretningsregel), men ikke sin egen ad denne vej — self-targeting
  // bruger Admin API'et til at slette faktoren uden at kræve en gyldig
  // kode først, i modsætning til den almindelige unenroll-flow.
  if (userId === callerId) {
    throw new AuthorizationError("Brug din egen kontos 2FA-indstillinger for at nulstille din egen.");
  }

  await requireTargetRole(userId, ["admin", "superadmin"]);

  await resetUserMfa(userId);
  revalidatePath("/admin/users");
}
