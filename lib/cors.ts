const ALLOWED_ORIGINS = ["https://bygnor.vercel.app", "https://bygnor.com"];

/**
 * Returns the request's Origin header if — and only if — it's on the
 * allowlist, otherwise null. Used both to decide whether to accept the
 * request at all, and what to echo back in Access-Control-Allow-Origin.
 */
export function getCorsOrigin(requestOrigin: string | null): string | null {
  if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
    return requestOrigin;
  }
  return null;
}

export function corsHeaders(origin: string | null): HeadersInit {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    // Origin-afhængigt svar, ikke wildcard — fortæl caches at de skal variere på Origin.
    headers["Vary"] = "Origin";
  }

  return headers;
}
