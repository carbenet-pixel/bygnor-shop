"use server";

import { revalidatePath } from "next/cache";
import { AuthorizationError, requireRole, requireTargetRole } from "@/lib/admin-guard";
import {
  updateAddress,
  createAddress,
  setDefaultAddress,
} from "@/lib/delivery-addresses";
import { resetUserMfa } from "@/lib/mfa-admin";

function str(formData: FormData, name: string): string {
  return ((formData.get(name) as string) ?? "").trim();
}

function strOrNull(formData: FormData, name: string): string | null {
  return str(formData, name) || null;
}

export async function updateAddressAction(formData: FormData) {
  await requireRole("admin");

  const addressId = str(formData, "addressId");
  const customerId = str(formData, "customerId");

  if (!addressId) return;

  await updateAddress({
    addressId,
    label: strOrNull(formData, "label"),
    contactName: strOrNull(formData, "contactName"),
    phone: strOrNull(formData, "phone"),
    streetAddress: str(formData, "streetAddress"),
    postalCode: strOrNull(formData, "postalCode"),
    city: strOrNull(formData, "city"),
    country: str(formData, "country"),
  });

  if (customerId) revalidatePath(`/admin/customers/${customerId}`);
}

export async function createAddressAction(formData: FormData) {
  await requireRole("admin");

  const customerId = str(formData, "customerId");

  if (!customerId) return;

  await createAddress({
    customerId,
    label: strOrNull(formData, "label"),
    contactName: strOrNull(formData, "contactName"),
    phone: strOrNull(formData, "phone"),
    streetAddress: str(formData, "streetAddress"),
    postalCode: str(formData, "postalCode"),
    city: str(formData, "city"),
    country: str(formData, "country"),
  });

  revalidatePath(`/admin/customers/${customerId}`);
}

export async function setDefaultAddressAction(formData: FormData) {
  await requireRole("admin");

  const customerId = str(formData, "customerId");
  const addressId = str(formData, "defaultAddressId");

  if (!customerId || !addressId) return;

  await setDefaultAddress(customerId, addressId);
  revalidatePath(`/admin/customers/${customerId}`);
}

export async function resetCustomerMfaAction(formData: FormData) {
  const { userId: callerId } = await requireRole("admin");

  const customerId = str(formData, "customerId");

  if (!customerId) return;

  // Selv-targeting via admin-nulstillingen er bevidst blokeret — en admin
  // kan pr. definition ikke have role='kunde', så dette rammer reelt kun
  // som en dobbelt sikring, men holdes ens med resetUserMfaAction nedenfor.
  if (customerId === callerId) {
    throw new AuthorizationError("Brug din egen kontos 2FA-indstillinger for at nulstille din egen.");
  }

  await requireTargetRole(customerId, ["kunde"]);

  await resetUserMfa(customerId);
  revalidatePath(`/admin/customers/${customerId}`);
}
