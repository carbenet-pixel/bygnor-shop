import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductDetail } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { ProductImage } from "../product-image";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getProductDetail(id);

  if (!result) {
    notFound();
  }

  const { product, siblings } = result;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/shop/katalog"
        className="mb-4 inline-block text-xs text-slate-400 hover:text-[#185FA5]"
      >
        ← Tilbage til katalog
      </Link>

      <div className="grid gap-8 md:grid-cols-2">
        <ProductImage
          imageUrl={product.imageUrl}
          alt={product.name}
          className="aspect-square rounded-xl border border-slate-200"
          sizes="(max-width: 768px) 100vw, 480px"
        />

        <div>
          <p className="text-xs text-slate-400">
            {product.categoryName}
            {product.productGroupName ? ` / ${product.productGroupName}` : ""}
          </p>
          <h1 className="mt-1 mb-1 text-xl font-semibold text-slate-900">
            {product.name}
          </h1>
          <p className="mb-4 text-sm text-slate-500">
            Varenr. {product.sku}
          </p>

          {product.description && (
            <p className="mb-4 text-sm text-slate-600">
              {product.description}
            </p>
          )}

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <span
              className={
                product.basePrice == null
                  ? "text-sm text-slate-400 italic"
                  : "text-lg font-semibold text-slate-900"
              }
            >
              {formatPrice(product.basePrice)}
            </span>
            {/* Reserveret plads til "Læg i kurv"-knap — tilføjes i Fase 4 */}
          </div>
        </div>
      </div>

      {siblings.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-3 text-sm font-medium text-slate-500">
            Andre varianter i {product.productGroupName}
          </h2>
          <div className="flex flex-wrap gap-2">
            {siblings.map((sibling) => (
              <Link
                key={sibling.id}
                href={`/shop/katalog/${sibling.id}`}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-[#185FA5] hover:text-[#185FA5]"
              >
                {sibling.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
