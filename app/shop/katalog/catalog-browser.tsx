"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CatalogCategory, CatalogGroup } from "@/lib/catalog";
import { formatPrice, displayName } from "@/lib/format";
import { ProductImage } from "../product-image";

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#185FA5] focus:ring-2 focus:ring-[#185FA5]/20";

function GroupCard({
  group,
  matchedProductId,
}: {
  group: CatalogGroup;
  matchedProductId?: string;
}) {
  const pricedMembers = group.products.filter((p) => p.basePrice != null);
  const minPrice =
    pricedMembers.length > 0
      ? Math.min(...pricedMembers.map((p) => p.basePrice!))
      : null;
  // Kun relevant når INGEN varianter har en pris — findes bare én prissat
  // variant, viser kortet "Fra X kr" som normalt.
  const onlyPriceOnRequest =
    minPrice == null && group.products.some((p) => p.priceOnRequest);

  const linkTargetId = matchedProductId ?? group.products[0].id;
  const representative =
    group.products.find((p) => p.id === linkTargetId) ?? group.products[0];

  return (
    <Link
      href={`/shop/katalog/${linkTargetId}`}
      className="group block rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
    >
      <ProductImage
        imageUrl={representative.imageUrl}
        alt={group.name}
        className="aspect-square rounded-lg"
        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 220px, 240px"
      />
      <p className="mt-3 line-clamp-2 text-sm font-medium text-slate-900 group-hover:text-[#185FA5]">
        {group.name}
      </p>
      <p className="text-xs text-slate-400">
        {group.products.length} {group.products.length === 1 ? "variant" : "varianter"}
      </p>
      <p
        className={
          minPrice == null
            ? "mt-1 text-sm text-slate-400 italic"
            : "mt-1 text-sm font-semibold text-slate-900"
        }
      >
        {minPrice != null
          ? `Fra ${formatPrice(minPrice)}`
          : onlyPriceOnRequest
            ? "Kontakt os for tilbud"
            : "Pris oplyses snarest"}
      </p>
    </Link>
  );
}

type FilteredGroup = { group: CatalogGroup; matchedProductId?: string };

export function CatalogBrowser({
  categories,
  initialCategoryId = "alle",
  initialSubcategoryId = "alle",
  initialQuery = "",
}: {
  categories: CatalogCategory[];
  initialCategoryId?: string;
  initialSubcategoryId?: string;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [subcategoryId, setSubcategoryId] = useState(initialSubcategoryId);

  const q = query.trim().toLowerCase();

  // Underkategori-valgmuligheder for den VALGTE afdeling — kun relevant når
  // en enkelt afdeling er valgt, og kun de underkategorier der reelt findes
  // blandt dens grupper (nogle afdelinger har slet ingen, fx Lagerinventar).
  const subcategoryOptions = useMemo(() => {
    if (categoryId === "alle") return [];
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return [];
    const seen = new Map<string, string>();
    for (const g of category.groups) {
      if (g.subcategoryId && !seen.has(g.subcategoryId)) {
        seen.set(g.subcategoryId, g.subcategoryName ?? g.subcategoryId);
      }
    }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1], "da"));
  }, [categories, categoryId]);

  const filtered = useMemo(() => {
    return categories
      .filter((c) => categoryId === "alle" || c.id === categoryId)
      .map((c) => {
        const groups: FilteredGroup[] = c.groups
          .filter((g) => subcategoryId === "alle" || g.subcategoryId === subcategoryId)
          .map((g): FilteredGroup | null => {
            if (!q) return { group: g };
            const matched = g.products.find(
              (p) =>
                displayName(p).toLowerCase().includes(q) ||
                p.sku.toLowerCase().includes(q),
            );
            return matched ? { group: g, matchedProductId: matched.id } : null;
          })
          .filter((entry): entry is FilteredGroup => entry !== null);
        return { ...c, groups };
      })
      .filter((c) => c.groups.length > 0);
  }, [categories, categoryId, subcategoryId, q]);

  const totalMatches = filtered.reduce((sum, c) => sum + c.groups.length, 0);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Søg på navn eller varenummer…"
          className={`${inputClass} sm:max-w-sm`}
        />
        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setSubcategoryId("alle");
          }}
          className={`${inputClass} sm:max-w-xs`}
        >
          <option value="alle">Alle afdelinger</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {subcategoryOptions.length > 0 && (
          <select
            value={subcategoryId}
            onChange={(e) => setSubcategoryId(e.target.value)}
            className={`${inputClass} sm:max-w-xs`}
          >
            <option value="alle">Alle underkategorier</option>
            {subcategoryOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        )}
      </div>

      <p className="mb-6 text-sm text-slate-500">
        {totalMatches} {totalMatches === 1 ? "produkt" : "produkter"}
      </p>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500">
          Ingen produkter matcher søgningen.
        </p>
      ) : (
        filtered.map((category) => (
          <section key={category.id} className="mb-10">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              {category.name}
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {category.groups.map(({ group, matchedProductId }) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  matchedProductId={matchedProductId}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
