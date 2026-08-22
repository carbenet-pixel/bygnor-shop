import "server-only";
import { createAdminClient } from "./admin";

export type UserRole = "superadmin" | "admin" | "kunde";

/**
 * Looks up a user's role with the service-role key, bypassing RLS. Only ever
 * call this with an already-authenticated user id (e.g. from
 * `supabase.auth.getUser()`) — this function does not verify identity itself.
 */
export async function getUserRole(userId: string): Promise<UserRole | null> {
  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminClient();
  } catch (err) {
    console.error("[getUserRole]", err);
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.role as UserRole;
}
