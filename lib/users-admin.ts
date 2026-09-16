import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminUserRole = "admin" | "superadmin";

export type AdminUserListItem = {
  id: string;
  fullName: string | null;
  email: string | null;
  role: AdminUserRole;
  createdAt: string;
};

/**
 * Interne brugere (admin/superadmin) — adskilt fra lib/customers.ts's
 * listCustomers(), som kun viser role='kunde'. Samme henteprincip
 * (profiles + auth.admin.listUsers() til email), se listCustomers().
 */
export async function listAdminUsers(): Promise<AdminUserListItem[]> {
  const supabaseAdmin = createAdminClient();

  const [{ data: profiles, error }, usersResult] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id, full_name, role, created_at")
      .in("role", ["admin", "superadmin"])
      .order("created_at", { ascending: true }),
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  if (error || !profiles) {
    console.error("[listAdminUsers] profiles fetch failed", error);
    return [];
  }
  if (usersResult.error) {
    console.error("[listAdminUsers] listUsers failed", usersResult.error);
  }

  const emailById = new Map(
    (usersResult.data?.users ?? []).map((u) => [u.id, u.email ?? null]),
  );

  return profiles.map((p) => ({
    id: p.id as string,
    fullName: p.full_name as string | null,
    email: emailById.get(p.id as string) ?? null,
    role: p.role as AdminUserRole,
    createdAt: p.created_at as string,
  }));
}
