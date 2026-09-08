import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { STOCK_STATUS_OPTIONS } from "@/lib/product-constants";
import { buildGroupImageFallbackMap, groupImageFallbackKey } from "@/lib/catalog";

export { STOCK_STATUS_OPTIONS };

export type ProductAdminListItem = {
  id: string;
  sku: string;
  name: string;
  nameDa: string | null;
  vendorName: string;
  categoryName: string;
  productGroupName: string;
  basePrice: number | null;
  imageUrl: string | null;
  active: boolean;
};

export async function listProductsAdmin(): Promise<ProductAdminListItem[]> {
  const supabaseAdmin = createAdminClient();

  // sku er kun unikt PR. LEVERANDØR (vendor_id, sku), migration 0021 — to
  // produkter kan derfor godt vise samme Varenr.-tekst her. Leverandørnavn
  // hentes med, så de kan skelnes i listen.
  const { data, error } = await supabaseAdmin
    .from("products")
    .select(
      "id, sku, name, name_da, base_price, image_url, active, product_group_id, image_subgroup_key, product_groups(name, categories(name)), vendors(name)",
    )
    .order("sku");

  if (error || !data) {
    console.error("[listProductsAdmin]", error);
    return [];
  }

  // Hele produktlisten er allerede hentet, så kortet dækker alle grupper —
  // ingen ekstra forespørgsel nødvendig for "arv billede fra produktgruppe".
  const fallbackImageByGroup = buildGroupImageFallbackMap(
    data.map((row) => ({
      productGroupId: row.product_group_id as string,
      imageSubgroupKey: row.image_subgroup_key as string,
      imageUrl: row.image_url as string | null,
    })),
  );

  return data.map((row) => {
    const group = row.product_groups as unknown as {
      name: string;
      categories: { name: string } | null;
    } | null;
    const vendor = row.vendors as unknown as { name: string } | null;

    return {
      id: row.id as string,
      sku: row.sku as string,
      name: row.name as string,
      nameDa: row.name_da as string | null,
      vendorName: vendor?.name ?? "—",
      categoryName: group?.categories?.name ?? "—",
      productGroupName: group?.name ?? "—",
      basePrice: row.base_price as number | null,
      imageUrl:
        (row.image_url as string | null) ??
        fallbackImageByGroup.get(
          groupImageFallbackKey(
            row.product_group_id as string,
            row.image_subgroup_key as string,
          ),
        ) ??
        null,
      active: row.active as boolean,
    };
  });
}

export type ProductAdminDetail = {
  id: string;
  sku: string;
  name: string;
  nameDa: string | null;
  description: string | null;
  productGroupId: string;
  vendorId: string;
  catalogPage: number | null;
  basePrice: number | null;
  vatRate: number;
  stockStatus: string;
  leadTimeDays: number | null;
  imageUrl: string | null;
  active: boolean;
};

export async function getProductAdmin(id: string): Promise<ProductAdminDetail | null> {
  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin
    .from("products")
    .select(
      "id, sku, name, name_da, description, product_group_id, image_subgroup_key, vendor_id, catalog_page, base_price, vat_rate, stock_status, lead_time_days, image_url, active",
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  let imageUrl = data.image_url as string | null;
  if (!imageUrl) {
    // Kun ét produkt hentet her — dets gruppe kan indeholde andre varer
    // med billede, som ikke selv er en del af denne forespørgsel. Kun
    // søskende i SAMME image_subgroup_key kommer i betragtning (se
    // buildGroupImageFallbackMap) — ingen fallback på tværs af undergrupper.
    const { data: groupProducts } = await supabaseAdmin
      .from("products")
      .select("image_url")
      .eq("product_group_id", data.product_group_id as string)
      .eq("image_subgroup_key", data.image_subgroup_key as string)
      .not("image_url", "is", null)
      .limit(1)
      .maybeSingle();
    imageUrl = (groupProducts?.image_url as string | null) ?? null;
  }

  return {
    id: data.id as string,
    sku: data.sku as string,
    name: data.name as string,
    nameDa: data.name_da as string | null,
    description: data.description as string | null,
    productGroupId: data.product_group_id as string,
    vendorId: data.vendor_id as string,
    catalogPage: data.catalog_page as number | null,
    basePrice: data.base_price as number | null,
    vatRate: data.vat_rate as number,
    stockStatus: data.stock_status as string,
    leadTimeDays: data.lead_time_days as number | null,
    imageUrl,
    active: data.active as boolean,
  };
}

const VALID_STOCK_STATUS = new Set<string>(STOCK_STATUS_OPTIONS);

export type ProductFieldsInput = {
  name: string;
  description: string | null;
  productGroupId: string;
  vendorId: string;
  catalogPage: number | null;
  basePrice: number | null;
  vatRate: number;
  stockStatus: string;
  leadTimeDays: number | null;
  active: boolean;
};

export type ProductResult =
  | { success: true; id: string }
  | { success: false; error: string };

function validateProductFields(input: ProductFieldsInput): string | null {
  if (!input.name.trim()) return "Navn er påkrævet.";
  if (!input.productGroupId) return "Produktgruppe er påkrævet.";
  if (!input.vendorId) return "Leverandør er påkrævet.";
  if (!VALID_STOCK_STATUS.has(input.stockStatus)) return "Ugyldig lagerstatus.";
  if (!Number.isFinite(input.vatRate) || input.vatRate < 0) return "Ugyldig momssats.";
  return null;
}

export async function createProduct(
  sku: string,
  input: ProductFieldsInput,
): Promise<ProductResult> {
  if (!sku.trim()) return { success: false, error: "Varenummer (SKU) er påkrævet." };

  const fieldsError = validateProductFields(input);
  if (fieldsError) return { success: false, error: fieldsError };

  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin
    .from("products")
    .insert({
      sku: sku.trim(),
      name: input.name.trim(),
      description: input.description,
      product_group_id: input.productGroupId,
      vendor_id: input.vendorId,
      catalog_page: input.catalogPage,
      base_price: input.basePrice,
      vat_rate: input.vatRate,
      stock_status: input.stockStatus,
      lead_time_days: input.leadTimeDays,
      active: input.active,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return {
        success: false,
        error: "Varenummeret (SKU) findes allerede for denne leverandør.",
      };
    }
    console.error("[createProduct]", error);
    return { success: false, error: "Kunne ikke oprette produktet." };
  }

  return { success: true, id: data.id as string };
}

export async function updateProduct(
  id: string,
  input: ProductFieldsInput,
): Promise<ProductResult> {
  const fieldsError = validateProductFields(input);
  if (fieldsError) return { success: false, error: fieldsError };

  const supabaseAdmin = createAdminClient();

  const { error } = await supabaseAdmin
    .from("products")
    .update({
      name: input.name.trim(),
      description: input.description,
      product_group_id: input.productGroupId,
      vendor_id: input.vendorId,
      catalog_page: input.catalogPage,
      base_price: input.basePrice,
      vat_rate: input.vatRate,
      stock_status: input.stockStatus,
      lead_time_days: input.leadTimeDays,
      active: input.active,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      // sku selv redigeres ikke her, men vendor_id gør — et skift af
      // leverandør kan nu kollidere, hvis den nye leverandør allerede har
      // et produkt med samme sku (products_vendor_id_sku_key, migration 0021).
      return {
        success: false,
        error: "Den valgte leverandør har allerede et produkt med dette varenummer (SKU).",
      };
    }
    console.error("[updateProduct]", error);
    return { success: false, error: "Kunne ikke opdatere produktet." };
  }

  return { success: true, id };
}

export async function updateProductImageUrl(id: string, imageUrl: string): Promise<void> {
  const supabaseAdmin = createAdminClient();

  const { error } = await supabaseAdmin
    .from("products")
    .update({ image_url: imageUrl })
    .eq("id", id);

  if (error) {
    console.error("[updateProductImageUrl]", error);
  }
}
