import Link from "next/link";
import { listCatalog, getSubcategoryHeroImages } from "@/lib/catalog";
import { CatalogBrowser } from "./catalog-browser";

export const dynamic = "force-dynamic";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ avdeling?: string; underkategori?: string; q?: string }>;
}) {
  const [{ avdeling, underkategori, q }, categories, subcategoryHeroImages] = await Promise.all([
    searchParams,
    listCatalog(),
    getSubcategoryHeroImages(),
  ]);

  const initialCategoryId =
    avdeling && categories.some((c) => c.id === avdeling) ? avdeling : "alle";
  const initialSubcategoryId =
    underkategori &&
    categories.some((c) => c.groups.some((g) => g.subcategoryId === underkategori))
      ? underkategori
      : "alle";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link
        href="/shop"
        className="mb-4 inline-block text-xs text-slate-400 hover:text-[#185FA5]"
      >
        ← Til shop
      </Link>

      <h1 className="mb-1 text-xl font-semibold text-slate-900">
        Produktkatalog
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        Gennemse Bygnors produkter.
      </p>

      <CatalogBrowser
        categories={categories}
        initialCategoryId={initialCategoryId}
        initialSubcategoryId={initialSubcategoryId}
        initialQuery={q ?? ""}
        subcategoryHeroImages={subcategoryHeroImages}
      />
    </div>
  );
}
