import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/supabase/get-user-role";
import { logout } from "@/lib/supabase/actions";

export default async function ShopPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = await getUserRole(user.id);
  const isAdmin = role === "admin" || role === "superadmin";

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="absolute top-4 right-4 flex items-center gap-3 text-xs text-slate-400">
        <span>
          Email: {user.email} · Rolle: {role ?? "ukendt"}
        </span>
        {isAdmin && (
          <Link href="/admin" className="font-medium hover:text-[#185FA5]">
            Admin →
          </Link>
        )}
      </div>

      <div className="w-full max-w-sm text-center">
        <div className="mb-4 flex justify-center">
          <Image
            src="/images/bygnor-logo.png"
            alt="Bygnor"
            width={220}
            height={42}
            priority
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-xl font-semibold text-slate-900">
            Velkommen til Bygnors ordreportal
          </h1>
          <p className="mb-6 text-sm text-slate-500">
            Gennemse Bygnors produktkatalog.
          </p>

          <Link
            href="/shop/katalog"
            className="mb-3 block w-full rounded-md bg-[#185FA5] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#144e88]"
          >
            Se katalog
          </Link>

          <form action={logout}>
            <button
              type="submit"
              className="w-full rounded-md bg-[#5A9D3C] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d8632] focus:outline-none focus:ring-2 focus:ring-[#5A9D3C]/40"
            >
              Log ud
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
