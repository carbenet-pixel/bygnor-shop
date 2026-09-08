"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/shop/konto/ordrer", label: "Ordrer" },
  { href: "/shop/konto/indstillinger", label: "Indstillinger" },
];

export function KontoTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-6 flex gap-1 border-b border-slate-200">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? "border-[#185FA5] text-[#185FA5]"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
