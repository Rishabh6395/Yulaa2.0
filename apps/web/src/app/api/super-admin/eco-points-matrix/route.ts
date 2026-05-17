/**
 * GET    /api/super-admin/eco-points-matrix?school_id=X   — list matrix entries
 * POST   /api/super-admin/eco-points-matrix               — create / upsert entry
 * PATCH  /api/super-admin/eco-points-matrix?id=X          — update entry
 * DELETE /api/super-admin/eco-points-matrix?id=X          — delete entry
 *
 * Matrix defines: for a given (level, achievement) combination → points awarded.
 * Used by /api/performance/extracurricular to auto-assign ECO points.
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

async function resolveSchoolId(user: any, override?: string | null): Promise<string> {
  const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  if (primary.role_code === 'super_admin' && override) return override;
  if (primary.school_id) return primary.school_id;
  throw new AppError('school_id required');
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const { searchParams } = new URL(request.url);
    const schoolId = await resolveSchoolId(user, searchParams.get('school_id'));

    const matrix = await prisma.ecoPointsMatrix.findMany({
      where: { schoolId },
      orderBy: [{ level: 'asc' }, { achievement: 'asc' }],
    });

    return Response.json({ matrix });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!['super_admin', 'school_admin'].includes(primary.role_code))
      throw new ForbiddenError('Admin required');

    const body = await request.json();
    const { schoolId: bodySchoolId, level, achievement, points } = body;
    const schoolId = await resolveSchoolId(user, bodySchoolId);

    if (!level || !achievement || points === undefined)
      throw new AppError('level, achievement, points required');
    if (typeof points !== 'number' || points < 0)
      throw new AppError('points must be a non-negative number');

    // Upsert so admins can call POST to update existing entries
    const entry = await prisma.ecoPointsMatrix.upsert({
      where:  { schoolId_level_achievement: { schoolId, level, achievement } },
      create: { schoolId, level, achievement, points },
      update: { points },
    });

    return Response.json({ entry }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!['super_admin', 'school_admin'].includes(primary.role_code)) throw new ForbiddenError();

    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new AppError('id required');

    const entry = await prisma.ecoPointsMatrix.findUnique({ where: { id } });
    if (!entry) throw new AppError('Matrix entry not found', 404);
    if (primary.school_id && entry.schoolId !== primary.school_id) throw new ForbiddenError();

    const body = await request.json();
    if (body.points !== undefined && (typeof body.points !== 'number' || body.points < 0))
      throw new AppError('points must be a non-negative number');

    const updated = await prisma.ecoPointsMatrix.update({
      where: { id },
      data: {
        ...(body.level       !== undefined ? { level: body.level }             : {}),
        ...(body.achievement !== undefined ? { achievement: body.achievement } : {}),
        ...(body.points      !== undefined ? { points: body.points }           : {}),
      },
    });

    return Response.json({ entry: updated });
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!['super_admin', 'school_admin'].includes(primary.role_code)) throw new ForbiddenError();

    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new AppError('id required');

    const entry = await prisma.ecoPointsMatrix.findUnique({ where: { id } });
    if (!entry) throw new AppError('Matrix entry not found', 404);
    if (primary.school_id && entry.schoolId !== primary.school_id) throw new ForbiddenError();

    await prisma.ecoPointsMatrix.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
