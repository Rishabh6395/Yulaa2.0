/**
 * GET    /api/performance/behavior/kpi-config              — list incident type catalog
 * POST   /api/performance/behavior/kpi-config              — create incident type (super_admin)
 * PATCH  /api/performance/behavior/kpi-config?id=X         — update
 * DELETE /api/performance/behavior/kpi-config?id=X         — delete
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

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

    const configs = await prisma.behaviorKpiConfig.findMany({
      where: { schoolId },
      orderBy: [{ incidentType: 'asc' }, { label: 'asc' }],
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
      throw new ForbiddenError('Admin required');

    const body = await request.json();
    const { schoolId: bodySchoolId, incidentType, code, label, weight, severity } = body;
    const schoolId = primary.role_code === 'super_admin' ? bodySchoolId : primary.school_id;
    if (!schoolId || !incidentType || !code || !label || weight === undefined)
      throw new AppError('schoolId, incidentType, code, label, weight required');
    if (!['positive', 'negative'].includes(incidentType)) throw new AppError('incidentType must be positive or negative');

    const config = await prisma.behaviorKpiConfig.create({
      data: {
        schoolId, incidentType, code, label,
        weight:    incidentType === 'negative' ? -Math.abs(weight) : Math.abs(weight),
        severity:  severity ?? null,
        createdById: user.id,
      },
    });

    return Response.json({ config }, { status: 201 });
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

    const body = await request.json();
    const cfg = await prisma.behaviorKpiConfig.findUnique({ where: { id } });
    if (!cfg) throw new AppError('Config not found', 404);
    if (primary.school_id && cfg.schoolId !== primary.school_id) throw new ForbiddenError();

    const updated = await prisma.behaviorKpiConfig.update({
      where: { id },
      data: {
        ...(body.label    !== undefined ? { label: body.label }       : {}),
        ...(body.weight   !== undefined ? { weight: body.weight }     : {}),
        ...(body.severity !== undefined ? { severity: body.severity } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    });

    return Response.json({ config: updated });
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

    const cfg = await prisma.behaviorKpiConfig.findUnique({ where: { id } });
    if (!cfg) throw new AppError('Config not found', 404);
    if (primary.school_id && cfg.schoolId !== primary.school_id) throw new ForbiddenError();

    await prisma.behaviorKpiConfig.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
