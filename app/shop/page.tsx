import Link from "next/link";
import { getCategoryOverview } from "@/lib/catalog";
import { ProductImage } from "./product-image";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const categories = await getCategoryOverview();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-1 text-xl font-semibold text-slate-900">
        Kategorier
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        Vælg en kategori for at se produkterne.
      </p>

      <form action="/shop/katalog" method="GET" className="mb-6 flex gap-2">
        <div className="relative w-full">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35m1.85-5.65a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z"
            />
          </svg>
          <input
            type="search"
            name="q"
            placeholder="Søg på navn eller varenummer…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 shadow-sm outline-none focus:border-[#185FA5] focus:ring-2 focus:ring-[#185FA5]/20"
          />
        </div>
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-[#185FA5] px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#144e88] hover:shadow-md"
        >
          Søg
        </button>
      </form>

      {categories.length === 0 ? (
        <p className="text-sm text-slate-500">Ingen kategorier endnu.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/shop/katalog?avdeling=${category.id}`}
              className="group block rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
            >
              <ProductImage
                imageUrl={category.imageUrl}
                alt={category.name}
                className="aspect-square rounded-lg"
                sizes="(max-width: 640px) 45vw, 220px"
              />
              <p className="mt-3 text-center text-sm font-medium text-slate-900 group-hover:text-[#185FA5]">
                {category.name}
              </p>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8">
        <Link
          href="/shop/katalog"
          className="text-sm text-slate-500 underline underline-offset-2 hover:text-[#185FA5]"
        >
          Se hele kataloget →
        </Link>
      </div>
    </div>
  );
}