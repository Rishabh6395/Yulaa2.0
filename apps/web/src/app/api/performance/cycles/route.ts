/**
 * GET    /api/performance/cycles          — list cycles for school
 * POST   /api/performance/cycles          — create cycle (admin/super_admin)
 * PATCH  /api/performance/cycles?id=X    — update status / lock / publish
 * DELETE /api/performance/cycles?id=X    — delete upcoming cycle
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const ADMIN_ROLES = ['super_admin', 'school_admin', 'principal'];

function resolveSchool(user: any, override?: string | null): string {
  const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  if (primary.role_code === 'super_admin' && override) return override;
  if (primary.school_id) return primary.school_id;
  throw new AppError('No school context', 400);
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const { searchParams } = new URL(request.url);
    const schoolId = resolveSchool(user, searchParams.get('school_id'));
    const academicYear = searchParams.get('academic_year') ?? undefined;

    const cycles = await prisma.performanceCycle.findMany({
      where: { schoolId, ...(academicYear ? { academicYear } : {}) },
      orderBy: [{ academicYear: 'desc' }, { startDate: 'asc' }],
      include: {
        _count: { select: { exams: true, reportCards: true, attendanceSummaries: true } },
      },
    });

    return Response.json({ cycles });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError('Admin access required');

    const body = await request.json();
    const { schoolId: bodySchoolId, name, cycleType, academicYear, startDate, endDate, reportCardTemplate } = body;
    const schoolId = resolveSchool(user, bodySchoolId);

    if (!name || !cycleType || !academicYear || !startDate || !endDate)
      throw new AppError('name, cycleType, academicYear, startDate, endDate are required');

    const validTypes = ['monthly', 'quarterly', 'half_yearly', 'yearly', 'custom'];
    if (!validTypes.includes(cycleType)) throw new AppError('Invalid cycleType');

    const cycle = await prisma.performanceCycle.create({
      data: {
        schoolId,
        name,
        cycleType,
        academicYear,
        startDate: new Date(startDate),
        endDate:   new Date(endDate),
        reportCardTemplate: reportCardTemplate ?? null,
        status:    'upcoming',
        isActive:  false,
        createdById: user.id,
      },
    });

    return Response.json({ cycle }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError('Admin access required');

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) throw new AppError('id required');

    const body = await request.json();
    const { action, name, reportCardTemplate, startDate, endDate } = body;

    const existing = await prisma.performanceCycle.findUnique({ where: { id } });
    if (!existing) throw new AppError('Cycle not found', 404);

    const schoolId = resolveSchool(user, null);
    if (primary.role_code !== 'super_admin' && existing.schoolId !== schoolId) throw new ForbiddenError();

    const updates: any = {};

    if (action === 'activate') {
      // Deactivate others for same school + year
      await prisma.performanceCycle.updateMany({
        where: { schoolId: existing.schoolId, academicYear: existing.academicYear, isActive: true },
        data:  { isActive: false },
      });
      updates.status   = 'active';
      updates.isActive = true;
    } else if (action === 'lock') {
      updates.status   = 'locked';
      updates.isActive = false;
      updates.lockedAt = new Date();
    } else if (action === 'publish_reports') {
      updates.status            = 'report_published';
      updates.reportPublishedAt = new Date();
    } else {
      if (name)                 updates.name = name;
      if (reportCardTemplate)   updates.reportCardTemplate = reportCardTemplate;
      if (startDate)            updates.startDate = new Date(startDate);
      if (endDate)              updates.endDate   = new Date(endDate);
    }

    const cycle = await prisma.performanceCycle.update({ where: { id }, data: updates });
    return Response.json({ cycle });
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) throw new AppError('id required');

    const cycle = await prisma.performanceCycle.findUnique({ where: { id } });
    if (!cycle) throw new AppError('Cycle not found', 404);
    if (cycle.status !== 'upcoming') throw new AppError('Only upcoming cycles can be deleted');

    await prisma.performanceCycle.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
