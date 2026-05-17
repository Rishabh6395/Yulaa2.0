/**
 * GET    /api/super-admin/academic-years?school_id=X   — list academic years
 * POST   /api/super-admin/academic-years               — create academic year
 * PATCH  /api/super-admin/academic-years?id=X          — update / set active
 * DELETE /api/super-admin/academic-years?id=X          — delete (only if no linked data)
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const ADMIN_ROLES = ['super_admin', 'school_admin', 'principal'];

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

    const years = await prisma.academicYear.findMany({
      where: { schoolId },
      orderBy: { startDate: 'desc' },
    });

    return Response.json({ years });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError('Admin role required');

    const body = await request.json();
    const { schoolId: bodySchoolId, label, startDate, endDate, isActive } = body;
    const schoolId = await resolveSchoolId(user, bodySchoolId);

    if (!label || !startDate || !endDate) throw new AppError('label, startDate, endDate required');

    const start = new Date(startDate);
    const end   = new Date(endDate);
    if (end <= start) throw new AppError('endDate must be after startDate');

    // If setting active, deactivate others first
    if (isActive) {
      await prisma.academicYear.updateMany({
        where: { schoolId, isActive: true },
        data:  { isActive: false },
      });
    }

    const year = await prisma.academicYear.create({
      data: { schoolId, label, startDate: start, endDate: end, isActive: isActive ?? false, createdById: user.id },
    });

    return Response.json({ year }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError('Admin role required');

    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new AppError('id required');

    const year = await prisma.academicYear.findUnique({ where: { id } });
    if (!year) throw new AppError('Academic year not found', 404);

    // Non-super_admin scoped to own school
    if (primary.school_id && year.schoolId !== primary.school_id) throw new ForbiddenError();

    const body = await request.json();

    // If activating this year, deactivate siblings
    if (body.isActive === true) {
      await prisma.academicYear.updateMany({
        where: { schoolId: year.schoolId, isActive: true },
        data:  { isActive: false },
      });
    }

    const updated = await prisma.academicYear.update({
      where: { id },
      data: {
        ...(body.label     !== undefined ? { label: body.label }                     : {}),
        ...(body.startDate !== undefined ? { startDate: new Date(body.startDate) }   : {}),
        ...(body.endDate   !== undefined ? { endDate: new Date(body.endDate) }       : {}),
        ...(body.isActive  !== undefined ? { isActive: body.isActive }               : {}),
      },
    });

    return Response.json({ year: updated });
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

    const year = await prisma.academicYear.findUnique({ where: { id } });
    if (!year) throw new AppError('Academic year not found', 404);
    if (primary.school_id && year.schoolId !== primary.school_id) throw new ForbiddenError();

    await prisma.academicYear.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
