import Image from "next/image";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

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
            Vælg nyt kodeord
          </h1>

          {code ? (
            <>
              <p className="mb-6 text-sm text-slate-500">
                Indtast dit nye kodeord herunder.
              </p>
              <ResetPasswordForm code={code} />
            </>
          ) : (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Linket er ugyldigt eller udløbet. Anmod om et{" "}
              <a href="/login/forgot-password" className="underline">
                nyt reset-link
              </a>
              .
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
