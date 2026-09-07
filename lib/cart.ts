import "server-only";
import { createClient } from "@/lib/supabase/server";
import { buildGroupImageFallbackMap } from "@/lib/catalog";

export type CartItem = {
  id: string;
  productId: string;
  sku: string;
  name: string;
  nameDa: string | null;
  imageUrl: string | null;
  basePrice: number | null;
  quantity: number;
};

export type Cart = {
  id: string | null;
  items: CartItem[];
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function getCurrentUserId(supabase: SupabaseServerClient): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function findCartId(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("carts")
    .select("id")
    .eq("customer_id", userId)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

/**
 * Samlet antal varer i kurven (sum af quantity, ikke antal linjer) — bruges
 * til badge'en i navigationen. Kunden har egen session, så RLS afgrænser
 * automatisk til egen kurv (se migration 0011) — intet behov for service_role.
 */
export async function getCartItemCount(): Promise<number> {
  const supabase = await createClient();
  const userId = await getCurrentUserId(supabase);
  if (!userId) return 0;

  const cartId = await findCartId(supabase, userId);
  if (!cartId) return 0;

  const { data, error } = await supabase
    .from("cart_items")
    .select("quantity")
    .eq("cart_id", cartId);

  if (error || !data) {
    console.error("[getCartItemCount]", error);
    return 0;
  }

  return data.reduce((sum, row) => sum + (row.quantity as number), 0);
}

/**
 * Kurven indeholder typisk kun få af gruppens produkter, så modsat
 * lib/catalog.ts's listCatalog() dækker de allerede hentede rækker ikke
 * nødvendigvis hele gruppen — hent billede-kandidater fra resten af
 * gruppen direkte, til brug for "arv billede fra produktgruppe".
 */
async function getGroupImageFallbackCandidates(
  supabase: SupabaseServerClient,
  groupIds: string[],
): Promise<{ productGroupId: string; imageUrl: string | null }[]> {
  if (groupIds.length === 0) return [];

  const { data, error } = await supabase
    .from("products")
    .select("product_group_id, image_url")
    .in("product_group_id", groupIds)
    .not("image_url", "is", null);

  if (error || !data) {
    console.error("[getGroupImageFallbackCandidates]", error);
    return [];
  }

  return data.map((row) => ({
    productGroupId: row.product_group_id as string,
    imageUrl: row.image_url as string | null,
  }));
}

export async function getCart(): Promise<Cart> {
  const supabase = await createClient();
  const userId = await getCurrentUserId(supabase);
  if (!userId) return { id: null, items: [] };

  const cartId = await findCartId(supabase, userId);
  if (!cartId) return { id: null, items: [] };

  const { data, error } = await supabase
    .from("cart_items")
    .select(
      "id, product_id, quantity, products(sku, name, name_da, image_url, base_price, product_group_id)",
    )
    .eq("cart_id", cartId)
    .order("created_at");

  if (error || !data) {
    console.error("[getCart]", error);
    return { id: cartId, items: [] };
  }

  type RawProduct = {
    sku: string;
    name: string;
    name_da: string | null;
    image_url: string | null;
    base_price: number | null;
    product_group_id: string;
  };

  const rows = data.map((row) => ({
    row,
    product: row.products as unknown as RawProduct | null,
  }));

  const groupIds = [
    ...new Set(
      rows
        .map(({ product }) => product?.product_group_id)
        .filter((v): v is string => Boolean(v)),
    ),
  ];
  const candidates = await getGroupImageFallbackCandidates(supabase, groupIds);
  const fallbackImageByGroup = buildGroupImageFallbackMap(candidates);

  return {
    id: cartId,
    items: rows.map(({ row, product }) => ({
      id: row.id as string,
      productId: row.product_id as string,
      sku: product?.sku ?? "",
      name: product?.name ?? "",
      nameDa: product?.name_da ?? null,
      imageUrl:
        product?.image_url ??
        (product ? (fallbackImageByGroup.get(product.product_group_id) ?? null) : null),
      basePrice: product?.base_price ?? null,
      quantity: row.quantity as number,
    })),
  };
}

export type CartActionResult = { success: true } | { success: false; error: string };

export async function addToCart(
  productId: string,
  quantity: number,
): Promise<CartActionResult> {
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { success: false, error: "Antal skal være mindst 1." };
  }

  const supabase = await createClient();
  const userId = await getCurrentUserId(supabase);
  if (!userId) {
    return { success: false, error: "Ikke logget ind." };
  }

  let cartId = await findCartId(supabase, userId);

  if (!cartId) {
    const { data: newCart, error: createError } = await supabase
      .from("carts")
      .insert({ customer_id: userId })
      .select("id")
      .single();

    if (createError || !newCart) {
      console.error("[addToCart] create cart", createError);
      return { success: false, error: "Kunne ikke oprette kurv." };
    }
    cartId = newCart.id as string;
  }

  // Findes varen allerede i kurven? Øg antal i stedet for at oprette en
  // dublet-linje — unique(cart_id, product_id) fra migration 0011.
  const { data: existing } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cartId)
    .eq("product_id", productId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("cart_items")
      .update({ quantity: (existing.quantity as number) + quantity })
      .eq("id", existing.id);

    if (error) {
      console.error("[addToCart] update", error);
      return { success: false, error: "Kunne ikke opdatere kurven." };
    }
  } else {
    const { error } = await supabase
      .from("cart_items")
      .insert({ cart_id: cartId, product_id: productId, quantity });

    if (error) {
      console.error("[addToCart] insert", error);
      return { success: false, error: "Kunne ikke tilføje til kurven." };
    }
  }

  return { success: true };
}

export async function updateCartItemQuantity(
  cartItemId: string,
  quantity: number,
): Promise<CartActionResult> {
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { success: false, error: "Antal skal være mindst 1." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("cart_items")
    .update({ quantity })
    .eq("id", cartItemId);

  if (error) {
    console.error("[updateCartItemQuantity]", error);
    return { success: false, error: "Kunne ikke opdatere antal." };
  }

  return { success: true };
}

export async function removeCartItem(cartItemId: string): Promise<CartActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("cart_items").delete().eq("id", cartItemId);

  if (error) {
    console.error("[removeCartItem]", error);
    return { success: false, error: "Kunne ikke fjerne varen." };
  }

  return { success: true };
}