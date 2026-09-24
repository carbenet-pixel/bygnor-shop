import "server-only";

/**
 * Kanonisk base-URL for Quickpay-redirects, invite/reset-links og
 * driftsmails — audit-fund #24 fandt at disse i stedet hardkodede
 * bygnor-shop.vercel.app direkte i hvert kald-sted, hvilket ville brække
 * dem stille (forkert redirect, dødt link i en mail) den dag domænet
 * skiftede til shop.bygnor.com uden at nogen kode ellers ændrede sig.
 * Kaster ved manglende værdi i stedet for at falde tilbage til en gættet
 * URL — en tavs forkert Quickpay-callback-URL er langt værre end en
 * øjeblikkelig, tydelig fejl ved opstart.
 */
export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) {
    throw new Error("[site-url] NEXT_PUBLIC_SITE_URL er ikke sat");
  }
  return url.replace(/\/+$/, "");
}
