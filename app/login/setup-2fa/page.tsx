import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Setup2FAForm } from "./setup-2fa-form";

export default async function Setup2FAPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    issuer: "Bygnor",
  });

  if (error || !data) {
    redirect("/login");
  }

  const qrCodeSrc = `data:image/svg+xml;utf-8,${encodeURIComponent(data.totp.qr_code)}`;

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
            Opsæt to-faktor login
          </h1>
          <p className="mb-6 text-sm text-slate-500">
            Scan QR-koden med Google Authenticator, Microsoft Authenticator
            eller en lignende app, og bekræft med koden.
          </p>

          <Setup2FAForm
            factorId={data.id}
            qrCodeSrc={qrCodeSrc}
            secret={data.totp.secret}
          />
        </div>
      </div>
    </div>
  );
}
