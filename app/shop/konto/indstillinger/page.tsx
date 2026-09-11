import { getOwnAccountInfo } from "@/lib/account";
import { createClient } from "@/lib/supabase/server";
import { ChangePasswordForm } from "./change-password-form";
import { resetOwnMfaAction } from "./actions";

export const dynamic = "force-dynamic";

const labelClass = "mb-1 block text-sm font-medium text-slate-700";

export default async function KontoIndstillingerPage() {
  const account = await getOwnAccountInfo();

  if (!account) {
    return (
      <p className="text-sm text-slate-500">Kunne ikke hente kontooplysninger.</p>
    );
  }

  const supabase = await createClient();
  const { data: factorsData } = await supabase.auth.mfa.listFactors();
  const mfaEnabled = (factorsData?.totp.length ?? 0) > 0;

  return (
    <div className="max-w-xl space-y-6">
      <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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
          <p className="text-sm text-slate-900">
            {account.externalCustomerNumber ?? "—"}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Kodeord</h2>
        <ChangePasswordForm />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">
          To-faktor login (2FA)
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          Status:{" "}
          {mfaEnabled ? (
            <span className="font-medium text-green-700">Aktiveret</span>
          ) : (
            <span className="font-medium text-slate-500">Ikke aktiveret</span>
          )}
        </p>

        <form action={resetOwnMfaAction}>
          <button
            type="submit"
            className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50"
          >
            Nulstil 2FA
          </button>
        </form>
        <p className="mt-2 text-xs text-slate-400">
          Du bliver sendt gennem opsætning af en ny 2FA-metode med det samme.
        </p>
      </div>
    </div>
  );
}
