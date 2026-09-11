import Link from "next/link";
import { notFound } from "next/navigation";
import { getCampaignCodeAdmin } from "@/lib/campaign-codes";
import { listVendors } from "@/lib/vendors";
import { DISCOUNT_TYPE_OPTIONS } from "@/lib/campaign-code-constants";
import { SaveButton } from "@/components/save-button";
import { updateCampaignCodeAction } from "../actions";

export const dynamic = "force-dynamic";

const labelClass = "mb-1 block text-sm font-medium text-slate-700";
const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#185FA5] focus:ring-2 focus:ring-[#185FA5]/20";

// datetime-local kræver "YYYY-MM-DDTHH:mm" uden tidszone. Serveren kører i
// UTC (Vercel) — start-/slutdato tolkes derfor i UTC, både ved visning her
// og ved gemning i lib/campaign-codes.ts. Ingen tidszone-konvertering til
// admins egen lokale tid er bygget ind i denne omgang.
function toDatetimeLocalValue(iso: string): string {
  return iso.slice(0, 16);
}

export default async function CampaignCodeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [campaignCode, vendors] = await Promise.all([
    getCampaignCodeAdmin(id),
    listVendors(),
  ]);

  if (!campaignCode) {
    notFound();
  }

  const formId = `campaign-code-${campaignCode.id}`;

  return (
    <div>
      <Link
        href="/admin/campaign-codes"
        className="mb-4 inline-block text-xs text-slate-400 hover:text-[#185FA5]"
      >
        ← Tilbage til kampagnekoder
      </Link>

      <h1 className="mb-6 text-xl font-semibold text-slate-900">
        {campaignCode.code}
      </h1>

      <form id={formId} action={updateCampaignCodeAction}>
        <input type="hidden" name="campaignCodeId" value={campaignCode.id} />
      </form>

      <div className="max-w-xl space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label htmlFor="code" className={labelClass}>
            Kode
          </label>
          <input
            form={formId}
            id="code"
            name="code"
            required
            defaultValue={campaignCode.code}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="vendorId" className={labelClass}>
            Leverandør (valgfri — tom betyder alle)
          </label>
          <select
            form={formId}
            id="vendorId"
            name="vendorId"
            defaultValue={campaignCode.vendorId ?? ""}
            className={inputClass}
          >
            <option value="">Alle leverandører</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="discountType" className={labelClass}>
              Rabattype
            </label>
            <select
              form={formId}
              id="discountType"
              name="discountType"
              defaultValue={campaignCode.discountType}
              className={inputClass}
            >
              {DISCOUNT_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {type === "percent" ? "Procent" : "Fast beløb (kr)"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="discountValue" className={labelClass}>
              Rabatværdi
            </label>
            <input
              form={formId}
              id="discountValue"
              name="discountValue"
              type="number"
              min="0"
              step="0.01"
              required
              defaultValue={campaignCode.discountValue}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className={labelClass}>
              Startdato
            </label>
            <input
              form={formId}
              id="startDate"
              name="startDate"
              type="datetime-local"
              required
              defaultValue={toDatetimeLocalValue(campaignCode.startDate)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="endDate" className={labelClass}>
              Slutdato
            </label>
            <input
              form={formId}
              id="endDate"
              name="endDate"
              type="datetime-local"
              required
              defaultValue={toDatetimeLocalValue(campaignCode.endDate)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            form={formId}
            id="isActive"
            name="isActive"
            type="checkbox"
            defaultChecked={campaignCode.isActive}
            className="h-4 w-4"
          />
          <label htmlFor="isActive" className="text-sm font-medium text-slate-700">
            Aktiv
          </label>
        </div>

        <SaveButton
          formId={formId}
          action={updateCampaignCodeAction}
          label="Gem ændringer"
          buttonClassName="rounded-md bg-[#5A9D3C] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d8632] disabled:opacity-60"
        />
      </div>
    </div>
  );
}
