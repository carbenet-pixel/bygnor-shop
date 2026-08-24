"use client";

import { useState } from "react";

const selectClass =
  "rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900 outline-none focus:border-[#185FA5] focus:ring-2 focus:ring-[#185FA5]/20";
const smallInputClass =
  "w-24 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-900 outline-none focus:border-[#185FA5] focus:ring-2 focus:ring-[#185FA5]/20";

export function PaymentFields({
  formId,
  paymentMethod,
  creditLimit,
  paymentTermsDays,
}: {
  formId: string;
  paymentMethod: string | null;
  creditLimit: number | null;
  paymentTermsDays: number | null;
}) {
  const [method, setMethod] = useState<"kort" | "kredit">(
    paymentMethod === "kredit" ? "kredit" : "kort",
  );

  return (
    <div className="flex flex-col gap-1">
      <select
        form={formId}
        name="paymentMethod"
        value={method}
        onChange={(event) =>
          setMethod(event.target.value === "kredit" ? "kredit" : "kort")
        }
        className={selectClass}
      >
        <option value="kort">Kort</option>
        <option value="kredit">Kredit</option>
      </select>

      {method === "kredit" && (
        <div className="flex items-center gap-1">
          <input
            form={formId}
            type="number"
            name="creditLimit"
            min="0"
            step="0.01"
            placeholder="Kreditgrænse"
            defaultValue={creditLimit ?? ""}
            className={smallInputClass}
          />
          <input
            form={formId}
            type="number"
            name="paymentTermsDays"
            min="0"
            step="1"
            placeholder="Dage"
            defaultValue={paymentTermsDays ?? ""}
            className={smallInputClass}
          />
        </div>
      )}
    </div>
  );
}
