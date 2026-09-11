import { listVendors } from "@/lib/vendors";
import { NewCampaignCodeForm } from "./new-campaign-code-form";

export const dynamic = "force-dynamic";

export default async function NewCampaignCodePage() {
  const vendors = await listVendors();

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">
        Opret kampagnekode
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        Vælg ingen leverandør for en kode der gælder alle leverandører.
      </p>

      <NewCampaignCodeForm vendors={vendors} />
    </div>
  );
}
