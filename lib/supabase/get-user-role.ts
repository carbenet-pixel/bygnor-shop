import type { SupabaseClient } from "@supabase/supabase-js";

export type UserRole = "superadmin" | "admin" | "kunde";

export async function getUserRole(
  supabase: SupabaseClient,
): Promise<UserRole | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data.role as UserRole;
}
