import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function login(formData: FormData) {
  "use server";

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect("/login?error=1");
  }

  const { data: factors } = await supabase.auth.mfa.listFactors();

  if (factors && factors.totp.length > 0) {
    redirect("/login/verify");
  }

  redirect("/login/setup-2fa");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reset?: string }>;
}) {
  const { error, reset } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-4 flex justify-center">
          <Image
            src="/images/bygnor-logo.png"
            alt="Bygnor"
            width={220}
            height={42}
            priority
          />
        </div>

        <p className="mb-8 text-center text-xs text-slate-400">
          Professionelt butiks- og restaurantinventar leveret til Grønland og
          Nordatlanten.
        </p>

        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="mb-1 text-xl font-semibold text-slate-900">
            Log ind
          </h1>
          <p className="mb-6 text-sm text-slate-500">
            Velkommen til Bygnors ordreportal
          </p>

          {reset === "success" && (
            <div className="mb-5 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              Dit kodeord er opdateret — log ind med dit nye kodeord
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Forkert email eller kodeord
            </div>
          )}

          <form action={login} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#185FA5] focus:ring-2 focus:ring-[#185FA5]/20"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Kodeord
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#185FA5] focus:ring-2 focus:ring-[#185FA5]/20"
              />
              <a
                href="/login/forgot-password"
                className="mt-1 inline-block text-xs text-slate-400 hover:text-[#185FA5]"
              >
                Glemt kodeord?
              </a>
            </div>

            <button
              type="submit"
              className="w-full rounded-md bg-[#5A9D3C] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d8632] focus:outline-none focus:ring-2 focus:ring-[#5A9D3C]/40"
            >
              Log ind
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Ikke kunde endnu?{" "}
          <a
            href="https://bygnor.vercel.app/bliv-kunde"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-slate-500 underline underline-offset-2 hover:text-[#185FA5]"
          >
            Ansøg om adgang
          </a>
        </p>
      </div>
    </div>
  );
}
