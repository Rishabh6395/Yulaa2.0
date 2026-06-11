/**
 * GET /api/health
 *
 * Readiness probe for load balancers, uptime monitors, and k8s.
 * Public route — no JWT required (listed in middleware PUBLIC_PREFIXES).
 *
 * Returns 200 when healthy, 503 when DB is unreachable.
 * Response includes component status so dashboards can pinpoint degradation.
 */
import prisma from '@/lib/prisma';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
  const start = Date.now();

  const [dbStatus, redisStatus] = await Promise.all([
    prisma.$queryRaw`SELECT 1`
      .then(() => 'ok' as const)
      .catch(() => 'error' as const),
    redis
      ? redis.ping().then(() => 'ok' as const).catch(() => 'degraded' as const)
      : Promise.resolve('not_configured' as const),
  ]);

  const healthy = dbStatus === 'ok';
  const status  = healthy ? 200 : 503;

  return Response.json(
    {
      status:    healthy ? 'healthy' : 'degraded',
      db:        dbStatus,
      redis:     redisStatus,
      latencyMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    },
    { status },
  );
}
