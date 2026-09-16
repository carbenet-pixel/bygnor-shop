"use server";

import { revalidatePath } from "next/cache";
import { resetUserMfa } from "@/lib/mfa-admin";

export async function resetUserMfaAction(formData: FormData) {
  const userId = ((formData.get("userId") as string) ?? "").trim();

  if (!userId) return;

  await resetUserMfa(userId);
  revalidatePath("/admin/users");
}
