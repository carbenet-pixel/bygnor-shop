import "server-only";
import { createClient } from "@/lib/supabase/server";
import { displayName } from "@/lib/format";

export type CatalogProduct = {
  id: string;
  sku: string;
  name: string;
  nameDa: string | null;
  basePrice: number | null;
  imageUrl: string | null;
  productGroupId: string;
};

export type CatalogGroup = {
  id: string;
  name: string;
  products: CatalogProduct[];
};

export type CatalogCategory = {
  id: string;
  name: string;
  groups: CatalogGroup[];
};

/**
 * Pido viser selv kun ét billede pr. produktgruppe i deres katalog, ikke
 * ét pr. varenummer — vi stillede tidligere et strengere krav. Beregnet
 * ved opslag (produktets eget image_url ændres IKKE i databasen), så et
 * senere Pido-billede for et specifikt varenummer automatisk tager over
 * uden oprydning. "rows" behøver ikke være udtømmende for alle grupper —
 * kald med ekstra kandidat-rækker hvis den viste mængde ikke selv dækker
 * hele gruppen (se lib/cart.ts / lib/products-admin.ts).
 */
export function buildGroupImageFallbackMap(
  rows: { productGroupId: string; imageUrl: string | null }[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    if (row.imageUrl && !map.has(row.productGroupId)) {
      map.set(row.productGroupId, row.imageUrl);
    }
  }
  return map;
}

function toCatalogProduct(row: Record<string, unknown>): CatalogProduct {
  return {
    id: row.id as string,
    sku: row.sku as string,
    name: row.name as string,
    nameDa: row.name_da as string | null,
    basePrice: row.base_price as number | null,
    imageUrl: row.image_url as string | null,
    productGroupId: row.product_group_id as string,
  };
}

/**
 * Henter hele kataloget grupperet efter afdeling → produktgruppe. RLS på
 * products/product_groups/categories kræver kun `authenticated` (se
 * migration 0008), så alle roller ser samme data via den session-bundne
 * klient — ingen service-role nødvendig her.
 */
export async function listCatalog(): Promise<CatalogCategory[]> {
  const supabase = await createClient();

  const [
    { data: categories, error: categoriesError },
    { data: groups, error: groupsError },
    { data: products, error: productsError },
  ] = await Promise.all([
    supabase.from("categories").select("id, name").order("name"),
    supabase
      .from("product_groups")
      .select("id, name, name_da, category_id")
      .order("name"),
    supabase
      .from("products")
      .select("id, sku, name, name_da, base_price, image_url, product_group_id")
      .order("name"),
  ]);

  if (categoriesError || !categories) {
    console.error("[listCatalog] categories", categoriesError);
    return [];
  }
  if (groupsError || !groups) {
    console.error("[listCatalog] product_groups", groupsError);
    return [];
  }
  if (productsError || !products) {
    console.error("[listCatalog] products", productsError);
    return [];
  }

  // Alle produkter er allerede hentet her, så kortet dækker hele kataloget
  // — ingen ekstra forespørgsel nødvendig for at finde et billede at arve.
  const fallbackImageByGroup = buildGroupImageFallbackMap(
    products.map((row) => ({
      productGroupId: row.product_group_id as string,
      imageUrl: row.image_url as string | null,
    })),
  );

  const productsByGroup = new Map<string, CatalogProduct[]>();
  for (const row of products) {
    const product = toCatalogProduct(row);
    if (!product.imageUrl) {
      product.imageUrl = fallbackImageByGroup.get(product.productGroupId) ?? null;
    }
    const list = productsByGroup.get(product.productGroupId) ?? [];
    list.push(product);
    productsByGroup.set(product.productGroupId, list);
  }

  // product_groups.name_da er kurateret manuelt for alle nuværende grupper.
  // Falder tilbage til det alfabetisk første medlems navn for fremtidige
  // grupper uden kurateret titel (groupProducts er allerede sorteret efter
  // navn via products-forespørgslen ovenfor).
  const groupsByCategory = new Map<string, CatalogGroup[]>();
  for (const g of groups) {
    const groupProducts = productsByGroup.get(g.id as string) ?? [];
    if (groupProducts.length === 0) continue;
    const groupName =
      (g.name_da as string | null) ?? displayName(groupProducts[0]) ?? (g.name as string);
    const list = groupsByCategory.get(g.category_id as string) ?? [];
    list.push({ id: g.id as string, name: groupName, products: groupProducts });
    groupsByCategory.set(g.category_id as string, list);
  }

  return categories
    .map((c) => ({
      id: c.id as string,
      name: c.name as string,
      groups: groupsByCategory.get(c.id as string) ?? [],
    }))
    .filter((c) => c.groups.length > 0);
}

export type CategoryOverviewItem = {
  id: string;
  name: string;
  imageUrl: string | null;
};

/**
 * Afdelings-oversigt til /shop. Billedprioritet: categories.image_url
 * (fremtidig manuel kuratering, se migration 0009) → første produkt i
 * afdelingen (alfabetisk) med et sat image_url → null (viser fallback-
 * placeholder i UI'et).
 */
export async function getCategoryOverview(): Promise<CategoryOverviewItem[]> {
  const supabase = await createClient();

  const [
    { data: categories, error: categoriesError },
    { data: groups },
    { data: products },
  ] = await Promise.all([
    supabase.from("categories").select("id, name, image_url").order("name"),
    supabase.from("product_groups").select("id, category_id"),
    supabase
      .from("products")
      .select("product_group_id, image_url")
      .not("image_url", "is", null)
      .order("name"),
  ]);

  if (categoriesError || !categories) {
    console.error("[getCategoryOverview] categories", categoriesError);
    return [];
  }

  const categoryIdByGroup = new Map(
    (groups ?? []).map((g) => [g.id as string, g.category_id as string]),
  );

  const fallbackImageByCategory = new Map<string, string>();
  for (const p of products ?? []) {
    const categoryId = categoryIdByGroup.get(p.product_group_id as string);
    if (!categoryId || fallbackImageByCategory.has(categoryId)) continue;
    fallbackImageByCategory.set(categoryId, p.image_url as string);
  }

  return categories.map((c) => ({
    id: c.id as string,
    name: c.name as string,
    imageUrl:
      (c.image_url as string | null) ??
      fallbackImageByCategory.get(c.id as string) ??
      null,
  }));
}

export type ProductGroupMember = CatalogProduct & {
  description: string | null;
  stockStatus: string;
  vendorName: string;
};

export type ProductGroupDetail = {
  groupId: string;
  groupName: string;
  categoryName: string;
  members: ProductGroupMember[];
};

/**
 * Kataloget browses nu pr. produktgruppe, ikke pr. SKU (Pido sælger selv
 * efter gruppe — fx "Blomhylla" er ét produkt med tre længder). Tager et
 * PRODUKT-id (ikke gruppe-id) for at holde eksisterende links (kurv,
 * søgning, gamle links) virkende uændret — siden viser hele gruppen med
 * det givne produkt forvalgt i variant-vælgeren.
 */
export async function getProductGroupDetail(
  productId: string,
): Promise<ProductGroupDetail | null> {
  const supabase = await createClient();

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("product_group_id")
    .eq("id", productId)
    .single();

  if (productError || !product) {
    return null;
  }

  const groupId = product.product_group_id as string;

  const [{ data: group, error: groupError }, { data: memberRows, error: membersError }] =
    await Promise.all([
      supabase
        .from("product_groups")
        .select("name, name_da, categories(name)")
        .eq("id", groupId)
        .single(),
      supabase
        .from("products")
        .select(
          "id, sku, name, name_da, description, base_price, image_url, product_group_id, stock_status, vendors(name)",
        )
        .eq("product_group_id", groupId)
        .order("name"),
    ]);

  if (groupError || !group || membersError || !memberRows || memberRows.length === 0) {
    return null;
  }

  const groupCategory = group.categories as unknown as { name: string } | null;

  const members: ProductGroupMember[] = memberRows.map((row) => {
    const vendor = row.vendors as unknown as { name: string } | null;
    return {
      ...toCatalogProduct(row),
      description: row.description as string | null,
      stockStatus: row.stock_status as string,
      vendorName: vendor?.name ?? "",
    };
  });

  // Medlemmerne UDGØR hele gruppen, så kortet er fuldstændigt — ingen
  // ekstra forespørgsel nødvendig (samme mønster som listCatalog).
  const fallbackImageByGroup = buildGroupImageFallbackMap(
    members.map((m) => ({ productGroupId: m.productGroupId, imageUrl: m.imageUrl })),
  );
  for (const member of members) {
    if (!member.imageUrl) {
      member.imageUrl = fallbackImageByGroup.get(member.productGroupId) ?? null;
    }
  }

  // Samme fallback-princip som produktnavne: product_groups.name_da (kurateret
  // manuelt) → det alfabetisk første medlems navn for grupper uden titel.
  const groupName = (group.name_da as string | null) ?? displayName(members[0]) ?? (group.name as string);

  return {
    groupId,
    groupName,
    categoryName: groupCategory?.name ?? "",
    members,
  };
}
