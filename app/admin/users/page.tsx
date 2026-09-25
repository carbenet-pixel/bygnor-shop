import { listAdminUsers } from "@/lib/users-admin";
import { getUserMfaEnabled } from "@/lib/mfa-admin";
import { formatDate } from "@/lib/format";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { resetUserMfaAction } from "./actions";

export const dynamic = "force-dynamic";

const cellClass = "px-4 py-3 align-middle";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  superadmin: "Superadmin",
};

export default async function AdminUsersPage() {
  const users = await listAdminUsers();
  const withMfaStatus = await Promise.all(
    users.map(async (u) => ({ ...u, mfaEnabled: await getUserMfaEnabled(u.id) })),
  );

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-foreground">Brugere</h1>
      <p className="mb-6 text-sm text-slate-500">
        Interne brugere (admin/superadmin) — kun synlig for superadmin.{" "}
        {users.length} {users.length === 1 ? "bruger" : "brugere"}.
      </p>

      {withMfaStatus.length === 0 ? (
        <p className="text-sm text-slate-500">Ingen interne brugere fundet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
              <tr>
                <th className={cellClass}>Navn</th>
                <th className={cellClass}>Email</th>
                <th className={cellClass}>Rolle</th>
                <th className={cellClass}>Oprettet</th>
                <th className={cellClass}>2FA</th>
                <th className={cellClass}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {withMfaStatus.map((u) => {
                const formId = `reset-mfa-${u.id}`;
                return (
                  <tr key={u.id}>
                    <td className={`${cellClass} font-medium text-foreground`}>
                      {u.fullName ?? "—"}
                    </td>
                    <td className={`${cellClass} text-slate-500`}>{u.email ?? "—"}</td>
                    <td className={cellClass}>{ROLE_LABELS[u.role] ?? u.role}</td>
                    <td className={`${cellClass} text-slate-500`}>
                      {formatDate(u.createdAt)}
                    </td>
                    <td className={cellClass}>
                      {u.mfaEnabled ? (
                        <span className="font-medium text-green-700">Aktiveret</span>
                      ) : (
                        <span className="font-medium text-slate-500">Ikke aktiveret</span>
                      )}
                    </td>
                    <td className={cellClass}>
                      <form id={formId} action={resetUserMfaAction}>
                        <input type="hidden" name="userId" value={u.id} />
                      </form>
                      <ConfirmSubmitButton
                        formId={formId}
                        confirmMessage={`Er du sikker på at nulstille 2FA for ${u.fullName ?? u.email ?? "denne bruger"}? Brugeren bliver logget ud og skal opsætte 2FA forfra ved næste login.`}
                        className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50"
                      >
                        Nulstil 2FA
                      </ConfirmSubmitButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
