"use client";

import { useActionState, useEffect, useRef } from "react";
import { uploadProductImageAction, type UploadImageState } from "../actions";
import { ProductImage } from "@/app/shop/product-image";

const initialState: UploadImageState = { error: null, success: false };

export function ProductImageUploadForm({
  productId,
  sku,
  imageUrl,
}: {
  productId: string;
  sku: string;
  imageUrl: string | null;
}) {
  const [state, formAction, isPending] = useActionState(
    uploadProductImageAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">Billede</h3>

      <div className="mb-4 flex items-center gap-4">
        <ProductImage
          imageUrl={imageUrl}
          alt={sku}
          className="h-24 w-24 rounded-lg"
          sizes="96px"
        />
        <p className="text-xs text-slate-400">
          Uploades som {sku}.jpg — konverteres automatisk til RGB, max 1600px,
          kvalitet 85.
        </p>
      </div>

      {state.success && (
        <div className="mb-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          Billedet er opdateret.
        </div>
      )}
      {state.error && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <form ref={formRef} action={formAction} className="flex items-center gap-3">
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="sku" value={sku} />
        <input
          type="file"
          name="image"
          accept="image/*"
          className="text-sm text-slate-600"
        />
        <button
          type="submit"
          disabled={isPending}
          className="shrink-0 rounded-md bg-[#5A9D3C] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#4d8632] disabled:opacity-60"
        >
          Upload billede
        </button>
      </form>
    </div>
  );
}
