import Link from "next/link";
import { listProductsAdmin } from "@/lib/products-admin";
import { formatPrice } from "@/lib/format";
import { ProductImage } from "@/app/shop/product-image";

export const dynamic = "force-dynamic";

const cellClass = "px-4 py-3 align-middle";

export default async function AdminProductsPage() {
  const products = await listProductsAdmin();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-xl font-semibold text-slate-900">
            Produkter
          </h1>
          <p className="text-sm text-slate-500">
            {products.length} {products.length === 1 ? "produkt" : "produkter"}
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="rounded-md bg-[#5A9D3C] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d8632]"
        >
          Opret produkt
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="text-sm text-slate-500">Ingen produkter endnu.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
              <tr>
                <th className={cellClass}>Billede</th>
                <th className={cellClass}>Varenr.</th>
                <th className={cellClass}>Navn</th>
                <th className={cellClass}>Kategori / Gruppe</th>
                <th className={cellClass}>Pris</th>
                <th className={cellClass}>Aktiv</th>
                <th className={cellClass}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className={cellClass}>
                    <ProductImage
                      imageUrl={product.imageUrl}
                      alt={product.name}
                      className="h-12 w-12 rounded-md"
                      sizes="48px"
                    />
                  </td>
                  <td className={`${cellClass} text-slate-500`}>
                    {product.sku}
                  </td>
                  <td className={`${cellClass} font-medium text-slate-900`}>
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="hover:text-[#185FA5] hover:underline"
                    >
                      {product.name}
                    </Link>
                  </td>
                  <td className={`${cellClass} text-slate-500`}>
                    {product.categoryName} / {product.productGroupName}
                  </td>
                  <td className={cellClass}>
                    {product.basePrice == null ? (
                      <span className="text-slate-400 italic">
                        Pris oplyses snarest
                      </span>
                    ) : (
                      formatPrice(product.basePrice)
                    )}
                  </td>
                  <td className={cellClass}>
                    {product.active ? (
                      <span className="text-green-600">Ja</span>
                    ) : (
                      <span className="text-slate-400">Nej</span>
                    )}
                  </td>
                  <td className={cellClass}>
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="text-xs font-medium text-[#185FA5] hover:underline"
                    >
                      Rediger
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
