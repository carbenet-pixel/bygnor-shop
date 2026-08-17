import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function logout() {
  "use server";

  const supabase = await createClient();
  await supabase.auth.signOut();

  redirect("/login");
}

export default function ShopPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
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
            Kataloget er på vej — vi bygger det til dig.
          </p>

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
