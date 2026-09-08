import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCategory, getSubcategoriesForCategory } from "@/lib/catalog";
import { ProductImage } from "../../product-image";

export const dynamic = "force-dynamic";

export default async function CategorySubcategoriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const category = await getCategory(id);

  if (!category) {
    notFound();
  }

  const subcategories = await getSubcategoriesForCategory(id);

  // Afdelinger uden underkategorier (fx Lagerinventar) springer mellemtrinet
  // over — samme flade produktgruppe-liste som før det nye mellemlag.
  if (subcategories.length === 0) {
    redirect(`/shop/katalog?avdeling=${id}`);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link
        href="/shop"
        className="mb-4 inline-block text-xs text-slate-400 hover:text-[#185FA5]"
      >
        ← Til shop
      </Link>

      <h1 className="mb-1 text-xl font-semibold text-slate-900">{category.name}</h1>
      <p className="mb-6 text-sm text-slate-500">Vælg en underkategori.</p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {subcategories.map((subcategory) => (
          <Link
            key={subcategory.id}
            href={`/shop/katalog?avdeling=${id}&underkategori=${subcategory.id}`}
            className="group block rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
          >
            <ProductImage
              imageUrl={subcategory.imageUrl}
              alt={subcategory.name}
              className="aspect-square rounded-lg"
              sizes="(max-width: 640px) 45vw, 220px"
            />
            <p className="mt-3 text-center text-sm font-medium text-slate-900 group-hover:text-[#185FA5]">
              {subcategory.name}
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <Link
          href={`/shop/katalog?avdeling=${id}`}
          className="text-sm text-slate-500 underline underline-offset-2 hover:text-[#185FA5]"
        >
          Se alle produkter i {category.name} →
        </Link>
      </div>
    </div>
  );
}
