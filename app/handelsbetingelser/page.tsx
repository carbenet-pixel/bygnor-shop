import Link from "next/link";
import { Logo } from "@/components/logo";

// title.absolute — se app/privatlivspolitik/page.tsx for hvorfor en
// almindelig streng-titel her ville arve rod-layoutets template og blive
// til "Handelsbetingelser — Bygnor – Bygnor Shop".
export const metadata = {
  title: { absolute: "Handelsbetingelser — Bygnor" },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-cream px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex justify-center">
          <Logo className="text-2xl" />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="mb-4 text-xl font-semibold text-foreground">
            Handelsbetingelser
          </h1>

          <div className="mb-6 text-sm text-slate-500">
            <p>Bygnor ApS</p>
            <p>CVR: 45822370</p>
            <p>Gersagervej 9, 2670 Greve</p>
            <p>
              E-mail:{" "}
              <a href="mailto:kontakt@bygnor.com" className="hover:text-bygnor-blue">
                kontakt@bygnor.com
              </a>
            </p>
            <p className="mt-2">Sidst opdateret: 23. september 2026</p>
          </div>

          <div className="space-y-6 text-sm text-slate-600">
            <section>
              <h2 className="mb-2 font-semibold text-foreground">1. Generelt</h2>
              <p>
                Disse handelsbetingelser gælder for alle køb foretaget på
                shop.bygnor.com (&quot;Shoppen&quot;). Shoppen henvender sig
                udelukkende til erhvervsdrivende kunder — alle kunder skal
                være registreret med et gyldigt CVR-nummer. Shoppen sælger
                ikke til privatpersoner, og forbrugerbeskyttelseslovgivning
                (herunder forbrugeraftaleloven) finder derfor ikke anvendelse
                på handler indgået her.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-semibold text-foreground">
                2. Produkter og priser
              </h2>
              <p>
                Produkterne på Shoppen er specialfremstillede butiks- og
                restaurantinventar, produceret på bestilling til den enkelte
                ordre. Priser vises eksklusive moms i kurv og på
                produktsider; den endelige pris inklusive gældende moms
                fremgår ved checkout og på ordrebekræftelsen. Moms beregnes
                efter leveringsland: 25% for levering til Danmark, 0%
                (eksport) for levering til Grønland og Færøerne.
              </p>
              <p className="mt-2">
                Bygnor forbeholder sig ret til at ændre priser uden
                forudgående varsel. Den pris, der var gældende på
                bestillingstidspunktet, er dog altid den, kunden faktureres.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-semibold text-foreground">
                3. Bestilling og ordrebekræftelse
              </h2>
              <p>
                En bestilling er bindende for kunden, når den er gennemført
                på Shoppen. Kunden modtager en ordrebekræftelse pr. e-mail.
                Da varerne er specialfremstillede til den enkelte ordre, kan
                en bestilling ikke ændres eller annulleres, når produktionen
                er igangsat, medmindre andet aftales konkret med Bygnor.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-semibold text-foreground">4. Betaling</h2>
              <p>
                Betaling kan ske med betalingskort (Visa/Mastercard) via
                vores betalingsleverandør Quickpay, eller på faktura for
                kunder med godkendt kreditaftale. Fakturaer forfalder til
                betaling 14 dage fra fakturadato, medmindre andet er aftalt
                skriftligt.
              </p>
              <p className="mt-2">
                Ved forsinket betaling pålægges renter og gebyrer efter
                rentelovens regler.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-semibold text-foreground">5. Levering</h2>
              <p>
                Forventet leveringstid er 1-3 uger fra ordrebekræftelse,
                afhængig af produktionstid og fragtrute til
                leveringsadressen. Leveringstiden er vejledende og ikke en
                garanteret frist, medmindre andet er skriftligt aftalt.
                Bygnor er ikke ansvarlig for forsinkelser forårsaget af
                forhold uden for Bygnors kontrol, herunder forsinkelser hos
                underleverandører eller fragtudbydere.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-semibold text-foreground">
                6. Fortrydelsesret
              </h2>
              <p>
                Da alle kunder handler i erhvervsmæssigt øjemed, og
                produkterne er fremstillet efter kundens
                specifikationer/bestilling, er der ikke fortrydelsesret på
                køb foretaget i Shoppen.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-semibold text-foreground">
                7. Reklamation
              </h2>
              <p>
                Kunden skal ved modtagelsen undersøge varen for
                transportskader og mangler og straks reklamere til Bygnor på{" "}
                <a href="mailto:kontakt@bygnor.com" className="hover:text-bygnor-blue">
                  kontakt@bygnor.com
                </a>
                , hvis varen er mangelfuld eller beskadiget. Reklamationer
                håndteres af Bygnor. Købelovens almindelige regler om
                mangler ved erhvervskøb finder i øvrigt anvendelse.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-semibold text-foreground">
                8. Ansvarsbegrænsning
              </h2>
              <p>
                Bygnor er ikke ansvarlig for indirekte tab, driftstab eller
                følgeskader som følge af forsinket eller mangelfuld
                levering, medmindre der foreligger grov uagtsomhed eller
                forsæt fra Bygnors side.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-semibold text-foreground">
                9. Persondata
              </h2>
              <p>
                Behandling af personoplysninger sker i overensstemmelse med
                vores{" "}
                <Link href="/privatlivspolitik" className="underline hover:text-bygnor-blue">
                  privatlivspolitik
                </Link>
                .
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-semibold text-foreground">
                10. Lovvalg og værneting
              </h2>
              <p>
                Disse handelsbetingelser er underlagt dansk ret. Enhver tvist
                afgøres ved Retten i Glostrup.
              </p>
            </section>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          <Link href="/shop/kurv" className="hover:text-bygnor-blue">
            ← Tilbage til kurv
          </Link>
        </p>
      </div>
    </div>
  );
}
