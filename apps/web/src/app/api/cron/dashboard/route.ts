/**
 * GET /api/cron/dashboard
 *
 * Triggers precomputation of all dashboard data into Redis.
 * Protected by CRON_SECRET — only Vercel Cron (or your scheduler) should call this.
 *
 * Vercel cron.json example:
 *   { "crons": [{ "path": "/api/cron/dashboard", "schedule": "* /2 * * * *" }] }
 */

import { precomputeAllDashboards } from '@/jobs/precompute';

export const runtime = 'nodejs';
// Disable Next.js response caching for this route
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  // Fail closed: CRON_SECRET must be configured. Omitting it would leave this
  // endpoint open to any caller, allowing unlimited precompute / Redis flood.
  if (!secret) {
    return Response.json({ error: 'CRON_SECRET is not configured' }, { status: 500 });
  }
  const auth = request.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const started = Date.now();
  try {
    const result = await precomputeAllDashboards();
    return Response.json({
      ok:      true,
      keys:    result.computed.length,
      elapsed: `${Date.now() - started}ms`,
    });
  } catch (err) {
    console.error('[cron/dashboard]', err);
    return Response.json({ ok: false, error: err instanceof Error ? err.message : 'Precompute failed' }, { status: 500 });
  }
}
