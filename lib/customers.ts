import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type CustomerListItem = {
  id: string;
  email: string | null;
  companyName: string | null;
  paymentMethod: string | null;
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
          "id, company_name, payment_method, discount_group, individual_discount, is_active",
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
    discountGroupId: p.discount_group as string,
    discountGroupName:
      groupNameById.get(p.discount_group as string) ?? (p.discount_group as string),
    individualDiscount: p.individual_discount as number | null,
    isActive: p.is_active as boolean,
  }));
}

export type UpdateCustomerInput = {
  customerId: string;
  discountGroup: string;
  individualDiscount: number | null;
  isActive: boolean;
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
