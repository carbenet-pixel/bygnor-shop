import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getUserRole, getAccountStatus } from "@/lib/supabase/get-user-role";

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

  if (pathname.startsWith("/shop")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
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

    const role = await getUserRole(user.id);

    if (
      pathname.startsWith("/admin/users") ||
      pathname.startsWith("/admin/discount-groups")
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
  matcher: ["/shop", "/shop/:path*", "/admin", "/admin/:path*"],
};
