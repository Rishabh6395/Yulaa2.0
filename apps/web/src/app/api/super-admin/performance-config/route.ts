/**
 * GET  /api/super-admin/performance-config?school_id=X
 *
 * Returns ALL performance configuration for a school in a single response:
 *   - KPI definitions (enabled/disabled, weights)     → kpiConfig
 *   - Rating thresholds (per segment)                  → ratingConfig
 *   - Composite weights (academic/attendance/behavior) → compositeWeights
 *   - Risk scoring thresholds                          → riskConfig
 *   - Behavior incident types + KPI weights            → behaviorConfig
 *   - Grading scheme (percentage → grade)              → gradingScheme
 *   - Subject catalog (per grade level)                → subjects
 *   - Available performance templates                  → templates
 *   - ECO points matrix                                → ecoMatrix
 *
 * PATCH /api/super-admin/performance-config?school_id=X
 *   Bulk-update composite weights for the school's composite segment in KpiRatingConfig.
 *   Body: { weightAcademic, weightAttendance, weightBehavior, weightEco }
 *
 * Super admin only.
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import { KPI_DEFINITIONS } from '@/lib/kpiDefinitions';
import prisma from '@/lib/prisma';

function assertSuperAdmin(user: any) {
  const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  if (primary.role_code !== 'super_admin') throw new ForbiddenError('Super admin only');
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    assertSuperAdmin(user);

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');
    if (!schoolId) throw new AppError('school_id required');

    const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { id: true, name: true } });
    if (!school) throw new AppError('School not found', 404);

    const [
      kpiConfigs, ratingConfigs, riskConfigs,
      behaviorConfigs, gradingSchemes, subjects, templates, ecoMatrix,
    ] = await Promise.all([
      prisma.schoolKpiConfig.findMany({ where: { schoolId } }),
      prisma.kpiRatingConfig.findMany({ where: { schoolId } }),
      prisma.performanceRiskConfig.findMany({ where: { OR: [{ schoolId }, { schoolId: null }] }, orderBy: { grade: 'asc' } }),
      prisma.behaviorKpiConfig.findMany({ where: { schoolId }, orderBy: { incidentType: 'asc' } }),
      prisma.gradingScheme.findMany({ where: { schoolId }, orderBy: [{ gradeLevel: 'asc' }, { minPct: 'desc' }] }),
      prisma.subjectCatalog.findMany({ where: { schoolId }, orderBy: [{ gradeLevel: 'asc' }, { subject: 'asc' }] }),
      prisma.performanceTemplate.findMany({ where: { isActive: true }, orderBy: { cycleType: 'asc' } }),
      prisma.ecoPointsMatrix.findMany({ where: { schoolId }, orderBy: { category: 'asc' } }),
    ]);

    // Merge KPI definitions with per-school overrides
    const cfgMap = Object.fromEntries(kpiConfigs.map(k => [k.kpiCode, k]));
    const kpiList = KPI_DEFINITIONS.map(def => ({
      ...def,
      isEnabled:  cfgMap[def.code]?.isEnabled  ?? true,
      weight:     cfgMap[def.code]?.weight      ?? def.defaultWeight ?? 1,
      target:     cfgMap[def.code]?.target      ?? def.defaultTarget ?? null,
      configId:   cfgMap[def.code]?.id          ?? null,
    }));

    // Extract composite weights
    const compositeConfig = ratingConfigs.find(r => r.segment === 'composite');
    const compositeWeights = {
      academic:   compositeConfig?.weightAcademic   ?? 40,
      attendance: compositeConfig?.weightAttendance ?? 30,
      behavior:   compositeConfig?.weightBehavior   ?? 20,
      eco:        compositeConfig?.weightEco        ?? 10,
    };

    return Response.json({
      school,
      kpiConfig:       kpiList,
      ratingConfig:    ratingConfigs,
      compositeWeights,
      riskConfig:      riskConfigs,
      behaviorConfig:  behaviorConfigs,
      gradingScheme:   gradingSchemes,
      subjects,
      templates,
      ecoMatrix,
    });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    assertSuperAdmin(user);

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');
    if (!schoolId) throw new AppError('school_id required');

    const body = await request.json();
    const { weightAcademic, weightAttendance, weightBehavior, weightEco } = body;

    if (weightAcademic === undefined || weightAttendance === undefined ||
        weightBehavior === undefined || weightEco === undefined)
      throw new AppError('weightAcademic, weightAttendance, weightBehavior, weightEco all required');

    const total = weightAcademic + weightAttendance + weightBehavior + weightEco;
    if (total !== 100) throw new AppError(`Weights must sum to 100. Got ${total}`);

    const existing = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!existing) throw new AppError('School not found', 404);

    const compositeConfig = await prisma.kpiRatingConfig.upsert({
      where:  { schoolId_segment: { schoolId, segment: 'composite' } },
      create: {
        schoolId, segment: 'composite',
        weightAcademic, weightAttendance, weightBehavior, weightEco,
        createdById: user.id,
      },
      update: { weightAcademic, weightAttendance, weightBehavior, weightEco },
    });

    return Response.json({ compositeWeights: { academic: weightAcademic, attendance: weightAttendance, behavior: weightBehavior, eco: weightEco }, config: compositeConfig });
  } catch (err) { return handleError(err); }
}
