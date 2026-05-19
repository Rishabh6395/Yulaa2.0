import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

function isSuperAdmin(user: any) {
  return user.roles.some((r: any) => r.role_code === 'super_admin');
}

const SEGMENTS = ['academic', 'attendance', 'behavior', 'extracurricular', 'composite'] as const;

const DEFAULTS: Record<string, object> = {
  academic:        { excellentMin: 90, goodMin: 75, averageMin: 60, belowAverageMin: 40 },
  attendance:      { excellentMin: 95, goodMin: 85, averageMin: 75, belowAverageMin: 60 },
  behavior:        { behExcellentMax: 0, behGoodMax: 2, behAverageMax: 5, behBelowAvgMax: 10 },
  extracurricular: { ecoExcellentMin: 85, ecoGoodMin: 70, ecoAverageMin: 50, ecoBelowAvgMin: 30 },
  composite:       { weightAcademic: 40, weightAttendance: 30, weightBehavior: 20, weightEco: 10 },
};

// ── GET /api/super-admin/kpi-rating-config?schoolId= ─────────────────────────
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
          ecoExcellentMin: row.ecoExcellentMin,
          ecoGoodMin:      row.ecoGoodMin,
          ecoAverageMin:   row.ecoAverageMin,
          ecoBelowAvgMin:  row.ecoBelowAvgMin,
          weightAcademic:  row.weightAcademic,
          weightAttendance:row.weightAttendance,
          weightBehavior:  row.weightBehavior,
          weightEco:       row.weightEco,
          ratingLabels:    row.ratingLabels,
          ratingScale:     row.ratingScale,
        } : {}),
      };
    });

    return Response.json({ configs });
  } catch (err) { return handleError(err); }
}

// ── POST /api/super-admin/kpi-rating-config ───────────────────────────────────
// Body: { schoolId, configs: [{ segment, ...thresholds }] }
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
        const def = DEFAULTS[cfg.segment] as any;

        // Validate composite weights sum to 100 if provided
        if (cfg.segment === 'composite') {
          const wa = cfg.weightAcademic   ?? def.weightAcademic;
          const wt = cfg.weightAttendance ?? def.weightAttendance;
          const wb = cfg.weightBehavior   ?? def.weightBehavior;
          const we = cfg.weightEco        ?? def.weightEco;
          if (wa + wt + wb + we !== 100)
            throw new AppError(`Composite weights must sum to 100. Got ${wa + wt + wb + we}`);
        }

        return prisma.kpiRatingConfig.upsert({
          where:  { schoolId_segment: { schoolId, segment: cfg.segment } },
          create: {
            schoolId,
            segment:         cfg.segment,
            excellentMin:    cfg.excellentMin    ?? def.excellentMin    ?? 90,
            goodMin:         cfg.goodMin         ?? def.goodMin         ?? 75,
            averageMin:      cfg.averageMin      ?? def.averageMin      ?? 60,
            belowAverageMin: cfg.belowAverageMin ?? def.belowAverageMin ?? 40,
            behExcellentMax: cfg.behExcellentMax ?? def.behExcellentMax ?? 0,
            behGoodMax:      cfg.behGoodMax      ?? def.behGoodMax      ?? 2,
            behAverageMax:   cfg.behAverageMax   ?? def.behAverageMax   ?? 5,
            behBelowAvgMax:  cfg.behBelowAvgMax  ?? def.behBelowAvgMax  ?? 10,
            ecoExcellentMin: cfg.ecoExcellentMin ?? def.ecoExcellentMin ?? 85,
            ecoGoodMin:      cfg.ecoGoodMin      ?? def.ecoGoodMin      ?? 70,
            ecoAverageMin:   cfg.ecoAverageMin   ?? def.ecoAverageMin   ?? 50,
            ecoBelowAvgMin:  cfg.ecoBelowAvgMin  ?? def.ecoBelowAvgMin  ?? 30,
            weightAcademic:  cfg.weightAcademic  ?? def.weightAcademic  ?? 40,
            weightAttendance:cfg.weightAttendance?? def.weightAttendance ?? 30,
            weightBehavior:  cfg.weightBehavior  ?? def.weightBehavior  ?? 20,
            weightEco:       cfg.weightEco       ?? def.weightEco       ?? 10,
            ratingLabels:    cfg.ratingLabels    ?? null,
            ratingScale:     cfg.ratingScale     ?? null,
            createdById:     user.id,
          },
          update: {
            ...(cfg.excellentMin    !== undefined && { excellentMin:    cfg.excellentMin }),
            ...(cfg.goodMin         !== undefined && { goodMin:         cfg.goodMin }),
            ...(cfg.averageMin      !== undefined && { averageMin:      cfg.averageMin }),
            ...(cfg.belowAverageMin !== undefined && { belowAverageMin: cfg.belowAverageMin }),
            ...(cfg.behExcellentMax !== undefined && { behExcellentMax: cfg.behExcellentMax }),
            ...(cfg.behGoodMax      !== undefined && { behGoodMax:      cfg.behGoodMax }),
            ...(cfg.behAverageMax   !== undefined && { behAverageMax:   cfg.behAverageMax }),
            ...(cfg.behBelowAvgMax  !== undefined && { behBelowAvgMax:  cfg.behBelowAvgMax }),
            ...(cfg.ecoExcellentMin !== undefined && { ecoExcellentMin: cfg.ecoExcellentMin }),
            ...(cfg.ecoGoodMin      !== undefined && { ecoGoodMin:      cfg.ecoGoodMin }),
            ...(cfg.ecoAverageMin   !== undefined && { ecoAverageMin:   cfg.ecoAverageMin }),
            ...(cfg.ecoBelowAvgMin  !== undefined && { ecoBelowAvgMin:  cfg.ecoBelowAvgMin }),
            ...(cfg.weightAcademic  !== undefined && { weightAcademic:  cfg.weightAcademic }),
            ...(cfg.weightAttendance!== undefined && { weightAttendance:cfg.weightAttendance }),
            ...(cfg.weightBehavior  !== undefined && { weightBehavior:  cfg.weightBehavior }),
            ...(cfg.weightEco       !== undefined && { weightEco:       cfg.weightEco }),
            ...(cfg.ratingLabels    !== undefined && { ratingLabels:    cfg.ratingLabels }),
            ...(cfg.ratingScale     !== undefined && { ratingScale:     cfg.ratingScale }),
          },
        });
      }),
    );

    return Response.json({ updated: results.length, configs: results });
  } catch (err) { return handleError(err); }
}
