"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ConfirmSetupState = {
  error: boolean;
};

export async function confirmSetup(
  _prevState: ConfirmSetupState,
  formData: FormData,
): Promise<ConfirmSetupState> {
  const factorId = formData.get("factorId") as string;
  const code = formData.get("code") as string;

  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code,
  });

  if (error) {
    return { error: true };
  }

  redirect("/shop");
}
