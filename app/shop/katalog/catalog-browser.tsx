"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CatalogCategory, CatalogProduct } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { ProductImage } from "./product-image";

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#185FA5] focus:ring-2 focus:ring-[#185FA5]/20";

function ProductCard({ product }: { product: CatalogProduct }) {
  return (
    <Link
      href={`/shop/katalog/${product.id}`}
      className="group block rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
    >
      <ProductImage
        imageUrl={product.imageUrl}
        alt={product.name}
        className="aspect-square rounded-lg"
        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 220px, 240px"
      />
      <p className="mt-3 line-clamp-2 text-sm font-medium text-slate-900 group-hover:text-[#185FA5]">
        {product.name}
      </p>
      <p className="text-xs text-slate-400">{product.sku}</p>
      <p
        className={
          product.basePrice == null
            ? "mt-1 text-sm text-slate-400 italic"
            : "mt-1 text-sm font-semibold text-slate-900"
        }
      >
        {formatPrice(product.basePrice)}
      </p>
    </Link>
  );
}

export function CatalogBrowser({
  categories,
}: {
  categories: CatalogCategory[];
}) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("alle");

  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    return categories
      .filter((c) => categoryId === "alle" || c.id === categoryId)
      .map((c) => ({
        ...c,
        groups: c.groups
          .map((g) => ({
            ...g,
            products: g.products.filter(
              (p) =>
                !q ||
                p.name.toLowerCase().includes(q) ||
                p.sku.toLowerCase().includes(q),
            ),
          }))
          .filter((g) => g.products.length > 0),
      }))
      .filter((c) => c.groups.length > 0);
  }, [categories, categoryId, q]);

  const totalMatches = filtered.reduce(
    (sum, c) => sum + c.groups.reduce((s, g) => s + g.products.length, 0),
    0,
  );

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
          onChange={(e) => setCategoryId(e.target.value)}
          className={`${inputClass} sm:max-w-xs`}
        >
          <option value="alle">Alle afdelinger</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
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
            {category.groups.map((group) => (
              <div key={group.id} className="mb-6">
                <h3 className="mb-3 text-sm font-medium text-slate-500">
                  {group.name}
                </h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {group.products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))
      )}
    </div>
  );
}
