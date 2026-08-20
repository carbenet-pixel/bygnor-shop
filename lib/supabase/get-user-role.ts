import "server-only";
import { createClient } from "@supabase/supabase-js";

export type UserRole = "superadmin" | "admin" | "kunde";

/**
 * Looks up a user's role with the service-role key, bypassing RLS. Only ever
 * call this with an already-authenticated user id (e.g. from
 * `supabase.auth.getUser()`) — this function does not verify identity itself.
 */
export async function getUserRole(userId: string): Promise<UserRole | null> {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY?.startsWith("sb_publishable_")) {
    console.error(
      "[getUserRole] SUPABASE_SERVICE_ROLE_KEY holds a publishable key, not a secret key — role lookups will be blocked by RLS. Fix the env var in Vercel and redeploy.",
    );
    return null;
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

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
