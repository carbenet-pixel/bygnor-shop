import Link from "next/link";

/**
 * Leverandørliste — hold som en simpel liste af navne, så en ny leverandør
 * (fx Ogreen) tilføjes ved blot at lægge et element til, uden at bygge om
 * på selve footeren.
 */
const SUPPLIERS = ["Pido (Pido Sällmann Group)"];

/**
 * Vises på både /shop og /admin (samme footer, ingen forenklet
 * admin-variant) — enkel og rolig, matcher headerens stil
 * (border/bg-white/text-slate-400, samme max-w-6xl-container).
 */
export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 text-xs text-slate-400 sm:flex-row sm:justify-between">
        <div>
          <p className="font-medium text-slate-600">Bygnor ApS</p>
          <p>Gersagervej 9, 2670 Greve</p>
          <p>CVR 45822370</p>
          <p>
            Tlf. 30 14 00 00 ·{" "}
            <a href="mailto:kontakt@bygnor.com" className="hover:text-[#185FA5]">
              kontakt@bygnor.com
            </a>
          </p>
        </div>

        <div>
          <p className="font-medium text-slate-600">Vores leverandører</p>
          <p>{SUPPLIERS.join(", ")}</p>
        </div>

        <div className="flex gap-4 sm:flex-col sm:items-end sm:gap-1">
          <Link href="/handelsbetingelser" className="hover:text-[#185FA5]">
            Handelsbetingelser
          </Link>
          <Link href="/privatlivspolitik" className="hover:text-[#185FA5]">
            Privatlivspolitik
          </Link>
        </div>
      </div>
    </footer>
  );
}
