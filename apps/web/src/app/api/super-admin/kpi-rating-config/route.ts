import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

function isSuperAdmin(user: any) {
  return user.roles.some((r: any) => r.role_code === 'super_admin');
}

const SEGMENTS = ['academic', 'attendance', 'behavior'] as const;

const DEFAULTS: Record<string, object> = {
  academic:   { excellentMin: 90, goodMin: 75, averageMin: 60, belowAverageMin: 40 },
  attendance: { excellentMin: 95, goodMin: 85, averageMin: 75, belowAverageMin: 60 },
  behavior:   { behExcellentMax: 0, behGoodMax: 2, behAverageMax: 5, behBelowAvgMax: 10 },
};

// ── GET /api/super-admin/kpi-rating-config?schoolId=&academicYear= ────────────
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!isSuperAdmin(user)) throw new ForbiddenError('Super admin only');

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    if (!schoolId) throw new AppError('schoolId required');

    const stored = await prisma.kpiRatingConfig.findMany({ where: { schoolId } });

    const configs = SEGMENTS.map(segment => {
      const row = stored.find(r => r.segment === segment);
      return {
        segment,
        schoolId,
        ...(DEFAULTS[segment] as object),
        ...(row ? {
          excellentMin:    row.excellentMin,
          goodMin:         row.goodMin,
          averageMin:      row.averageMin,
          belowAverageMin: row.belowAverageMin,
          behExcellentMax: row.behExcellentMax,
          behGoodMax:      row.behGoodMax,
          behAverageMax:   row.behAverageMax,
          behBelowAvgMax:  row.behBelowAvgMax,
        } : {}),
      };
    });

    return Response.json({ configs });
  } catch (err) { return handleError(err); }
}

// ── POST /api/super-admin/kpi-rating-config ───────────────────────────────────
// Body: { schoolId, configs: [{ segment, excellentMin, goodMin, averageMin, belowAverageMin,
//                               behExcellentMax, behGoodMax, behAverageMax, behBelowAvgMax }] }
export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!isSuperAdmin(user)) throw new ForbiddenError('Super admin only');

    const body = await request.json();
    const { schoolId, configs } = body;

    if (!schoolId) throw new AppError('schoolId required');
    if (!Array.isArray(configs) || configs.length === 0) throw new AppError('configs array required');

    const results = await Promise.all(
      configs.map((cfg: any) => {
        if (!SEGMENTS.includes(cfg.segment)) throw new AppError(`Invalid segment: ${cfg.segment}`);
        return prisma.kpiRatingConfig.upsert({
          where:  { schoolId_segment: { schoolId, segment: cfg.segment } },
          create: {
            schoolId,
            segment:         cfg.segment,
            excellentMin:    cfg.excellentMin    ?? (DEFAULTS[cfg.segment] as any).excellentMin    ?? 90,
            goodMin:         cfg.goodMin         ?? (DEFAULTS[cfg.segment] as any).goodMin         ?? 75,
            averageMin:      cfg.averageMin      ?? (DEFAULTS[cfg.segment] as any).averageMin      ?? 60,
            belowAverageMin: cfg.belowAverageMin ?? (DEFAULTS[cfg.segment] as any).belowAverageMin ?? 40,
            behExcellentMax: cfg.behExcellentMax ?? (DEFAULTS[cfg.segment] as any).behExcellentMax ?? 0,
            behGoodMax:      cfg.behGoodMax      ?? (DEFAULTS[cfg.segment] as any).behGoodMax      ?? 2,
            behAverageMax:   cfg.behAverageMax   ?? (DEFAULTS[cfg.segment] as any).behAverageMax   ?? 5,
            behBelowAvgMax:  cfg.behBelowAvgMax  ?? (DEFAULTS[cfg.segment] as any).behBelowAvgMax  ?? 10,
            createdById:     user.id,
          },
          update: {
            ...(cfg.excellentMin    !== undefined ? { excellentMin:    cfg.excellentMin }    : {}),
            ...(cfg.goodMin         !== undefined ? { goodMin:         cfg.goodMin }         : {}),
            ...(cfg.averageMin      !== undefined ? { averageMin:      cfg.averageMin }      : {}),
            ...(cfg.belowAverageMin !== undefined ? { belowAverageMin: cfg.belowAverageMin } : {}),
            ...(cfg.behExcellentMax !== undefined ? { behExcellentMax: cfg.behExcellentMax } : {}),
            ...(cfg.behGoodMax      !== undefined ? { behGoodMax:      cfg.behGoodMax }      : {}),
            ...(cfg.behAverageMax   !== undefined ? { behAverageMax:   cfg.behAverageMax }   : {}),
            ...(cfg.behBelowAvgMax  !== undefined ? { behBelowAvgMax:  cfg.behBelowAvgMax }  : {}),
          },
        });
      }),
    );

    return Response.json({ updated: results.length, configs: results });
  } catch (err) { return handleError(err); }
}
