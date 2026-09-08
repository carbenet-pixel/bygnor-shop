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
  imageSubgroupKey: string;
};

export type CatalogGroup = {
  id: string;
  name: string;
  subcategoryId: string | null;
  subcategoryName: string | null;
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
 *
 * Nøglen er (product_group_id, image_subgroup_key) sammen, IKKE kun
 * gruppen — en gruppe kan indeholde visuelt forskellige undertyper (fx
 * "med vippa" vs. almindeligt lige spyd i "Dubbelspjut för spårpanel"),
 * og et billede må ALDRIG arves på tværs af undergrupper. Findes intet
 * billede i egen undergruppe, er der bevidst ingen videre fallback til en
 * anden undergruppe — kald-stedet skal vise placeholder i det tilfælde
 * (se migration 0020).
 */
export function buildGroupImageFallbackMap(
  rows: { productGroupId: string; imageSubgroupKey: string; imageUrl: string | null }[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    if (!row.imageUrl) continue;
    const key = groupImageFallbackKey(row.productGroupId, row.imageSubgroupKey);
    if (!map.has(key)) {
      map.set(key, row.imageUrl);
    }
  }
  return map;
}

export function groupImageFallbackKey(
  productGroupId: string,
  imageSubgroupKey: string,
): string {
  return `${productGroupId}::${imageSubgroupKey}`;
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
    imageSubgroupKey: row.image_subgroup_key as string,
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
      .select("id, name, name_da, category_id, subcategory_id, subcategories(name, name_da)")
      .order("name"),
    supabase
      .from("products")
      .select(
        "id, sku, name, name_da, base_price, image_url, product_group_id, image_subgroup_key",
      )
      .order("sort_order"),
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
      imageSubgroupKey: row.image_subgroup_key as string,
      imageUrl: row.image_url as string | null,
    })),
  );

  const productsByGroup = new Map<string, CatalogProduct[]>();
  for (const row of products) {
    const product = toCatalogProduct(row);
    if (!product.imageUrl) {
      product.imageUrl =
        fallbackImageByGroup.get(
          groupImageFallbackKey(product.productGroupId, product.imageSubgroupKey),
        ) ?? null;
    }
    const list = productsByGroup.get(product.productGroupId) ?? [];
    list.push(product);
    productsByGroup.set(product.productGroupId, list);
  }

  // product_groups.name_da er kurateret manuelt for alle nuværende grupper.
  // Falder tilbage til gruppens første medlem i sort_order-rækkefølge for
  // fremtidige grupper uden kurateret titel (groupProducts er allerede
  // sorteret efter sort_order via products-forespørgslen ovenfor).
  const groupsByCategory = new Map<string, CatalogGroup[]>();
  for (const g of groups) {
    const groupProducts = productsByGroup.get(g.id as string) ?? [];
    if (groupProducts.length === 0) continue;
    const groupName =
      (g.name_da as string | null) ?? displayName(groupProducts[0]) ?? (g.name as string);
    const subcategory = g.subcategories as unknown as {
      name: string;
      name_da: string | null;
    } | null;
    const list = groupsByCategory.get(g.category_id as string) ?? [];
    list.push({
      id: g.id as string,
      name: groupName,
      subcategoryId: g.subcategory_id as string | null,
      subcategoryName: subcategory ? (subcategory.name_da ?? subcategory.name) : null,
      products: groupProducts,
    });
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
  hasSubcategories: boolean;
};

/**
 * Afdelings-oversigt til /shop. Billedprioritet: categories.image_url
 * (fremtidig manuel kuratering, se migration 0009) → første produkt i
 * afdelingen (efter sort_order) med et sat image_url → null (viser
 * fallback-placeholder i UI'et).
 */
export async function getCategoryOverview(): Promise<CategoryOverviewItem[]> {
  const supabase = await createClient();

  const [
    { data: categories, error: categoriesError },
    { data: groups },
    { data: products },
    { data: subcategories },
  ] = await Promise.all([
    supabase.from("categories").select("id, name, image_url").order("name"),
    supabase.from("product_groups").select("id, category_id"),
    supabase
      .from("products")
      .select("product_group_id, image_url")
      .not("image_url", "is", null)
      .order("sort_order"),
    supabase.from("subcategories").select("category_id"),
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

  const categoriesWithSubcategories = new Set(
    (subcategories ?? []).map((s) => s.category_id as string),
  );

  return categories.map((c) => ({
    id: c.id as string,
    name: c.name as string,
    imageUrl:
      (c.image_url as string | null) ??
      fallbackImageByCategory.get(c.id as string) ??
      null,
    hasSubcategories: categoriesWithSubcategories.has(c.id as string),
  }));
}

export type CategoryBasic = { id: string; name: string };

export async function getCategory(id: string): Promise<CategoryBasic | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return { id: data.id as string, name: data.name as string };
}

export type SubcategoryOverviewItem = {
  id: string;
  name: string;
  imageUrl: string | null;
};

/**
 * Underkategorier for én afdeling — vises som mellemtrin mellem afdeling
 * og produktgruppe, kun for afdelinger der reelt har underkategorier (se
 * CategoryOverviewItem.hasSubcategories). Samme billed-fallback-princip
 * som kategori- og gruppebilleder: eget billede → første produkt under
 * underkategorien med billede → null (placeholder i UI'et).
 */
export async function getSubcategoriesForCategory(
  categoryId: string,
): Promise<SubcategoryOverviewItem[]> {
  const supabase = await createClient();

  const [{ data: subcategories, error: subcategoriesError }, { data: groups }] =
    await Promise.all([
      supabase
        .from("subcategories")
        .select("id, name, name_da, image_url")
        .eq("category_id", categoryId)
        .order("name_da"),
      supabase
        .from("product_groups")
        .select("id, subcategory_id")
        .eq("category_id", categoryId)
        .not("subcategory_id", "is", null),
    ]);

  if (subcategoriesError || !subcategories) {
    console.error("[getSubcategoriesForCategory]", subcategoriesError);
    return [];
  }

  const subcategoryIdByGroup = new Map(
    (groups ?? []).map((g) => [g.id as string, g.subcategory_id as string]),
  );
  const groupIds = (groups ?? []).map((g) => g.id as string);

  const { data: products } =
    groupIds.length > 0
      ? await supabase
          .from("products")
          .select("product_group_id, image_url")
          .in("product_group_id", groupIds)
          .not("image_url", "is", null)
          .order("sort_order")
      : { data: [] as { product_group_id: string; image_url: string }[] };

  const fallbackImageBySubcategory = new Map<string, string>();
  for (const p of products ?? []) {
    const subcategoryId = subcategoryIdByGroup.get(p.product_group_id as string);
    if (!subcategoryId || fallbackImageBySubcategory.has(subcategoryId)) continue;
    fallbackImageBySubcategory.set(subcategoryId, p.image_url as string);
  }

  return subcategories.map((s) => ({
    id: s.id as string,
    name: (s.name_da as string | null) ?? (s.name as string),
    imageUrl:
      (s.image_url as string | null) ??
      fallbackImageBySubcategory.get(s.id as string) ??
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

  // Variant-rækkefølgen kan IKKE afgøres pålideligt ud fra varenummer eller
  // navn (fx sorteres "2120x1200" alfabetisk før "2120x900") — sort_order er
  // beregnet ud fra Pidos eget trykte katalog (migration 0018) og er den
  // eneste korrekte sortering for varianter i en gruppe.
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
          "id, sku, name, name_da, description, base_price, image_url, product_group_id, image_subgroup_key, stock_status, vendors(name)",
        )
        .eq("product_group_id", groupId)
        .order("sort_order"),
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
  // ekstra forespørgsel nødvendig (samme mønster som listCatalog). Hver
  // variant arver kun fra søskende i SAMME image_subgroup_key, så billedet
  // korrekt skifter (eller viser placeholder) når kunden vælger en anden
  // variant i dropdownet — se buildGroupImageFallbackMap.
  const fallbackImageByGroup = buildGroupImageFallbackMap(
    members.map((m) => ({
      productGroupId: m.productGroupId,
      imageSubgroupKey: m.imageSubgroupKey,
      imageUrl: m.imageUrl,
    })),
  );
  for (const member of members) {
    if (!member.imageUrl) {
      member.imageUrl =
        fallbackImageByGroup.get(
          groupImageFallbackKey(member.productGroupId, member.imageSubgroupKey),
        ) ?? null;
    }
  }

  // Samme fallback-princip som produktnavne: product_groups.name_da (kurateret
  // manuelt) → det første medlem i sort_order-rækkefølge for grupper uden titel.
  const groupName = (group.name_da as string | null) ?? displayName(members[0]) ?? (group.name as string);

  return {
    groupId,
    groupName,
    categoryName: groupCategory?.name ?? "",
    members,
  };
}
