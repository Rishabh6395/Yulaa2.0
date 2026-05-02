import { redis } from '@/lib/redis';
import { getUserFromRequest } from '@/lib/auth';

/**
 * GET /api/debug/redis-keys
 * Returns all Redis keys with TTL values.
 * Restricted to super_admin users only.
 */
export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const isSuperAdmin = user.roles.some(r => r.role_code === 'super_admin');
  if (!isSuperAdmin) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!redis) {
    return Response.json({ error: 'Redis not connected' }, { status: 503 });
  }

  try {
    const keys = await redis.keys('*');
    keys.sort();

    if (keys.length === 0) {
      return Response.json({ count: 0, keys: [] });
    }

    const pipeline = redis.pipeline();
    for (const key of keys) {
      pipeline.ttl(key);
    }
    const ttlResults = await pipeline.exec();

    const result = keys.map((key, i) => ({
      key,
      ttl: ttlResults?.[i]?.[1] as number ?? -1,
    }));

    return Response.json({ count: keys.length, keys: result });
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
