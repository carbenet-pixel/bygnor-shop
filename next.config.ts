import type { NextConfig } from "next";

/**
 * NEXT_PUBLIC_-variabler bages ind i den offentlige klient-bundle ved
 * `next build` — sker det HER er nøglen allerede lækket til alle besøgende,
 * uanset hvor hurtigt miljøvariablen rettes bagefter. Dette har ramt
 * projektet to gange nu: én gang med de gamle lange JWT-nøgler (en
 * service_role-JWT sat som anon-nøgle), én gang med det nye sb_-format (en
 * sb_secret_-nøgle sat som anon-nøgle, se git-historikken for
 * proxy.ts/AAL2-hændelsen). Tjekket kører her, ikke i instrumentation.ts,
 * fordi skaden allerede er sket i selve build'et — build/dev skal fejle
 * FØR bundlen skrives, ikke først opdages efter deploy.
 */
function assertPublicSupabaseKeyIsSafe(key: string | undefined): void {
  if (!key) return;

  if (key.startsWith("sb_secret_")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY ser ud til at være en sb_secret_-nøgle (service_role-niveau adgang), ikke den offentlige publishable/anon-nøgle. Denne værdi bages direkte ind i klient-bundlen og bliver synlig for enhver besøgende. Ret miljøvariablen før build/dev fortsætter.",
    );
  }

  if (key.startsWith("sb_publishable_")) return;

  // Den ældre, lange JWT-nøgleform (fra før sb_-præfikserne) — anon- og
  // service_role-nøgler har samme prefix her, så det er 'role'-claimet i
  // JWT'en, ikke formatet, der afgør om nøglen er sikker at offentliggøre.
  const jwtParts = key.split(".");
  if (jwtParts.length === 3) {
    try {
      const payload = JSON.parse(
        Buffer.from(jwtParts[1], "base64url").toString("utf-8"),
      );
      if (payload.role === "service_role") {
        throw new Error(
          "NEXT_PUBLIC_SUPABASE_ANON_KEY ser ud til at være en JWT med role=service_role, ikke en anon-nøgle. Denne værdi bages direkte ind i klient-bundlen og bliver synlig for enhver besøgende. Ret miljøvariablen før build/dev fortsætter.",
        );
      }
      if (payload.role === "anon") return;
    } catch {
      // Falder igennem til den generelle afvisning nedenfor.
    }
  }

  throw new Error(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY har et uventet format — forventede en sb_publishable_-nøgle eller en JWT med role=anon. Dobbeltcheck værdien i Vercels miljøvariabler før build/dev fortsætter.",
  );
}

assertPublicSupabaseKeyIsSafe(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseHostname,
            port: "",
            pathname: "/storage/v1/object/public/**",
            search: "",
          },
        ]
      : [],
  },
};

export default nextConfig;
