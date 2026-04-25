import { cacheGet, cacheSet, cacheInvalidate, tryLock, releaseLock } from '@/lib/redis';

export { cacheInvalidate };

export const CacheTTL = {
  dashboard: 120,  // 2 min
  dashboardParent: 60,  // 1 min
  notifications: 60,  // 1 min — notification bell
  list: 300,  // 5 min
} as const;

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


export async function setCache(
  key: string,
  value: any,
  ttl: number,
) {
  return await cacheSet(key, value, ttl);

}