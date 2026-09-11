"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ProductGroupMember } from "@/lib/catalog";
import { formatPrice, displayName, buildQuoteRequestMailto } from "@/lib/format";
import { ProductImage } from "../../product-image";
import { AddToCartForm } from "./add-to-cart-form";

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#185FA5] focus:ring-2 focus:ring-[#185FA5]/20";

export function GroupVariantView({
  groupName,
  categoryName,
  members,
  initialSelectedId,
  salesEmail,
}: {
  groupName: string;
  categoryName: string;
  members: ProductGroupMember[];
  initialSelectedId: string;
  salesEmail: string | null;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const selected = members.find((m) => m.id === selectedId) ?? members[0];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/shop/katalog"
        className="mb-4 inline-block text-xs text-slate-400 hover:text-[#185FA5]"
      >
        ← Tilbage til katalog
      </Link>

      <div className="grid gap-8 md:grid-cols-2">
        <ProductImage
          imageUrl={selected.imageUrl}
          alt={displayName(selected)}
          className="aspect-square rounded-xl border border-slate-200"
          sizes="(max-width: 768px) 100vw, 480px"
        />

        <div>
          <p className="text-xs text-slate-400">{categoryName}</p>
          <h1 className="mt-1 mb-1 text-xl font-semibold text-slate-900">
            {groupName}
          </h1>
          {selected.catalogPage != null && (
            <p className="mb-3 text-xs text-slate-400">
              Katalogside {selected.catalogPage}
            </p>
          )}

          {members.length > 1 && (
            <div className="mb-4">
              <label
                htmlFor="variant"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Vælg variant
              </label>
              <select
                id="variant"
                value={selectedId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setSelectedId(nextId);
                  router.replace(`/shop/katalog/${nextId}`, { scroll: false });
                }}
                className={inputClass}
              >
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {displayName(member)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <p className="mb-1 text-sm text-slate-500">
            Varenr. {selected.sku}
            {selected.vendorName ? ` · Leverandør: ${selected.vendorName}` : ""}
          </p>
          <p className="mb-4 text-sm text-slate-500">
            {selected.stockStatus.replace(/_/g, " ")}
          </p>

          {selected.description && (
            <p className="mb-4 text-sm text-slate-600">{selected.description}</p>
          )}

          {selected.priceOnRequest ? (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-sm text-slate-500">Pris efter forespørgsel</span>
              {salesEmail ? (
                <a
                  href={buildQuoteRequestMailto(salesEmail, selected.sku, displayName(selected))}
                  className="rounded-md bg-[#185FA5] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#144e88]"
                >
                  Kontakt os for tilbud
                </a>
              ) : (
                <span className="text-sm text-slate-400 italic">
                  Kontakt Bygnor for tilbud
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <span
                className={
                  selected.basePrice == null
                    ? "text-sm text-slate-400 italic"
                    : "text-lg font-semibold text-slate-900"
                }
              >
                {formatPrice(selected.basePrice)}
              </span>
              <AddToCartForm key={selected.id} productId={selected.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
