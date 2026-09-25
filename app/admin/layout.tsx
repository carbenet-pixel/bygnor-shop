import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/supabase/get-user-role";
import { logout } from "@/lib/supabase/actions";
import { Footer } from "@/components/footer";
import { Logo } from "@/components/logo";

export const metadata = { title: "Admin" };

const navItems = [
  { href: "/admin/orders", label: "Ordrer" },
  { href: "/admin/customers", label: "Kunder" },
  { href: "/admin/customers/new", label: "Opret kunde" },
  { href: "/admin/products", label: "Produkter" },
  { href: "/admin/campaign-codes", label: "Kampagnekoder" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = user ? await getUserRole(user.id) : null;

  const items =
    role === "superadmin"
      ? [
          ...navItems,
          { href: "/admin/discount-groups", label: "Rabatgrupper" },
          { href: "/admin/categories", label: "Kategorier" },
          { href: "/admin/product-groups", label: "Produktgrupper" },
          { href: "/admin/users", label: "Brugere" },
          { href: "/admin/vat-rules", label: "Momsregler" },
        ]
      : navItems;

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <div className="flex flex-1">
        <aside className="w-56 shrink-0 border-r border-slate-200 bg-white px-4 py-6">
          <div className="mb-8 flex justify-center">
            <Logo className="text-xl" />
          </div>

          <nav className="space-y-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/shop"
            className="mt-8 block text-xs text-slate-400 hover:text-bygnor-blue"
          >
            ← Til shop
          </Link>

          <form action={logout} className="mt-2">
            <button
              type="submit"
              className="text-xs text-slate-400 hover:text-bygnor-blue"
            >
              Log ud
            </button>
          </form>
        </aside>

        <main className="flex-1 p-8">{children}</main>
      </div>

      <Footer />
    </div>
  );
}
