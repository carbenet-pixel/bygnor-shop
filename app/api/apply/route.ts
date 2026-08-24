import { NextResponse, type NextRequest } from "next/server";
import {
  applyForAccount,
  type ApplyInput,
} from "@/lib/customer-application";
import { checkRateLimit } from "@/lib/rate-limit";
import { corsHeaders, getCorsOrigin } from "@/lib/cors";

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

// Håndterer CORS preflight (browseren sender denne før selve POST'en, da
// Content-Type: application/json ikke er en "simpel" request-type).
export async function OPTIONS(request: NextRequest) {
  const origin = getCorsOrigin(request.headers.get("origin"));
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(request: NextRequest) {
  // CORS-headers styrer kun hvad BROWSEREN må læse — de blokerer ikke selve
  // requesten fra at nå og køre server-side. Derfor afviser vi eksplicit
  // (403, intet arbejde udføres) hvis Origin ikke er på listen, i stedet for
  // blot at undlade CORS-headers og ellers behandle requesten normalt.
  const origin = getCorsOrigin(request.headers.get("origin"));
  if (!origin) {
    return NextResponse.json(
      { success: false, error: "server_error" },
      { status: 403 },
    );
  }

  const headers = corsHeaders(origin);

  const ip = getClientIp(request);
  if (!checkRateLimit(`apply:${ip}`)) {
    return NextResponse.json(
      { success: false, error: "rate_limited" },
      { status: 429, headers },
    );
  }

  let body: Partial<Record<keyof ApplyInput, unknown>>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "validation_error" },
      { status: 400, headers },
    );
  }

  // Stol aldrig på klientens input — tving alt til de forventede typer, uanset hvad der kom ind.
  const preferredPaymentRaw = String(body.preferredPayment ?? "").trim();

  const input: ApplyInput = {
    companyName: String(body.companyName ?? "").trim(),
    cvrNumber: String(body.cvrNumber ?? "").trim(),
    contactName: String(body.contactName ?? "").trim(),
    email: String(body.email ?? "").trim(),
    streetAddress: String(body.streetAddress ?? "").trim(),
    postalCode: String(body.postalCode ?? "").trim(),
    city: String(body.city ?? "").trim(),
    country: String(body.country ?? "").trim(),
    phone: String(body.phone ?? "").trim() || undefined,
    preferredPayment: preferredPaymentRaw
      ? (preferredPaymentRaw as ApplyInput["preferredPayment"])
      : undefined,
    expectedCategory: String(body.expectedCategory ?? "").trim() || undefined,
    expectedAnnualVolume:
      String(body.expectedAnnualVolume ?? "").trim() || undefined,
    existingCustomer: Boolean(body.existingCustomer),
    applicationComment:
      String(body.applicationComment ?? "").trim() || undefined,
    termsAccepted: Boolean(body.termsAccepted),
    privacyAccepted: Boolean(body.privacyAccepted),
  };

  const result = await applyForAccount(input);

  if (!result.success) {
    const status =
      result.error === "rate_limited"
        ? 429
        : result.error === "validation_error" ||
            result.error === "terms_not_accepted" ||
            result.error === "cvr_invalid" ||
            result.error === "email_taken"
          ? 400
          : 500;
    return NextResponse.json(result, { status, headers });
  }

  return NextResponse.json(result, { status: 200, headers });
}
