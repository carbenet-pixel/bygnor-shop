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

  if (pathname.startsWith("/shop")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const status = await getAccountStatus(user.id);

    // Deaktivering gælder kun kunde-rollen — admin/superadmin er aldrig
    // påvirket, uanset is_active, så en fejlmarkering ikke kan lukke en
    // administrator ude ved et uheld.
    if (status?.role === "kunde" && !status.isActive) {
      await supabase.auth.signOut();

      const redirectResponse = NextResponse.redirect(
        new URL("/login?error=inactive", request.url),
      );
      // signOut() satte cookie-sletningerne på `response` via setAll
      // ovenfor — de skal overføres eksplicit, da vi returnerer et nyt
      // redirect-svar i stedet for `response` selv.
      response.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie);
      });
      return redirectResponse;
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
