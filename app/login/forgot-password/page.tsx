import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function sendResetLink(formData: FormData) {
  "use server";

  const email = formData.get("email") as string;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: "https://bygnor-shop.vercel.app/login/reset-password",
  });

  if (error) {
    redirect("/login/forgot-password?error=1");
  }

  redirect("/login/forgot-password?sent=1");
}

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;

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
            Glemt kodeord
          </h1>

          {sent === "1" ? (
            <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              Vi har sendt et reset-link til din email. Tjek din indbakke.
            </div>
          ) : (
            <>
              <p className="mb-6 text-sm text-slate-500">
                Indtast din email, så sender vi dig et link til at nulstille
                dit kodeord.
              </p>

              {error && (
                <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  Noget gik galt — prøv igen
                </div>
              )}

              <form action={sendResetLink} className="space-y-4">
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

                <button
                  type="submit"
                  className="w-full rounded-md bg-[#5A9D3C] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d8632] focus:outline-none focus:ring-2 focus:ring-[#5A9D3C]/40"
                >
                  Send reset-link
                </button>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-xs text-slate-400">
            <a href="/login" className="hover:text-[#185FA5]">
              ← Tilbage til login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
