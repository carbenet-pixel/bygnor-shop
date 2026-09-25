import Link from "next/link";
import { Logo } from "@/components/logo";

// title.absolute, ikke en almindelig streng — rod-layoutets title.template
// ("%s – Bygnor Shop") gælder ellers automatisk for enhver almindelig
// streng-titel i en underside, hvilket her ville give det dobbelte
// "Privatlivspolitik — Bygnor – Bygnor Shop". absolute er Next.js' egen
// mekanisme til bevidst at fravælge template'et og vise nøjagtig denne tekst.
export const metadata = {
  title: { absolute: "Privatlivspolitik — Bygnor" },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex justify-center">
          <Logo className="text-2xl" />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="mb-4 text-xl font-semibold text-slate-900">
            Privatlivspolitik
          </h1>

          <div className="mb-6 text-sm text-slate-500">
            <p>
              Dataansvarlig: Bygnor ApS, CVR 45822370, Gersagervej 9, 2670
              Greve
            </p>
            <p>
              Kontakt:{" "}
              <a href="mailto:kontakt@bygnor.com" className="hover:text-[#185FA5]">
                kontakt@bygnor.com
              </a>
            </p>
            <p className="mt-2">Sidst opdateret: 23. september 2026</p>
          </div>

          <div className="space-y-6 text-sm text-slate-600">
            <section>
              <h2 className="mb-2 font-semibold text-slate-900">
                1. Hvilke oplysninger indsamler vi
              </h2>
              <p>
                Når du opretter en konto og handler i Shoppen, indsamler og
                behandler vi:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Virksomhedsoplysninger: firmanavn, CVR-nummer, kontaktperson</li>
                <li>Kontaktoplysninger: e-mail, telefonnummer, leveringsadresse</li>
                <li>
                  Ordrehistorik og betalingsoplysninger (kortoplysninger
                  opbevares ikke af Bygnor — betalingskort behandles direkte
                  af vores betalingsleverandør Quickpay)
                </li>
                <li>
                  Loginoplysninger, herunder to-faktor-godkendelse (2FA), til
                  brug for kontosikkerhed
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 font-semibold text-slate-900">
                2. Formål og retsgrundlag
              </h2>
              <p>
                Vi behandler dine oplysninger for at kunne oprette og
                administrere din konto, behandle og levere dine
                bestillinger, udstede fakturaer, og kommunikere med dig om
                din ordre. Behandlingen sker med hjemmel i
                databeskyttelsesforordningens artikel 6, stk. 1, litra b
                (opfyldelse af aftale) og litra f (legitim interesse i
                almindelig kundeadministration).
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-semibold text-slate-900">
                3. Hvem deler vi oplysninger med
              </h2>
              <p>Vi deler oplysninger med:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Quickpay (betalingsbehandling)</li>
                <li>Postmark (afsendelse af ordrebekræftelser og systemmails)</li>
                <li>Supabase (drift af database og login, hostet i EU/Irland)</li>
                <li>
                  Fragt- og leveringspartnere, i det omfang det er
                  nødvendigt for at levere din ordre
                </li>
              </ul>
              <p className="mt-2">
                Vi videresælger ikke dine oplysninger til tredjepart til
                markedsføringsformål.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-semibold text-slate-900">4. Opbevaring</h2>
              <p>
                Ordre- og faktureringsoplysninger opbevares i minimum 5 år i
                overensstemmelse med bogføringsloven. Kontooplysninger
                opbevares, så længe din konto er aktiv, eller som
                lovgivningen i øvrigt kræver.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-semibold text-slate-900">
                5. Dine rettigheder
              </h2>
              <p>
                Du har ret til indsigt i, berigtigelse af og sletning af
                dine oplysninger, samt ret til at gøre indsigelse mod
                behandlingen. Kontakt os på{" "}
                <a href="mailto:kontakt@bygnor.com" className="hover:text-[#185FA5]">
                  kontakt@bygnor.com
                </a>
                . Du kan desuden klage til Datatilsynet (datatilsynet.dk).
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-semibold text-slate-900">6. Cookies</h2>
              <p>
                Shoppen anvender kun tekniske, nødvendige cookies til login
                og session-håndtering. Vi anvender ikke marketing- eller
                analyse-cookies på nuværende tidspunkt.
              </p>
            </section>
          </div>
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
