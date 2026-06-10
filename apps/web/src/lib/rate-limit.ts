import { redis } from './redis';

// In-process fallback — not shared across workers, but still blocks single-process abuse
const fallback = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  allowed:   boolean;
  remaining: number;
  resetAt:   number; // epoch ms
}

/**
 * Fixed-window rate limiter backed by Redis.
 * Uses an atomic Lua script: INCR + EXPIRE on first increment so the window
 * starts precisely with the first request and doesn't reset on every call.
 * Falls back to an in-process Map when Redis is unavailable.
 *
 * @param key        Unique bucket key (e.g. `rl:login:127.0.0.1`)
 * @param max        Max requests allowed in the window
 * @param windowSec  Window size in seconds
 */
export async function rateLimit(
  key:       string,
  max:       number,
  windowSec: number,
): Promise<RateLimitResult> {
  if (redis) {
    try {
      // Atomic: increment and set TTL only on the first increment
      const count = (await redis.eval(
        `local c = redis.call('INCR', KEYS[1])
         if c == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
         return c`,
        1,
        key,
        String(windowSec),
      )) as number;

      const ttl = Math.max(0, await redis.ttl(key));
      return {
        allowed:   count <= max,
        remaining: Math.max(0, max - count),
        resetAt:   Date.now() + ttl * 1000,
      };
    } catch {
      // Redis unavailable — fall through to in-process map
    }
  }

  const now     = Date.now();
  const entry   = fallback.get(key);
  const resetAt = entry && entry.resetAt > now ? entry.resetAt : now + windowSec * 1000;

  if (!entry || entry.resetAt <= now) {
    fallback.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: max - 1, resetAt };
  }

  entry.count++;
  return {
    allowed:   entry.count <= max,
    remaining: Math.max(0, max - entry.count),
    resetAt:   entry.resetAt,
  };
}

/** Returns the client IP from standard proxy headers. */
export function clientIp(request: Request): string {
  return (
    (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() ||
    'unknown'
  );
}
