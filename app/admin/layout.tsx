import Image from "next/image";
import Link from "next/link";

const navItems = [
  { href: "/admin/customers", label: "Kunder" },
  { href: "/admin/customers/new", label: "Opret kunde" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-56 shrink-0 border-r border-slate-200 bg-white px-4 py-6">
        <div className="mb-8 flex justify-center">
          <Image
            src="/images/bygnor-logo.png"
            alt="Bygnor"
            width={140}
            height={27}
            priority
          />
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/shop"
          className="mt-8 block text-xs text-slate-400 hover:text-[#185FA5]"
        >
          ← Til shop
        </Link>
      </aside>

      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
