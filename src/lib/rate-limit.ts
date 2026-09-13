/**
 * In-memory fixed-window rate limiter.
 *
 * Suitable for this single-node deployment (SQLite, one process).
 * For multi-instance deployments replace with a shared store (e.g. Redis).
 */

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

// Periodically purge expired buckets so the map does not grow unbounded.
let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

  if (bucket.count > limit) {
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }
  return {
    allowed: true,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSeconds: 0,
  };
}

/**
 * Best-effort client IP extraction.
 *
 * `X-Forwarded-For` is client-supplied and spoofable, so by default it is
 * only used as a weak fallback. Deployments that sit behind a reverse
 * proxy MUST set TRUST_PROXY=true so the proxy-populated header can be
 * trusted for rate limiting.
 */
export function getClientIp(request: Request): string {
  const trustProxy = process.env.TRUST_PROXY === "true";
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  if (trustProxy && forwarded) {
    return forwarded.split(",")[0].trim();
  }
  if (realIp) {
    return realIp.trim();
  }
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "unknown";
}
