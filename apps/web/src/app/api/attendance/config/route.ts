/**
 * GET    /api/attendance/config           — get timing configs for school
 * POST   /api/attendance/config           — create/upsert timing config
 * DELETE /api/attendance/config?id=X      — remove a config entry
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const ADMIN_ROLES = ['super_admin', 'school_admin', 'principal'];

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const schoolId = primary.role_code === 'super_admin'
      ? new URL(request.url).searchParams.get('school_id') ?? primary.school_id
      : primary.school_id;
    if (!schoolId) throw new AppError('school_id required');

    const configs = await prisma.schoolTimingConfig.findMany({
      where: { schoolId },
      orderBy: [{ effectiveFrom: 'desc' }, { dayOfWeek: 'asc' }],
    });

    return Response.json({ configs });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError('Admin access required');

    const body = await request.json();
    const {
      schoolId: bodySchoolId, dayOfWeek, schoolStartTime, schoolEndTime,
      lateAfterMins, halfDayAfterMins, isHoliday, effectiveFrom,
    } = body;

    const schoolId = primary.role_code === 'super_admin' ? bodySchoolId : primary.school_id;
    if (!schoolId) throw new AppError('school_id required');
    if (dayOfWeek === undefined || !schoolStartTime || !schoolEndTime || !effectiveFrom)
      throw new AppError('dayOfWeek, schoolStartTime, schoolEndTime, effectiveFrom required');

    const config = await prisma.schoolTimingConfig.upsert({
      where: { schoolId_dayOfWeek_effectiveFrom: { schoolId, dayOfWeek, effectiveFrom: new Date(effectiveFrom) } },
      create: {
        schoolId, dayOfWeek,
        schoolStartTime, schoolEndTime,
        lateAfterMins:    lateAfterMins    ?? 15,
        halfDayAfterMins: halfDayAfterMins ?? 180,
        isHoliday:        isHoliday        ?? false,
        effectiveFrom:    new Date(effectiveFrom),
        createdById:      user.id,
      },
      update: {
        schoolStartTime, schoolEndTime,
        lateAfterMins:    lateAfterMins    ?? 15,
        halfDayAfterMins: halfDayAfterMins ?? 180,
        isHoliday:        isHoliday        ?? false,
      },
    });

    return Response.json({ config }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError();

    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new AppError('id required');

    const config = await prisma.schoolTimingConfig.findUnique({ where: { id } });
    if (!config) throw new AppError('Config not found', 404);
    if (primary.role_code !== 'super_admin' && config.schoolId !== primary.school_id) throw new ForbiddenError();

    await prisma.schoolTimingConfig.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
