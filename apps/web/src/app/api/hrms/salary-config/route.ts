/**
 * GET    /api/hrms/salary-config?school_id=X&teacher_id=X   — get salary config
 * POST   /api/hrms/salary-config                            — create / upsert config
 * PATCH  /api/hrms/salary-config?id=X                       — update config
 * DELETE /api/hrms/salary-config?id=X                       — delete config
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
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError('Admin role required');

    const { searchParams } = new URL(request.url);
    const schoolId  = await resolveSchoolId(user, searchParams.get('school_id'));
    const teacherId = searchParams.get('teacher_id');

    const configs = await prisma.staffSalaryConfig.findMany({
      where: { schoolId, ...(teacherId ? { teacherId } : {}) },
      include: {
        teacher: { select: { id: true, employeeId: true, designation: true, user: { select: { firstName: true, lastName: true } } } },
      },
    });

    return Response.json({ configs });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError('Admin role required');

    const body = await request.json();
    const {
      schoolId: sid, teacherId, basic, hra = 0, da = 0, ta = 0, otherAllowances = 0,
      pfPercent = 12, pfEmployer = 12, esiPercent = 0.75, esiEmployer = 3.25,
      tdsMonthly = 0, effectiveFrom,
    } = body;

    const schoolId = await resolveSchoolId(user, sid);
    if (!teacherId || !basic || !effectiveFrom) throw new AppError('teacherId, basic, effectiveFrom required');

    const teacher = await prisma.teacher.findFirst({ where: { id: teacherId, schoolId } });
    if (!teacher) throw new AppError('Teacher not found', 404);

    const config = await prisma.staffSalaryConfig.upsert({
      where:  { teacherId },
      create: {
        schoolId, teacherId, basic, hra, da, ta, otherAllowances,
        pfPercent, pfEmployer, esiPercent, esiEmployer, tdsMonthly,
        effectiveFrom: new Date(effectiveFrom),
        createdById: user.id,
      },
      update: {
        basic, hra, da, ta, otherAllowances,
        pfPercent, pfEmployer, esiPercent, esiEmployer, tdsMonthly,
        effectiveFrom: new Date(effectiveFrom),
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
    if (!ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError();

    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new AppError('id required');
    const cfg = await prisma.staffSalaryConfig.findUnique({ where: { id } });
    if (!cfg) throw new AppError('Config not found', 404);
    if (primary.school_id && cfg.schoolId !== primary.school_id) throw new ForbiddenError();

    const body = await request.json();
    const fields = ['basic','hra','da','ta','otherAllowances','pfPercent','pfEmployer','esiPercent','esiEmployer','tdsMonthly'];
    const data: Record<string, any> = {};
    for (const f of fields) { if (body[f] !== undefined) data[f] = body[f]; }
    if (body.effectiveFrom) data.effectiveFrom = new Date(body.effectiveFrom);

    const updated = await prisma.staffSalaryConfig.update({ where: { id }, data });
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
    const cfg = await prisma.staffSalaryConfig.findUnique({ where: { id } });
    if (!cfg) throw new AppError('Config not found', 404);
    if (primary.school_id && cfg.schoolId !== primary.school_id) throw new ForbiddenError();

    await prisma.staffSalaryConfig.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
