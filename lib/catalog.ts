import "server-only";
import { createClient } from "@/lib/supabase/server";

export type CatalogProduct = {
  id: string;
  sku: string;
  name: string;
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

function toCatalogProduct(row: Record<string, unknown>): CatalogProduct {
  return {
    id: row.id as string,
    sku: row.sku as string,
    name: row.name as string,
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
      .select("id, name, category_id")
      .order("name"),
    supabase
      .from("products")
      .select("id, sku, name, base_price, image_url, product_group_id")
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

  const productsByGroup = new Map<string, CatalogProduct[]>();
  for (const row of products) {
    const product = toCatalogProduct(row);
    const list = productsByGroup.get(product.productGroupId) ?? [];
    list.push(product);
    productsByGroup.set(product.productGroupId, list);
  }

  const groupsByCategory = new Map<string, CatalogGroup[]>();
  for (const g of groups) {
    const groupProducts = productsByGroup.get(g.id as string) ?? [];
    if (groupProducts.length === 0) continue;
    const list = groupsByCategory.get(g.category_id as string) ?? [];
    list.push({ id: g.id as string, name: g.name as string, products: groupProducts });
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

export type ProductDetail = CatalogProduct & {
  description: string | null;
  categoryName: string;
  productGroupName: string;
};

export async function getProductDetail(
  id: string,
): Promise<{ product: ProductDetail; siblings: CatalogProduct[] } | null> {
  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from("products")
    .select(
      "id, sku, name, description, base_price, image_url, product_group_id, product_groups(name, categories(name))",
    )
    .eq("id", id)
    .single();

  if (error || !product) {
    return null;
  }

  const group = product.product_groups as unknown as {
    name: string;
    categories: { name: string } | null;
  } | null;

  const { data: siblingRows } = await supabase
    .from("products")
    .select("id, sku, name, base_price, image_url, product_group_id")
    .eq("product_group_id", product.product_group_id as string)
    .neq("id", id)
    .order("name");

  return {
    product: {
      ...toCatalogProduct(product as Record<string, unknown>),
      description: product.description as string | null,
      categoryName: group?.categories?.name ?? "",
      productGroupName: group?.name ?? "",
    },
    siblings: (siblingRows ?? []).map((row) => toCatalogProduct(row)),
  };
}
