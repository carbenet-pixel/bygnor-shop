import Image from "next/image";
import Link from "next/link";

/**
 * Leverandørliste — hold som en simpel liste af navne, så en ny leverandør
 * (fx Ogreen) tilføjes ved blot at lægge et element til, uden at bygge om
 * på selve footeren.
 */
const SUPPLIERS = ["Pido (Pido Sällmann Group)"];

const headingClass =
  "mb-3 text-xs font-semibold tracking-wider text-slate-400 uppercase";

// Sitets egen konvention for en almindelig tekst-linje der skal ligne et
// link (samme mønster som "Se hele kataloget" på /shop og "Tilbage til
// login" på /login) — genbrugt her i stedet for at opfinde en ny stil.
const inlineLinkClass =
  "text-slate-500 underline underline-offset-2 hover:text-[#185FA5]";

// De juridiske links skal fremstå som links i sig selv, ikke kun ved
// hover (fund fra UX-gennemgangen) — bruger derfor sitets link-farve som
// hvilefarve, med underline som hover-tilstand.
const legalLinkClass = "text-[#185FA5] hover:underline";

/**
 * Vises på både /shop og /admin (samme footer, ingen forenklet
 * admin-variant) — samme max-w-6xl-container som headeren, men med sin
 * egen, lidt mørkere baggrund og tydeligere top-kant, så footeren læses
 * som en tydelig afgrænset zone og ikke bare en fortsættelse af siden.
 */
export function Footer() {
  return (
    <footer className="border-t border-slate-300 bg-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-1 gap-8 text-xs text-slate-500 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className={headingClass}>Kontakt</p>
            <p className="font-medium text-slate-700">Bygnor ApS</p>
            <p>Gersagervej 9</p>
            <p>2670 Greve</p>
            <p>Danmark</p>
            <p>CVR 45822370</p>
            <p>
              Tlf. 30 14 00 00 ·{" "}
              <a href="mailto:kontakt@bygnor.com" className="hover:text-[#185FA5]">
                kontakt@bygnor.com
              </a>
            </p>
          </div>

          <div>
            <p className={headingClass}>Leverandører</p>
            <p>{SUPPLIERS.join(", ")}</p>
          </div>

          <div>
            <p className={headingClass}>Katalog</p>
            <Link href="/shop/katalog" className={inlineLinkClass}>
              Se hele kataloget
            </Link>
          </div>

          <div>
            <p className={headingClass}>Juridisk</p>
            <div className="flex flex-col items-start gap-1">
              <Link href="/handelsbetingelser" className={legalLinkClass}>
                Handelsbetingelser
              </Link>
              <Link href="/privatlivspolitik" className={legalLinkClass}>
                Privatlivspolitik
              </Link>
            </div>
          </div>
        </div>

        {/* Diskret brand-forankring, ikke reklame — mindre og mere afdæmpet
            (opacity-50) end header-logoet, adskilt af en tynd streg.
            Copyright-linjen holdes i samme dæmpede tone som wordmarket. */}
        <div className="mt-8 flex flex-col items-center gap-2 border-t border-slate-200 pt-6">
          <Image
            src="/images/bygnor-logo.png"
            alt="Bygnor"
            width={100}
            height={19}
            className="opacity-50"
          />
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} Bygnor ApS. Alle rettigheder forbeholdes.
          </p>
        </div>
      </div>
    </footer>
  );
}
