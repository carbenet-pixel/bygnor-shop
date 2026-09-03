import { listProductGroupsAdmin } from "@/lib/product-groups";
import { listVendors } from "@/lib/vendors";
import { NewProductForm } from "./new-product-form";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const [productGroups, vendors] = await Promise.all([
    listProductGroupsAdmin(),
    listVendors(),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">
        Opret produkt
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        Varenummer (SKU) skal være unikt og kan ikke ændres bagefter.
      </p>

      <NewProductForm productGroups={productGroups} vendors={vendors} />
    </div>
  );
}
