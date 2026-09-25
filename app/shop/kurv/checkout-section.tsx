"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckoutButton } from "./checkout-button";
import { InvoiceCheckoutButton } from "./invoice-checkout-button";
import { PaymentLogos } from "./payment-logos";

/**
 * Ejer accept-tilstanden for BEGGE betalingsveje (kort og faktura) og
 * renderer selv knapperne — en Server Component kan ikke sende en
 * render-prop-funktion ned til en Client Component (ikke serialiserbart
 * på tværs af RSC-grænsen), så hele under-træet der skal reagere på
 * checkboksen ligger samlet her, client-side.
 */
export function CheckoutSection({ invoiceApproved }: { invoiceApproved: boolean }) {
  const [termsAccepted, setTermsAccepted] = useState(false);

  return (
    <div>
      <label className="mb-4 flex items-start gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0"
        />
        <span>
          Ved at gennemføre bestillingen accepterer du vores{" "}
          <Link
            href="/handelsbetingelser"
            target="_blank"
            className="underline hover:text-bygnor-blue"
          >
            handelsbetingelser
          </Link>{" "}
          og{" "}
          <Link
            href="/privatlivspolitik"
            target="_blank"
            className="underline hover:text-bygnor-blue"
          >
            privatlivspolitik
          </Link>
          .
        </span>
      </label>

      <div className="mb-2">
        <PaymentLogos />
      </div>

      <CheckoutButton termsAccepted={termsAccepted} />
      {invoiceApproved ? (
        <InvoiceCheckoutButton termsAccepted={termsAccepted} />
      ) : (
        <p className="mt-2 text-xs text-slate-400">
          Din konto er ikke godkendt til fakturabetaling — kontakt Bygnor
          hvis I ønsker det.
        </p>
      )}
    </div>
  );
}
