"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createCustomer, type CreateCustomerState } from "./actions";
import type { DiscountGroup } from "@/lib/discount-groups";

const initialState: CreateCustomerState = { error: null, success: false };

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#185FA5] focus:ring-2 focus:ring-[#185FA5]/20";
const labelClass = "mb-1 block text-sm font-medium text-slate-700";

const ERROR_MESSAGES: Record<string, string> = {
  validation_error: "Udfyld alle påkrævede felter korrekt.",
  cvr_invalid: "CVR-nummeret kunne ikke verificeres.",
  email_taken: "Der findes allerede en bruger med denne email.",
  rate_limited:
    "Supabase har midlertidigt stoppet for flere invitations-mails (kvote nået). Vent et par minutter og prøv igen.",
  server_error: "Der opstod en fejl. Prøv igen.",
};

export function NewCustomerForm({
  discountGroups,
}: {
  discountGroups: DiscountGroup[];
}) {
  const [state, formAction, isPending] = useActionState(
    createCustomer,
    initialState,
  );
  const [paymentMethod, setPaymentMethod] = useState<"kort" | "kredit">(
    "kort",
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Succes og fejl kommer fra samme state-objekt, sat af det seneste
  // dispatch — de kan derfor aldrig begge være "sande" fra to forskellige
  // forsøg på samme tid. Ved succes ryddes formularen, så admin kan
  // oprette endnu en kunde uden at forlade siden.
  //
  // Justerer paymentMethod under selve render (Reacts anbefalede mønster
  // for at reagere på ændret state uden en effekt) — kun den imperative
  // DOM-reset af de ukontrollerede felter ligger i en effekt.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) {
      setPaymentMethod("kort");
    }
  }

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="max-w-xl space-y-6">
      {state.success && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          Kunden er oprettet, og invitationsmailen er sendt.
        </div>
      )}

      {state.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {ERROR_MESSAGES[state.error] ?? ERROR_MESSAGES.server_error}
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Virksomhed</h2>

        <div>
          <label htmlFor="companyName" className={labelClass}>
            Firmanavn
          </label>
          <input
            id="companyName"
            name="companyName"
            type="text"
            required
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="cvrNumber" className={labelClass}>
            CVR-nummer
          </label>
          <input
            id="cvrNumber"
            name="cvrNumber"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{8}"
            title="8 cifre"
            required
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="contactName" className={labelClass}>
            Kontaktperson
          </label>
          <input
            id="contactName"
            name="contactName"
            type="text"
            required
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="phone" className={labelClass}>
            Telefon
          </label>
          <input id="phone" name="phone" type="tel" className={inputClass} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Leveringsadresse
        </h2>

        <div>
          <label htmlFor="streetAddress" className={labelClass}>
            Adresse
          </label>
          <input
            id="streetAddress"
            name="streetAddress"
            type="text"
            required
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="postalCode" className={labelClass}>
              Postnummer
            </label>
            <input
              id="postalCode"
              name="postalCode"
              type="text"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="city" className={labelClass}>
              By
            </label>
            <input
              id="city"
              name="city"
              type="text"
              required
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="country" className={labelClass}>
            Land
          </label>
          <input
            id="country"
            name="country"
            type="text"
            required
            className={inputClass}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Betaling og rabat
        </h2>

        <div>
          <span className={labelClass}>Betalingsmetode</span>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="paymentMethod"
                value="kort"
                checked={paymentMethod === "kort"}
                onChange={() => setPaymentMethod("kort")}
              />
              Kort
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="paymentMethod"
                value="kredit"
                checked={paymentMethod === "kredit"}
                onChange={() => setPaymentMethod("kredit")}
              />
              Kredit
            </label>
          </div>
        </div>

        <div>
          <label htmlFor="discountGroup" className={labelClass}>
            Rabatgruppe
          </label>
          <select
            id="discountGroup"
            name="discountGroup"
            defaultValue="standard"
            className={inputClass}
          >
            {discountGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name} ({group.discountPercent}%)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="individualDiscount" className={labelClass}>
            Individuel rabat (%)
          </label>
          <input
            id="individualDiscount"
            name="individualDiscount"
            type="number"
            min="0"
            max="100"
            step="0.01"
            className={inputClass}
          />
        </div>

        {paymentMethod === "kredit" && (
          <div className="grid grid-cols-2 gap-4 rounded-md border border-slate-200 bg-slate-50 p-4">
            <div>
              <label htmlFor="creditLimit" className={labelClass}>
                Kreditgrænse (DKK)
              </label>
              <input
                id="creditLimit"
                name="creditLimit"
                type="number"
                min="0"
                step="0.01"
                required
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="paymentTermsDays" className={labelClass}>
                Betalingsfrist (dage)
              </label>
              <input
                id="paymentTermsDays"
                name="paymentTermsDays"
                type="number"
                min="0"
                step="1"
                required
                className={inputClass}
              />
            </div>
          </div>
        )}
      </section>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-[#5A9D3C] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d8632] focus:outline-none focus:ring-2 focus:ring-[#5A9D3C]/40 disabled:opacity-60 sm:w-auto"
      >
        Opret kunde
      </button>
    </form>
  );
}
