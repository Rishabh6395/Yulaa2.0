import { cacheGet, cacheSet, cacheInvalidate, tryLock, releaseLock } from '@/lib/redis';

export { cacheInvalidate };

export const CacheTTL = {
  dashboard:       parseInt(process.env.CACHE_TTL_DASHBOARD        || '120', 10),
  dashboardParent: parseInt(process.env.CACHE_TTL_DASHBOARD_PARENT || '60',  10),
  notifications:   parseInt(process.env.CACHE_TTL_NOTIFICATIONS    || '60',  10),
  list:            parseInt(process.env.CACHE_TTL_LIST             || '300', 10),
};

/**
 * Fetch data from cache, or compute it and store the result.
 */
export async function withCache<T>(
  key: string,
  ttl: number,
  fn: () => Promise<T>,
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  const result = await fn();
  await cacheSet(key, result, ttl);
  return result;
}

/**
 * Cache-aside with stampede protection via distributed lock.
 *
 * Flow:
 *  1. Cache hit  → return immediately
 *  2. Lock acquired → compute, store, release lock
 *  3. Lock contended → wait 150 ms, retry cache (another worker is computing)
 *     If still empty after retry → compute without lock (safe fallback)
 */
export async function withCacheLock<T>(
  key: string,
  ttl: number,
  fn: () => Promise<T>,
): Promise<T> {
  // 1. Cache hit
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  // 2. Try to acquire lock
  const locked = await tryLock(key, 10);
  if (locked) {
    try {
      // Double-check after acquiring lock (another worker may have just filled it)
      const recheck = await cacheGet<T>(key);
      if (recheck !== null) return recheck;

      const result = await fn();
      await cacheSet(key, result, ttl);
      return result;
    } finally {
      await releaseLock(key);
    }
  }

  // 3. Lock contended — wait briefly, then retry cache
  await new Promise((r) => setTimeout(r, 150));
  const retried = await cacheGet<T>(key);
  if (retried !== null) return retried;

  // Fallback: compute anyway (avoids starvation if lock holder crashed)
  const result = await fn();
  await cacheSet(key, result, ttl);
  return result;
}
