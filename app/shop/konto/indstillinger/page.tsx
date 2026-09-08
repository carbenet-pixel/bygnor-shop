import { getOwnAccountInfo } from "@/lib/account";

export const dynamic = "force-dynamic";

const labelClass = "mb-1 block text-sm font-medium text-slate-700";

export default async function KontoIndstillingerPage() {
  const account = await getOwnAccountInfo();

  if (!account) {
    return (
      <p className="text-sm text-slate-500">Kunne ikke hente kontooplysninger.</p>
    );
  }

  return (
    <div className="max-w-xl space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <span className={labelClass}>Firma</span>
        <p className="text-sm text-slate-900">{account.companyName ?? "—"}</p>
      </div>

      <div>
        <span className={labelClass}>Email</span>
        <p className="text-sm text-slate-900">{account.email ?? "—"}</p>
      </div>

      <div>
        <span className={labelClass}>Rabat</span>
        <p className="text-sm text-slate-900">{account.discount.label}</p>
      </div>

      <div>
        <span className={labelClass}>Eksternt kundenummer</span>
        <p className="text-sm text-slate-900">{account.externalCustomerNumber ?? "—"}</p>
      </div>
    </div>
  );
}
