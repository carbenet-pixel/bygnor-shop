import Link from "next/link";
import { listCampaignCodesAdmin } from "@/lib/campaign-codes";
import { formatPrice, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const cellClass = "px-4 py-3 align-middle";

function statusFor(code: { isActive: boolean; startDate: string; endDate: string }) {
  const now = new Date();
  if (!code.isActive) {
    return { label: "Inaktiv", className: "bg-slate-100 text-slate-500" };
  }
  if (now > new Date(code.endDate)) {
    return { label: "Udløbet", className: "bg-slate-100 text-slate-500" };
  }
  if (now < new Date(code.startDate)) {
    return { label: "Kommer", className: "bg-amber-100 text-amber-700" };
  }
  return { label: "Aktiv", className: "bg-emerald-100 text-emerald-700" };
}

export default async function CampaignCodesPage() {
  const codes = await listCampaignCodesAdmin();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-xl font-semibold text-slate-900">
            Kampagnekoder
          </h1>
          <p className="text-sm text-slate-500">
            {codes.length} {codes.length === 1 ? "kode" : "koder"}
          </p>
        </div>
        <Link
          href="/admin/campaign-codes/new"
          className="rounded-md bg-[#5A9D3C] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d8632]"
        >
          Opret kampagnekode
        </Link>
      </div>

      {codes.length === 0 ? (
        <p className="text-sm text-slate-500">Ingen kampagnekoder endnu.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
              <tr>
                <th className={cellClass}>Kode</th>
                <th className={cellClass}>Status</th>
                <th className={cellClass}>Leverandør</th>
                <th className={cellClass}>Rabat</th>
                <th className={cellClass}>Periode</th>
                <th className={cellClass}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {codes.map((code) => {
                const status = statusFor(code);
                return (
                  <tr key={code.id}>
                    <td className={`${cellClass} font-medium text-slate-900`}>
                      {code.code}
                    </td>
                    <td className={cellClass}>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className={`${cellClass} text-slate-500`}>
                      {code.vendorName ?? "Alle leverandører"}
                    </td>
                    <td className={cellClass}>
                      {code.discountType === "percent"
                        ? `${code.discountValue}%`
                        : formatPrice(code.discountValue)}
                    </td>
                    <td className={`${cellClass} text-slate-500`}>
                      {formatDate(code.startDate)} – {formatDate(code.endDate)}
                    </td>
                    <td className={cellClass}>
                      <Link
                        href={`/admin/campaign-codes/${code.id}`}
                        className="text-xs font-medium text-[#185FA5] hover:underline"
                      >
                        Rediger
                      </Link>
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
