import { redis } from '@/lib/redis';

/**
 * GET /api/debug/redis-keys
 * Returns all Redis keys with their TTL and value preview.
 * Protected: only works in development OR when ?secret= matches DEBUG_SECRET env var.
 */
export async function GET(request: Request) {
  const isDev   = process.env.NODE_ENV === 'development';
  const secret  = process.env.DEBUG_SECRET;
  const { searchParams } = new URL(request.url);

  // Block in production unless correct secret is provided
  if (!isDev) {
    if (!secret || searchParams.get('secret') !== secret) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
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

    // Fetch TTL for every key in one pipeline
    const pipeline = redis.pipeline();
    for (const key of keys) {
      pipeline.ttl(key);
    }
    const ttlResults = await pipeline.exec();

    const result = keys.map((key, i) => ({
      key,
      ttl: ttlResults?.[i]?.[1] as number ?? -1,   // seconds remaining, -1 = no expiry, -2 = gone
    }));

    return Response.json({ count: keys.length, keys: result });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
