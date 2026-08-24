import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type DeliveryAddress = {
  id: string;
  label: string | null;
  contactName: string | null;
  phone: string | null;
  streetAddress: string;
  postalCode: string | null;
  city: string | null;
  country: string;
  isDefault: boolean;
};

export async function listAddresses(
  customerId: string,
): Promise<DeliveryAddress[]> {
  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin
    .from("delivery_addresses")
    .select(
      "id, label, contact_name, phone, street_address, postal_code, city, country, is_default",
    )
    .eq("profile_id", customerId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error || !data) {
    console.error("[listAddresses]", error);
    return [];
  }

  return data.map((row) => ({
    id: row.id as string,
    label: row.label as string | null,
    contactName: row.contact_name as string | null,
    phone: row.phone as string | null,
    streetAddress: row.street_address as string,
    postalCode: row.postal_code as string | null,
    city: row.city as string | null,
    country: row.country as string,
    isDefault: row.is_default as boolean,
  }));
}

export type UpdateAddressInput = {
  addressId: string;
  label: string | null;
  contactName: string | null;
  phone: string | null;
  streetAddress: string;
  postalCode: string | null;
  city: string | null;
  country: string;
};

export async function updateAddress(
  input: UpdateAddressInput,
): Promise<{ success: boolean }> {
  if (!input.streetAddress || !input.country) {
    return { success: false };
  }

  const supabaseAdmin = createAdminClient();

  const { error } = await supabaseAdmin
    .from("delivery_addresses")
    .update({
      label: input.label,
      contact_name: input.contactName,
      phone: input.phone,
      street_address: input.streetAddress,
      postal_code: input.postalCode,
      city: input.city,
      country: input.country,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.addressId);

  if (error) {
    console.error("[updateAddress]", error);
    return { success: false };
  }

  return { success: true };
}

export type CreateAddressInput = {
  customerId: string;
  label: string | null;
  contactName: string | null;
  phone: string | null;
  streetAddress: string;
  postalCode: string;
  city: string;
  country: string;
};

export async function createAddress(
  input: CreateAddressInput,
): Promise<{ success: boolean }> {
  if (
    !input.streetAddress ||
    !input.postalCode ||
    !input.city ||
    !input.country
  ) {
    return { success: false };
  }

  const supabaseAdmin = createAdminClient();

  const { error } = await supabaseAdmin.from("delivery_addresses").insert({
    profile_id: input.customerId,
    label: input.label,
    contact_name: input.contactName,
    phone: input.phone,
    street_address: input.streetAddress,
    postal_code: input.postalCode,
    city: input.city,
    country: input.country,
    is_default: false,
  });

  if (error) {
    console.error("[createAddress]", error);
    return { success: false };
  }

  return { success: true };
}

export async function setDefaultAddress(
  customerId: string,
  addressId: string,
): Promise<{ success: boolean }> {
  const supabaseAdmin = createAdminClient();

  // To sekventielle opdateringer i stedet for én, så det unikke indeks
  // (kun én is_default pr. kunde, fra 0002) aldrig midlertidigt skulle
  // kræve to sande rækker på samme tid: ryd først, sæt derefter.
  const { error: clearError } = await supabaseAdmin
    .from("delivery_addresses")
    .update({ is_default: false })
    .eq("profile_id", customerId)
    .eq("is_default", true);

  if (clearError) {
    console.error("[setDefaultAddress] clear failed", clearError);
    return { success: false };
  }

  const { error: setError } = await supabaseAdmin
    .from("delivery_addresses")
    .update({ is_default: true })
    .eq("id", addressId)
    .eq("profile_id", customerId);

  if (setError) {
    console.error("[setDefaultAddress] set failed", setError);
    return { success: false };
  }

  return { success: true };
}
