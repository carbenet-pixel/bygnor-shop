import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client authenticated with the service-role key, which
 * bypasses RLS. Only call this from trusted, server-only code that has
 * already established which user/action it's acting on behalf of.
 */
export function createAdminClient(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  }

  if (key.startsWith("sb_publishable_")) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY holds a publishable key, not a secret key — this would silently fail RLS-protected queries.",
    );
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
