import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getUserRole, getAccountStatus } from "@/lib/supabase/get-user-role";

/**
 * Audit-fund #4. En tidligere version af dette forsvar brugte i stedet en
 * bred RLS "as restrictive"-policy (migration 0036) — den forårsagede et
 * produktionsudfald og blev efterfølgende slået fra direkte i databasen,
 * uden om migrationskæden (0036-filen selv indeholder stadig kun de
 * oprindelige CREATE POLICY-sætninger, ingen tilhørende DROP — filen alene
 * giver derfor et misvisende billede af den faktiske database). Bekræftet
 * via pg_policies mod produktionsdatabasen: disse AAL2-policies findes
 * IKKE der i dag. MFA håndhæves derfor udelukkende HER, ét sted, på
 * nøjagtig samme måde lib/admin-guard.ts's requireRole() allerede gør det
 * (getAuthenticatorAssuranceLevel(), ikke en RLS-policy) — IKKE på
 * databaselaget, hvor et enkelt overset session-bundet opslag et hvilket
 * som helst sted i kodebasen kunne (og gjorde) lukke hele siden ned.
 *
 * Kaldes KUN fra /shop- og /admin-blokkene, ALDRIG for login/2FA-
 * ruterne selv — de er slet ikke dækket af proxy.ts's matcher
 * ("/", "/shop", "/shop/:path*", "/admin", "/admin/:path*"), så
 * /login, /login/verify, /login/setup-2fa og /login/forgot-password /
 * /login/reset-password rammes aldrig af denne middleware overhovedet,
 * uanset hvad der tilføjes her — bekræftet ved læsning af matcher'en,
 * ikke antaget.
 *
 * nextLevel skelner "har en faktor at bekræfte" (send til /login/verify)
 * fra "ingen faktor tilmeldt endnu" (send til /login/setup-2fa) — samme
 * skel login()'s egen listFactors()-baserede redirect allerede laver,
 * blot udledt af sessionens JWT i stedet for et nyt Auth-kald.
 */
async function requireAal2(
  supabase: ReturnType<typeof createServerClient>,
  request: NextRequest,
): Promise<NextResponse | null> {
  const { data: aalData, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  // Fail-closed: MFA er det eneste håndhævelseslag i dag (se kommentaren
  // ovenfor) — en fejl eller manglende svar her må aldrig stiltiende
  // lukke en anmodning igennem, kun tydeligt sende brugeren til /login.
  if (error || !aalData) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (aalData.currentLevel === "aal2") {
    return null;
  }

  const target = aalData.nextLevel === "aal2" ? "/login/verify" : "/login/setup-2fa";
  return NextResponse.redirect(new URL(target, request.url));
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) => {
            response.headers.set(key, value);
          });
        },
      },
    },
  );

  const { pathname } = request.nextUrl;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // signOut() sætter cookie-sletningerne på `response` via setAll ovenfor —
  // skal læses EFTER signOut() er kaldt, og skal derfor lukke over den
  // samme variabel (ikke modtage den som parameter), da setAll genskaber
  // `response` ved hvert kald.
  const signOutAndRedirect = async (path: string): Promise<NextResponse> => {
    await supabase.auth.signOut();
    const redirectResponse = NextResponse.redirect(new URL(path, request.url));
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  };

  // shop.bygnor.com's rod må aldrig vise den ustørte create-next-app-
  // standardside til en besøgende — uindlogget sendes til /login,
  // indlogget sendes videre til deres rolles landingsside. De mere
  // detaljerede tjek (inaktiv konto, manglende profil, superadmin-kun
  // undersider) sker allerede i /shop- og /admin-blokkene nedenfor, så en
  // efterfølgende anmodning mod /shop eller /admin rammer dem uændret.
  if (pathname === "/") {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const role = await getUserRole(user.id);

    if (role === "admin" || role === "superadmin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    return NextResponse.redirect(new URL("/shop", request.url));
  }

  if (pathname.startsWith("/shop")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const aal2Redirect = await requireAal2(supabase, request);
    if (aal2Redirect) {
      return aal2Redirect;
    }

    const status = await getAccountStatus(user.id);

    // En auth.users-række uden tilhørende profiles-række (fx trigger-fejl,
    // manuelt oprettet bruger, eller en profil slettet ved en fejl) må ikke
    // slippe igennem med "rolle: ukendt" — kræv en gyldig profil.
    if (!status) {
      return signOutAndRedirect("/login?error=no_profile");
    }

    // Deaktivering gælder kun kunde-rollen — admin/superadmin er aldrig
    // påvirket, uanset is_active, så en fejlmarkering ikke kan lukke en
    // administrator ude ved et uheld.
    if (status.role === "kunde" && !status.isActive) {
      return signOutAndRedirect("/login?error=inactive");
    }
  }

  if (pathname.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const aal2Redirect = await requireAal2(supabase, request);
    if (aal2Redirect) {
      return aal2Redirect;
    }

    const role = await getUserRole(user.id);

    if (
      pathname.startsWith("/admin/users") ||
      pathname.startsWith("/admin/discount-groups") ||
      pathname.startsWith("/admin/categories") ||
      pathname.startsWith("/admin/product-groups") ||
      pathname.startsWith("/admin/vat-rules")
    ) {
      if (role !== "superadmin") {
        return NextResponse.redirect(new URL("/shop", request.url));
      }
    } else if (role !== "admin" && role !== "superadmin") {
      return NextResponse.redirect(new URL("/shop", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/", "/shop", "/shop/:path*", "/admin", "/admin/:path*"],
};
