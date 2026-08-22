import "server-only";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 5;

type Entry = { count: number; resetAt: number };

const hits = new Map<string, Entry>();

/**
 * Simple in-memory, per-key, fixed-window rate limiter. Good enough to
 * blunt casual abuse within a single warm serverless instance — it does
 * NOT share state across instances/regions/cold starts, so it's not a hard
 * guarantee under real load or a distributed attack. Swap for a shared
 * store (Upstash Redis, Vercel KV) if that's ever needed.
 */
export function checkRateLimit(
  key: string,
  { windowMs = WINDOW_MS, maxRequests = MAX_REQUESTS } = {},
): boolean {
  const now = Date.now();

  if (hits.size > 1000) {
    for (const [k, entry] of hits) {
      if (now > entry.resetAt) hits.delete(k);
    }
  }

  const entry = hits.get(key);

  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count += 1;
  return true;
}
