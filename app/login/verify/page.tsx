import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function verify(formData: FormData) {
  "use server";

  const code = formData.get("code") as string;

  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp[0];

  if (!factor) {
    redirect("/login");
  }

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: factor.id,
    code,
  });

  if (error) {
    redirect("/login/verify?error=1");
  }

  redirect("/shop");
}

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Image
            src="/images/bygnor-logo.png"
            alt="Bygnor"
            width={220}
            height={42}
            priority
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="mb-1 text-xl font-semibold text-slate-900">
            To-faktor login
          </h1>
          <p className="mb-6 text-sm text-slate-500">
            Indtast koden fra din authenticator-app
          </p>

          {error && (
            <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Forkert kode — prøv igen
            </div>
          )}

          <form action={verify} className="space-y-4">
            <div>
              <label
                htmlFor="code"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                6-cifret kode
              </label>
              <input
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-center text-lg tracking-widest text-slate-900 outline-none focus:border-[#185FA5] focus:ring-2 focus:ring-[#185FA5]/20"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-md bg-[#5A9D3C] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d8632] focus:outline-none focus:ring-2 focus:ring-[#5A9D3C]/40"
            >
              Bekræft
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
