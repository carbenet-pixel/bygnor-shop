"use server";

import { revalidatePath } from "next/cache";
import {
  updateAddress,
  createAddress,
  setDefaultAddress,
} from "@/lib/delivery-addresses";

function str(formData: FormData, name: string): string {
  return ((formData.get(name) as string) ?? "").trim();
}

function strOrNull(formData: FormData, name: string): string | null {
  return str(formData, name) || null;
}

export async function updateAddressAction(formData: FormData) {
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
  const customerId = str(formData, "customerId");
  const addressId = str(formData, "defaultAddressId");

  if (!customerId || !addressId) return;

  await setDefaultAddress(customerId, addressId);
  revalidatePath(`/admin/customers/${customerId}`);
}
