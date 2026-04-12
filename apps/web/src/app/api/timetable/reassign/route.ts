import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const ALLOWED_ROLES = ['teacher', 'school_admin', 'principal', 'hod'];

/**
 * GET /api/timetable/reassign
 * Returns all active reassignments where the caller is the original or substitute teacher.
 * School admins see all reassignments for their school.
 *
 * POST /api/timetable/reassign
 * Body: { slotId, substituteTeacherId, startDate, endDate, reason? }
 * Teacher reassigns one of their own slots to a substitute.
 * School admin can pass any slotId (proxy mode).
 *
 * DELETE /api/timetable/reassign?id=<reassignmentId>
 * Cancels (soft-deletes) a reassignment.
 */

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!ALLOWED_ROLES.includes(primary.role_code)) throw new ForbiddenError();
    const schoolId = primary.school_id!;

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date'); // optional filter: active on this date

    const isAdmin = ['school_admin', 'principal', 'super_admin'].includes(primary.role_code);

    // Resolve teacher record for non-admin
    let teacherId: string | null = null;
    if (!isAdmin) {
      const t = await prisma.teacher.findFirst({ where: { schoolId, userId: user.id }, select: { id: true } });
      teacherId = t?.id ?? null;
    }

    const dateFilter = date
      ? { startDate: { lte: new Date(date) }, endDate: { gte: new Date(date) } }
      : {};

    const reassignments = await prisma.timetableReassignment.findMany({
      where: {
        isActive: true,
        ...dateFilter,
        ...(isAdmin
          ? { slot: { timetable: { schoolId } } }
          : teacherId
          ? { OR: [{ originalTeacherId: teacherId }, { substituteTeacherId: teacherId }] }
          : { id: 'none' }),
      },
      include: {
        slot: {
          include: {
            timetable: { select: { class: { select: { grade: true, section: true, name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Enrich with teacher names
    const allTeacherIds = [
      ...new Set(reassignments.flatMap(r => [r.originalTeacherId, r.substituteTeacherId])),
    ];
    const teacherUsers = await prisma.teacher.findMany({
      where: { id: { in: allTeacherIds } },
      select: { id: true, user: { select: { firstName: true, lastName: true } } },
    });
    const teacherMap = Object.fromEntries(teacherUsers.map(t => [t.id, `${t.user?.firstName} ${t.user?.lastName}`]));

    return Response.json({
      reassignments: reassignments.map(r => ({
        id:                   r.id,
        slotId:               r.slotId,
        subject:              r.slot.subject,
        dayOfWeek:            r.slot.dayOfWeek,
        periodNo:             r.slot.periodNo,
        startTime:            r.slot.startTime,
        endTime:              r.slot.endTime,
        className:            r.slot.timetable?.class?.name || `${r.slot.timetable?.class?.grade}-${r.slot.timetable?.class?.section}`,
        originalTeacherId:    r.originalTeacherId,
        originalTeacherName:  teacherMap[r.originalTeacherId] ?? 'Unknown',
        substituteTeacherId:  r.substituteTeacherId,
        substituteTeacherName: teacherMap[r.substituteTeacherId] ?? 'Unknown',
        startDate:            r.startDate,
        endDate:              r.endDate,
        reason:               r.reason,
        isActive:             r.isActive,
        createdAt:            r.createdAt,
      })),
    });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!ALLOWED_ROLES.includes(primary.role_code)) throw new ForbiddenError();
    const schoolId = primary.school_id!;

    const isAdmin = ['school_admin', 'principal', 'super_admin'].includes(primary.role_code);
    const { slotId, substituteTeacherId, startDate, endDate, reason, proxyTeacherId } = await request.json();

    if (!slotId || !substituteTeacherId || !startDate || !endDate)
      throw new AppError('slotId, substituteTeacherId, startDate, endDate are required');

    const start = new Date(startDate);
    const end   = new Date(endDate);
    if (end < start) throw new AppError('endDate must be on or after startDate');

    // Validate slot belongs to this school
    const slot = await prisma.timetableSlot.findFirst({
      where: { id: slotId, timetable: { schoolId } },
      select: { id: true, teacherId: true },
    });
    if (!slot) throw new AppError('Slot not found', 404);

    // Determine original teacher
    let originalTeacherId: string;
    if (isAdmin && proxyTeacherId) {
      // Admin acting as proxy for a specific teacher
      originalTeacherId = proxyTeacherId;
    } else {
      // Must be the assigned teacher of the slot
      const t = await prisma.teacher.findFirst({ where: { schoolId, userId: user.id }, select: { id: true } });
      if (!t) throw new AppError('Teacher record not found');
      if (!isAdmin && slot.teacherId !== t.id) throw new ForbiddenError('You can only reassign your own classes');
      originalTeacherId = slot.teacherId ?? t.id;
    }

    // Validate substitute teacher belongs to same school
    const substitute = await prisma.teacher.findFirst({
      where: { id: substituteTeacherId, schoolId },
      select: { id: true },
    });
    if (!substitute) throw new AppError('Substitute teacher not found in this school');

    // Check for overlapping active reassignment on same slot
    const overlapping = await prisma.timetableReassignment.findFirst({
      where: {
        slotId,
        isActive: true,
        startDate: { lte: end },
        endDate:   { gte: start },
      },
    });
    if (overlapping) throw new AppError('An active reassignment already exists for this slot in the selected date range');

    const reassignment = await prisma.timetableReassignment.create({
      data: {
        slotId,
        originalTeacherId,
        substituteTeacherId,
        startDate: start,
        endDate:   end,
        reason:    reason || null,
        createdBy: user.id,
        isActive:  true,
      },
    });

    return Response.json({ reassignment }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!ALLOWED_ROLES.includes(primary.role_code)) throw new ForbiddenError();
    const schoolId = primary.school_id!;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) throw new AppError('id is required');

    const isAdmin = ['school_admin', 'principal', 'super_admin'].includes(primary.role_code);

    // Verify ownership or admin
    if (!isAdmin) {
      const t = await prisma.teacher.findFirst({ where: { schoolId, userId: user.id }, select: { id: true } });
      const r = await prisma.timetableReassignment.findFirst({ where: { id } });
      if (!r || r.originalTeacherId !== t?.id) throw new ForbiddenError();
    }

    await prisma.timetableReassignment.update({
      where: { id },
      data: { isActive: false },
    });

    return Response.json({ success: true });
  } catch (err) { return handleError(err); }
}
