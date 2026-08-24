import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type CustomerListItem = {
  id: string;
  email: string | null;
  companyName: string | null;
  paymentMethod: string | null;
  creditLimit: number | null;
  paymentTermsDays: number | null;
  discountGroupId: string;
  discountGroupName: string;
  individualDiscount: number | null;
  isActive: boolean;
};

export async function listCustomers(): Promise<CustomerListItem[]> {
  const supabaseAdmin = createAdminClient();

  const [{ data: profiles, error: profilesError }, { data: groups }, usersResult] =
    await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select(
          "id, company_name, payment_method, credit_limit, payment_terms_days, discount_group, individual_discount, is_active",
        )
        .eq("role", "kunde")
        .order("company_name", { ascending: true }),
      supabaseAdmin.from("discount_groups").select("id, name"),
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
    ]);

  if (profilesError || !profiles) {
    console.error("[listCustomers] profiles fetch failed", profilesError);
    return [];
  }

  if (usersResult.error) {
    console.error("[listCustomers] listUsers failed", usersResult.error);
  }

  const emailById = new Map(
    (usersResult.data?.users ?? []).map((u) => [u.id, u.email ?? null]),
  );
  const groupNameById = new Map(
    (groups ?? []).map((g) => [g.id as string, g.name as string]),
  );

  return profiles.map((p) => ({
    id: p.id as string,
    email: emailById.get(p.id as string) ?? null,
    companyName: p.company_name as string | null,
    paymentMethod: p.payment_method as string | null,
    creditLimit: p.credit_limit as number | null,
    paymentTermsDays: p.payment_terms_days as number | null,
    discountGroupId: p.discount_group as string,
    discountGroupName:
      groupNameById.get(p.discount_group as string) ?? (p.discount_group as string),
    individualDiscount: p.individual_discount as number | null,
    isActive: p.is_active as boolean,
  }));
}

export type CustomerDetail = CustomerListItem;

/**
 * Enkelt kunde til detaljesiden. Bruger admin.getUserById i stedet for
 * listUsers, da vi kun skal bruge én — ingen grund til at hente alle.
 * Returnerer null hvis id'et ikke findes, eller ikke er en kunde (role
 * 'admin'/'superadmin' bruger ikke disse felter og skal ikke kunne
 * redigeres via denne side).
 */
export async function getCustomer(id: string): Promise<CustomerDetail | null> {
  const supabaseAdmin = createAdminClient();

  const [{ data: profile, error: profileError }, { data: groups }, userResult] =
    await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select(
          "id, role, company_name, payment_method, credit_limit, payment_terms_days, discount_group, individual_discount, is_active",
        )
        .eq("id", id)
        .single(),
      supabaseAdmin.from("discount_groups").select("id, name"),
      supabaseAdmin.auth.admin.getUserById(id),
    ]);

  if (profileError || !profile || profile.role !== "kunde") {
    return null;
  }

  const groupNameById = new Map(
    (groups ?? []).map((g) => [g.id as string, g.name as string]),
  );

  return {
    id: profile.id as string,
    email: userResult.data?.user?.email ?? null,
    companyName: profile.company_name as string | null,
    paymentMethod: profile.payment_method as string | null,
    creditLimit: profile.credit_limit as number | null,
    paymentTermsDays: profile.payment_terms_days as number | null,
    discountGroupId: profile.discount_group as string,
    discountGroupName:
      groupNameById.get(profile.discount_group as string) ??
      (profile.discount_group as string),
    individualDiscount: profile.individual_discount as number | null,
    isActive: profile.is_active as boolean,
  };
}

export type UpdateCustomerInput = {
  customerId: string;
  discountGroup: string;
  individualDiscount: number | null;
  isActive: boolean;
  paymentMethod: string;
  creditLimit: number | null;
  paymentTermsDays: number | null;
};

export async function updateCustomer(
  input: UpdateCustomerInput,
): Promise<{ success: boolean }> {
  const supabaseAdmin = createAdminClient();

  const { data: groups } = await supabaseAdmin
    .from("discount_groups")
    .select("id");
  const validGroupIds = new Set((groups ?? []).map((g) => g.id as string));

  const update: Record<string, unknown> = { is_active: input.isActive };

  if (validGroupIds.has(input.discountGroup)) {
    update.discount_group = input.discountGroup;
  }

  if (input.individualDiscount == null) {
    update.individual_discount = null;
  } else if (
    Number.isFinite(input.individualDiscount) &&
    input.individualDiscount >= 0 &&
    input.individualDiscount <= 100
  ) {
    update.individual_discount = input.individualDiscount;
  }

  // Betalingsmetode + kredit-felter valideres som én gruppe: kort nulstiller
  // altid kreditfelterne, kredit kræver begge felter udfyldt gyldigt. Er
  // gruppen ugyldig, springes den helt over — resten af opdateringen
  // (rabat, aktiv-status) gennemføres stadig.
  if (input.paymentMethod === "kort") {
    update.payment_method = "kort";
    update.credit_limit = null;
    update.payment_terms_days = null;
  } else if (
    input.paymentMethod === "kredit" &&
    input.creditLimit != null &&
    input.creditLimit >= 0 &&
    input.paymentTermsDays != null &&
    input.paymentTermsDays >= 0
  ) {
    update.payment_method = "kredit";
    update.credit_limit = input.creditLimit;
    update.payment_terms_days = input.paymentTermsDays;
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update(update)
    .eq("id", input.customerId);

  if (error) {
    console.error("[updateCustomer]", error);
    return { success: false };
  }

  return { success: true };
}
