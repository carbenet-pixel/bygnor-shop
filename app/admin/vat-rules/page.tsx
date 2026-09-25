import { listVatRules } from "@/lib/vat-rules";
import { SaveButton } from "@/components/save-button";
import { updateVatRuleAction } from "./actions";

export const dynamic = "force-dynamic";

const labelClass = "mb-1 block text-xs font-medium text-slate-500";
const inputClass =
  "w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-foreground outline-none focus:border-bygnor-blue focus:ring-2 focus:ring-bygnor-blue/20";

export default async function VatRulesPage() {
  const rules = await listVatRules();

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-foreground">Momsregler</h1>
      <p className="mb-6 max-w-2xl text-sm text-slate-500">
        Kun synlig for superadmin. Satser og fakturatekster er endnu ikke
        bekræftet af revisor — værdierne markeret &quot;AFVENTER
        REVISOR-BEKRÆFTELSE&quot; må ikke bruges som faktisk fakturatekst før
        de er rettet her. Ændringer gælder kun for ordrer oprettet HEREFTER —
        allerede oprettede ordrer beholder deres eget snapshot.
      </p>

      <div className="max-w-2xl space-y-4">
        {rules.map((rule) => {
          const formId = `vat-rule-${rule.destinationCountry}`;
          const isPlaceholder = rule.invoiceNote.includes("AFVENTER REVISOR");
          return (
            <div
              key={rule.destinationCountry}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {rule.destinationCountry}
                  </p>
                  <p className="text-xs text-slate-400">{rule.vatType}</p>
                </div>
                {isPlaceholder && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    Afventer revisor
                  </span>
                )}
              </div>

              <form id={formId} action={updateVatRuleAction} className="space-y-3">
                <input
                  type="hidden"
                  name="destinationCountry"
                  value={rule.destinationCountry}
                />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Momssats (%)</label>
                    <input
                      name="vatRate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      defaultValue={rule.vatRate}
                      className={inputClass}
                    />
                  </div>
                  <div className="flex items-end gap-2 pb-1">
                    <input
                      id={`${formId}-active`}
                      name="isActive"
                      type="checkbox"
                      defaultChecked={rule.isActive}
                      className="h-4 w-4"
                    />
                    <label htmlFor={`${formId}-active`} className="text-sm text-slate-700">
                      Aktiv
                    </label>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>
                    Fakturatekst (invoice_note)
                  </label>
                  <textarea
                    name="invoiceNote"
                    rows={2}
                    defaultValue={rule.invoiceNote}
                    className={inputClass}
                  />
                </div>

                <SaveButton formId={formId} action={updateVatRuleAction} />
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
