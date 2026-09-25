"use client";

import { createContext, useContext, useState, useTransition } from "react";
import { formatVatBreakdownLines, type VatBreakdownLine } from "@/lib/format";
import { previewVat } from "./vat-preview-action";

type VatPreviewContextValue = {
  lines: VatBreakdownLine[];
  isPending: boolean;
  setEffectiveCountry: (country: string) => void;
};

const VatPreviewContext = createContext<VatPreviewContextValue | null>(null);

/**
 * Ejer den momsopstilling der vises i kurven, sådan at DeliveryAddressFields
 * (et søskende-element til selve visningen, ikke en forælder/barn-relation)
 * kan udløse en genberegning — en Server Component kan ikke sende en
 * funktion ned som prop (samme begrænsning som beskrevet i
 * checkout-section.tsx), så context er mekanismen, ikke et valg.
 * initialLines kommer fra serverens egen beregning ved page load, så
 * første visning virker uden at vente på denne komponents effekt.
 */
export function VatPreviewProvider({
  subtotal,
  initialLines,
  children,
}: {
  subtotal: number;
  initialLines: VatBreakdownLine[];
  children: React.ReactNode;
}) {
  const [lines, setLines] = useState(initialLines);
  const [isPending, startTransition] = useTransition();

  const setEffectiveCountry = (country: string) => {
    startTransition(async () => {
      const result = await previewVat(country, subtotal);
      setLines(formatVatBreakdownLines(result));
    });
  };

  return (
    <VatPreviewContext.Provider value={{ lines, isPending, setEffectiveCountry }}>
      {children}
    </VatPreviewContext.Provider>
  );
}

export function useVatPreview() {
  const ctx = useContext(VatPreviewContext);
  if (!ctx) {
    throw new Error("useVatPreview skal bruges inden i VatPreviewProvider");
  }
  return ctx;
}

/** Erstatter den tidligere inline formatVatBreakdownLines(...).map(...) i page.tsx. */
export function VatLines() {
  const { lines, isPending } = useVatPreview();

  return (
    <div className={`flex flex-col items-end ${isPending ? "opacity-60 transition-opacity" : ""}`}>
      {lines.map((line) => (
        <p
          key={line.label}
          className={
            line.emphasis ? "text-lg font-semibold text-foreground" : "text-sm text-slate-500"
          }
        >
          {line.label}: {line.value}
        </p>
      ))}
    </div>
  );
}
