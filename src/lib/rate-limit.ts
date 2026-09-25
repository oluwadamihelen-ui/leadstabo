import "server-only";

// Fixed-window in-memory limiter. Adequate for a single node; swap for Redis
// (same interface) when running multiple instances.
const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  b.count++;
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
  }
  return { ok: b.count <= limit, remaining: Math.max(0, limit - b.count), retryAfter: b.reset - now };
}
