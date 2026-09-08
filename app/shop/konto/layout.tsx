import Link from "next/link";
import { KontoTabs } from "./konto-tabs";

export default function KontoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link
        href="/shop/katalog"
        className="mb-4 inline-block text-xs text-slate-400 hover:text-[#185FA5]"
      >
        ← Tilbage til katalog
      </Link>

      <h1 className="mb-6 text-xl font-semibold text-slate-900">Min konto</h1>

      <KontoTabs />

      {children}
    </div>
  );
}
