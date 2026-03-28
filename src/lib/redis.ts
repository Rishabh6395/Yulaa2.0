import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as {
  redis:          Redis | null;
  redisWarnedAt:  number;
  memCache:       Map<string, { v: string; exp: number }>;
};

// ── In-memory fallback (used when Redis is unavailable) ───────────────────────
// Survives across requests within the same server process.
// Does NOT survive restarts or scale across multiple instances.

if (!globalForRedis.memCache) {
  globalForRedis.memCache = new Map();
}
const mem = globalForRedis.memCache;

function memGet<T>(key: string): T | null {
  const e = mem.get(key);
  if (!e) return null;
  if (e.exp < Date.now()) { mem.delete(key); return null; }
  return JSON.parse(e.v) as T;
}

function memSet(key: string, value: unknown, ttl: number) {
  mem.set(key, { v: JSON.stringify(value), exp: Date.now() + ttl * 1000 });
}

function warnRedisDown() {
  const now = Date.now();
  // Throttle to once per 60 s so it doesn't spam the terminal
  if (!globalForRedis.redisWarnedAt || now - globalForRedis.redisWarnedAt > 60_000) {
    globalForRedis.redisWarnedAt = now;
    console.warn('[redis] ⚠️  Redis unavailable — falling back to in-process memory cache. Start Redis or set REDIS_URL to an Upstash URL for production-grade caching.');
  }
}

// ── Redis client ──────────────────────────────────────────────────────────────

function createRedisClient(): Redis | null {
  if (typeof window !== 'undefined') return null; // browser guard

  const url = process.env.REDIS_URL || 'redis://localhost:6379';

  const client = new Redis(url, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
  });

  client.on('error', () => {
    // Swallow — warnRedisDown() is called per failed operation instead
  });

  return client;
}

export const redis: Redis | null =
  globalForRedis.redis !== undefined
    ? globalForRedis.redis
    : (globalForRedis.redis = createRedisClient());

/** TTL presets in seconds */
export const TTL = {
  dashboard:       120,  // 2 min  — analytics cards
  dashboardParent:  60,  // 1 min  — per-child view
  notifications:    60,  // 1 min  — notification bell
  list:            300,  // 5 min  — paginated lists
} as const;

/**
 * Get a cached value. Falls back to in-memory cache when Redis is unavailable.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return memGet<T>(key);
  try {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    warnRedisDown();
    return memGet<T>(key);
  }
}

/**
 * Store a value in the cache with a TTL (seconds).
 * Falls back to in-memory cache when Redis is unavailable.
 */
export async function cacheSet(key: string, value: unknown, ttl: number): Promise<void> {
  if (!redis) { memSet(key, value, ttl); return; }
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttl);
  } catch {
    warnRedisDown();
    memSet(key, value, ttl);
  }
}

/**
 * Acquire a distributed lock. Returns true if the lock was acquired.
 * Falls back to true (allow compute) when Redis is unavailable.
 */
export async function tryLock(key: string, ttlSec = 10): Promise<boolean> {
  const lockKey = `lock:${key}`;
  if (!redis) {
    if (memGet(lockKey) !== null) return false; // already locked in mem
    memSet(lockKey, '1', ttlSec);
    return true;
  }
  try {
    const result = await redis.set(lockKey, '1', 'EX', ttlSec, 'NX');
    return result === 'OK';
  } catch {
    // Redis down — fall back to memory lock
    if (memGet(lockKey) !== null) return false;
    memSet(lockKey, '1', ttlSec);
    return true;
  }
}

/**
 * Release a previously acquired lock.
 */
export async function releaseLock(key: string): Promise<void> {
  const lockKey = `lock:${key}`;
  mem.delete(lockKey); // always clear mem lock
  if (!redis) return;
  try {
    await redis.del(lockKey);
  } catch {
    // Ignore
  }
}

/**
 * Invalidate all keys matching a glob pattern.
 * Uses SCAN (non-blocking) instead of KEYS to avoid stalling Redis.
 */
export async function cacheInvalidate(pattern: string): Promise<void> {
  if (!redis) return;
  try {
    let cursor = '0';
    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = next;
      if (keys.length) await redis.del(...keys);
    } while (cursor !== '0');
  } catch {
    // Ignore
  }
}
