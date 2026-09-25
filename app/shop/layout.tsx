import Link from "next/link";
import { Logo } from "@/components/logo";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/supabase/get-user-role";
import { getCartItemCount } from "@/lib/cart";
import { logout } from "@/lib/supabase/actions";
import { Footer } from "@/components/footer";

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [role, cartItemCount] = await Promise.all([
    getUserRole(user.id),
    getCartItemCount(),
  ]);
  const isAdmin = role === "admin" || role === "superadmin";

  const companyName =
    role === "kunde"
      ? await supabase
          .from("profiles")
          .select("company_name")
          .eq("id", user.id)
          .maybeSingle()
          .then(({ data }) => (data?.company_name as string | null) ?? null)
      : null;

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/shop">
            <Logo className="text-2xl" />
          </Link>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            {role === "kunde" ? (
              <span className="mr-2">
                <span className="font-semibold text-foreground">
                  {companyName ?? "—"}
                </span>{" "}
                ·{" "}
                <Link href="/shop/konto" className="hover:text-bygnor-blue">
                  Min konto
                </Link>
              </span>
            ) : (
              <>
                <span>
                  Email: {user.email} · Rolle: {role ?? "ukendt"}
                </span>
                {isAdmin && (
                  <Link href="/admin" className="font-medium hover:text-bygnor-blue">
                    Admin →
                  </Link>
                )}
                <Link href="/shop/konto" className="hover:text-bygnor-blue">
                  Min konto
                </Link>
              </>
            )}
            <Link
              href="/shop/kurv"
              className="relative flex items-center text-slate-500 hover:text-bygnor-blue"
              aria-label="Kurv"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 3h1.386c.51 0 .955.343 1.087.836l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 1.8-3.664 2.72-5.85a1.125 1.125 0 00-1-1.626H6.32M7.5 14.25L5.106 5.272M6.32 8.774L7.5 14.25M6.75 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                />
              </svg>
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-bygnor-green px-1 text-[10px] font-semibold text-white">
                  {cartItemCount}
                </span>
              )}
            </Link>
            <form action={logout}>
              <button type="submit" className="hover:text-bygnor-blue">
                Log ud
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <Footer />
    </div>
  );
}