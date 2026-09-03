import { listCategoriesAdmin } from "@/lib/categories";
import { NewProductGroupForm } from "./new-group-form";

export const dynamic = "force-dynamic";

export default async function NewProductGroupPage() {
  const categories = await listCategoriesAdmin();

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">
        Opret produktgruppe
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        Kun synlig for superadmin.
      </p>

      <NewProductGroupForm categories={categories} />
    </div>
  );
}
