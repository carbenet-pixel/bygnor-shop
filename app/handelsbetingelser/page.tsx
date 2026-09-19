import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Handelsbetingelser — Bygnor",
};

/**
 * Placeholder — indholdet er endnu ikke juridisk færdiggjort. Siden findes
 * nu så checkout-flowets accept-link ikke peger på en 404, mens de
 * egentlige betingelser udarbejdes.
 */
export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex justify-center">
          <Image
            src="/images/bygnor-logo.png"
            alt="Bygnor"
            width={160}
            height={30}
            priority
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="mb-4 text-xl font-semibold text-slate-900">
            Handelsbetingelser
          </h1>
          <p className="mb-4 text-sm text-slate-500">
            Denne side er under udarbejdelse. De fulde handelsbetingelser for
            handel hos Bygnor offentliggøres her snarest.
          </p>
          <p className="text-sm text-slate-500">
            Har du spørgsmål i mellemtiden, er du velkommen til at kontakte
            Bygnor direkte.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          <Link href="/shop/kurv" className="hover:text-[#185FA5]">
            ← Tilbage til kurv
          </Link>
        </p>
      </div>
    </div>
  );
}
