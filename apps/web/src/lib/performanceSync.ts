import { cacheInvalidate } from '@/lib/redis';

/**
 * Invalidate dashboard and performance caches for a school after exam
 * approval or data changes. Fire-and-forget — never throws.
 */
export async function invalidatePerformanceCache(schoolId: string): Promise<void> {
  await Promise.allSettled([
    cacheInvalidate(`dashboard:admin:${schoolId}`),
    cacheInvalidate(`dashboard:teacher:*:${schoolId}`),
  ]);
}
