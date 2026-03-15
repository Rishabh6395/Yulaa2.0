import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as { redis: Redis | null };

function createRedisClient(): Redis | null {
  if (typeof window !== 'undefined') return null; // browser guard

  const url = process.env.REDIS_URL || 'redis://localhost:6379';

  const client = new Redis(url, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
  });

  client.on('error', () => {
    // Swallow connection errors so the app works without Redis
  });

  return client;
}

export const redis: Redis | null =
  globalForRedis.redis !== undefined
    ? globalForRedis.redis
    : (globalForRedis.redis = createRedisClient());

/** TTL presets in seconds */
export const TTL = {
  dashboard: 60,        // 1 min — analytics cards
  dashboardParent: 30,  // 30 s  — per-child view
} as const;

/**
 * Get a cached value. Returns null on cache miss or Redis unavailable.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Store a value in the cache with a TTL (seconds).
 */
export async function cacheSet(key: string, value: unknown, ttl: number): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttl);
  } catch {
    // Ignore write errors — cache is best-effort
  }
}

/**
 * Invalidate all keys matching a glob pattern.
 */
export async function cacheInvalidate(pattern: string): Promise<void> {
  if (!redis) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length) await redis.del(...keys);
  } catch {
    // Ignore
  }
}
