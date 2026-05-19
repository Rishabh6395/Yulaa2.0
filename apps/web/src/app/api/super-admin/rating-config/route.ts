/**
 * GET    /api/super-admin/rating-config?school_id=X  — get KPI rating config
 * POST   /api/super-admin/rating-config               — upsert rating config
 * DELETE /api/super-admin/rating-config?id=X          — delete override
 *
 * Segments: academic | attendance | behavior | extracurricular | composite
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const VALID_SEGMENTS = ['academic', 'attendance', 'behavior', 'extracurricular', 'composite'];

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const { searchParams } = new URL(request.url);
    const schoolId = primary.role_code === 'super_admin'
      ? searchParams.get('school_id') ?? primary.school_id
      : primary.school_id;
    if (!schoolId) throw new AppError('school_id required');

    const configs = await prisma.kpiRatingConfig.findMany({
      where: { schoolId },
      orderBy: { segment: 'asc' },
    });

    return Response.json({ configs });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!['super_admin', 'school_admin'].includes(primary.role_code))
      throw new ForbiddenError('Super admin or school admin required');

    const body = await request.json();
    const {
      schoolId: bodySchoolId, segment,
      excellentMin, goodMin, averageMin, belowAverageMin,
      behExcellentMax, behGoodMax, behAverageMax, behBelowAvgMax,
      weightAcademic, weightAttendance, weightBehavior, weightEco,
      ratingLabels,
    } = body;

    const schoolId = primary.role_code === 'super_admin' ? bodySchoolId : primary.school_id;
    if (!schoolId || !segment) throw new AppError('schoolId, segment required');
    if (!VALID_SEGMENTS.includes(segment)) throw new AppError(`Invalid segment. Valid: ${VALID_SEGMENTS.join(', ')}`);

    const config = await prisma.kpiRatingConfig.upsert({
      where:  { schoolId_segment: { schoolId, segment } },
      create: {
        schoolId, segment,
        excellentMin:    excellentMin    ?? 90,
        goodMin:         goodMin         ?? 75,
        averageMin:      averageMin      ?? 60,
        belowAverageMin: belowAverageMin ?? 40,
        behExcellentMax: behExcellentMax ?? 0,
        behGoodMax:      behGoodMax      ?? 2,
        behAverageMax:   behAverageMax   ?? 5,
        behBelowAvgMax:  behBelowAvgMax  ?? 10,
        weightAcademic:  weightAcademic  ?? 40,
        weightAttendance: weightAttendance ?? 30,
        weightBehavior:  weightBehavior  ?? 20,
        weightEco:       weightEco       ?? 10,
        ratingLabels:    ratingLabels    ?? null,
        createdById:     user.id,
      },
      update: {
        ...(excellentMin    !== undefined ? { excellentMin }    : {}),
        ...(goodMin         !== undefined ? { goodMin }         : {}),
        ...(averageMin      !== undefined ? { averageMin }      : {}),
        ...(belowAverageMin !== undefined ? { belowAverageMin } : {}),
        ...(behExcellentMax !== undefined ? { behExcellentMax } : {}),
        ...(behGoodMax      !== undefined ? { behGoodMax }      : {}),
        ...(behAverageMax   !== undefined ? { behAverageMax }   : {}),
        ...(behBelowAvgMax  !== undefined ? { behBelowAvgMax }  : {}),
        ...(weightAcademic  !== undefined ? { weightAcademic }  : {}),
        ...(weightAttendance !== undefined ? { weightAttendance } : {}),
        ...(weightBehavior  !== undefined ? { weightBehavior }  : {}),
        ...(weightEco       !== undefined ? { weightEco }       : {}),
        ...(ratingLabels    !== undefined ? { ratingLabels }    : {}),
      },
    });

    return Response.json({ config });
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (primary.role_code !== 'super_admin') throw new ForbiddenError('Super admin only');

    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new AppError('id required');

    await prisma.kpiRatingConfig.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
