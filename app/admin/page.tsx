import Link from "next/link";

export default function AdminPage() {
  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-foreground">Admin</h1>
      <p className="mb-6 text-sm text-slate-500">
        Velkommen til Bygnors admin-panel.
      </p>

      <div className="grid max-w-xl gap-4 sm:grid-cols-2">
        <Link
          href="/admin/customers/new"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-bygnor-blue"
        >
          <h2 className="mb-1 text-sm font-semibold text-foreground">
            Opret kunde
          </h2>
          <p className="text-xs text-slate-500">
            Opret en kundekonto manuelt med CVR-verifikation.
          </p>
        </Link>

        <Link
          href="/admin/customers"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-bygnor-blue"
        >
          <h2 className="mb-1 text-sm font-semibold text-foreground">
            Kunder
          </h2>
          <p className="text-xs text-slate-500">
            Se og administrer eksisterende kunder.
          </p>
        </Link>
      </div>
    </div>
  );
}
