import { NewCategoryForm } from "./new-category-form";

export const dynamic = "force-dynamic";

export default function NewCategoryPage() {
  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">
        Opret kategori
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        Slug genereres automatisk fra navnet, men kan redigeres.
      </p>

      <NewCategoryForm />
    </div>
  );
}
