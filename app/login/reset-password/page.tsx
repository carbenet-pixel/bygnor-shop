import Image from "next/image";
import { ResetPasswordForm } from "./reset-password-form";
import { HashSessionGate } from "./hash-session-gate";

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
            // Intet ?code= — enten et invite-link (tokens i URL'ens
            // hash-fragment, kun læsbare client-side) eller et reelt
            // ugyldigt link. HashSessionGate afgør hvilket.
            <HashSessionGate />
          )}
        </div>
      </div>
    </div>
  );
}
