"use client";

import { useState } from "react";

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#185FA5] focus:ring-2 focus:ring-[#185FA5]/20";

export type DefaultAddress = {
  contactName: string | null;
  streetAddress: string;
  label: string | null;
  postalCode: string | null;
  city: string | null;
  country: string;
} | null;

/**
 * Én fælles adresse-sektion der fodrer to forskellige formularer (kort- og
 * faktura-checkout) via skjulte, spejlede felter med `form`-attributten —
 * en almindelig <input> kan kun pege på ét form-id ad gangen, så de synlige,
 * redigerbare felter holdes i React-state her og spejles ind i begge.
 */
export function DeliveryAddressFields({
  defaultAddress,
  targetFormIds,
}: {
  defaultAddress: DefaultAddress;
  targetFormIds: string[];
}) {
  const [useAlternative, setUseAlternative] = useState(false);
  const [recipientName, setRecipientName] = useState(defaultAddress?.contactName ?? "");
  const [addressLine1, setAddressLine1] = useState(defaultAddress?.streetAddress ?? "");
  const [addressLine2, setAddressLine2] = useState(defaultAddress?.label ?? "");
  const [postalCode, setPostalCode] = useState(defaultAddress?.postalCode ?? "");
  const [city, setCity] = useState(defaultAddress?.city ?? "");
  const [country, setCountry] = useState(defaultAddress?.country ?? "");

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">
        Leveringsadresse
      </h2>

      {defaultAddress ? (
        <div className="mb-3 text-sm text-slate-600">
          <p>{defaultAddress.contactName ?? "—"}</p>
          <p>{defaultAddress.streetAddress}</p>
          {defaultAddress.label && <p>{defaultAddress.label}</p>}
          <p>
            {defaultAddress.postalCode} {defaultAddress.city}
          </p>
          <p>{defaultAddress.country}</p>
        </div>
      ) : (
        <p className="mb-3 text-sm text-amber-600">
          Ingen standardadresse fundet på din konto — angiv en leveringsadresse nedenfor.
        </p>
      )}

      <label className="mb-3 flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={useAlternative || !defaultAddress}
          disabled={!defaultAddress}
          onChange={(e) => setUseAlternative(e.target.checked)}
          className="h-4 w-4"
        />
        Lever til en anden adresse denne gang
      </label>

      {(useAlternative || !defaultAddress) && (
        <div className="grid grid-cols-2 gap-3">
          <input
            className={`${inputClass} col-span-2`}
            placeholder="Modtagernavn"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
          />
          <input
            className={`${inputClass} col-span-2`}
            placeholder="Adresselinje 1"
            value={addressLine1}
            onChange={(e) => setAddressLine1(e.target.value)}
          />
          <input
            className={`${inputClass} col-span-2`}
            placeholder="Adresselinje 2 (valgfri)"
            value={addressLine2}
            onChange={(e) => setAddressLine2(e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="Postnr"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="By"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          <input
            className={`${inputClass} col-span-2`}
            placeholder="Land"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />
        </div>
      )}

      {targetFormIds.map((formId) => (
        <span key={formId}>
          <input
            type="hidden"
            form={formId}
            name="useAlternativeAddress"
            value={useAlternative || !defaultAddress ? "on" : ""}
          />
          {(useAlternative || !defaultAddress) && (
            <>
              <input type="hidden" form={formId} name="altRecipientName" value={recipientName} />
              <input type="hidden" form={formId} name="altAddressLine1" value={addressLine1} />
              <input type="hidden" form={formId} name="altAddressLine2" value={addressLine2} />
              <input type="hidden" form={formId} name="altPostalCode" value={postalCode} />
              <input type="hidden" form={formId} name="altCity" value={city} />
              <input type="hidden" form={formId} name="altCountry" value={country} />
            </>
          )}
        </span>
      ))}
    </div>
  );
}
