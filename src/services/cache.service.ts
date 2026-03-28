import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/redis';

export { cacheInvalidate };

export const CacheTTL = {
  dashboard:       120,  // 2 min
  dashboardParent:  60,  // 1 min
  notifications:    60,  // 1 min — notification bell
  list:            300,  // 5 min
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
