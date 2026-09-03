import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/supabase/get-user-role";
import { getCategoryOverview } from "@/lib/catalog";
import { logout } from "@/lib/supabase/actions";
import { ProductImage } from "./product-image";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [role, categories] = await Promise.all([
    getUserRole(user.id),
    getCategoryOverview(),
  ]);
  const isAdmin = role === "admin" || role === "superadmin";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <Image
            src="/images/bygnor-logo.png"
            alt="Bygnor"
            width={180}
            height={34}
            priority
          />
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>
              Email: {user.email} · Rolle: {role ?? "ukendt"}
            </span>
            {isAdmin && (
              <Link href="/admin" className="font-medium hover:text-[#185FA5]">
                Admin →
              </Link>
            )}
            <form action={logout}>
              <button type="submit" className="hover:text-[#185FA5]">
                Log ud
              </button>
            </form>
          </div>
        </div>

        <h1 className="mb-1 text-xl font-semibold text-slate-900">
          Afdelinger
        </h1>
        <p className="mb-6 text-sm text-slate-500">
          Vælg en afdeling for at se produkterne.
        </p>

        <form
          action="/shop/katalog"
          method="GET"
          className="mb-6 flex max-w-sm gap-2"
        >
          <input
            type="search"
            name="q"
            placeholder="Søg på navn eller varenummer…"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#185FA5] focus:ring-2 focus:ring-[#185FA5]/20"
          />
          <button
            type="submit"
            className="shrink-0 rounded-md bg-[#185FA5] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#144e88]"
          >
            Søg
          </button>
        </form>

        {categories.length === 0 ? (
          <p className="text-sm text-slate-500">Ingen afdelinger endnu.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/shop/katalog?avdeling=${category.id}`}
                className="group block rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
              >
                <ProductImage
                  imageUrl={category.imageUrl}
                  alt={category.name}
                  className="aspect-square rounded-lg"
                  sizes="(max-width: 640px) 45vw, 220px"
                />
                <p className="mt-3 text-center text-sm font-medium text-slate-900 group-hover:text-[#185FA5]">
                  {category.name}
                </p>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-8">
          <Link
            href="/shop/katalog"
            className="text-sm text-slate-500 underline underline-offset-2 hover:text-[#185FA5]"
          >
            Se hele kataloget →
          </Link>
        </div>
      </div>
    </div>
  );
}
