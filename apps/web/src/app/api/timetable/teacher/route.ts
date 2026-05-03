import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';
import { currentAcademicYearLabel } from '@/lib/school-utils';

/**
 * GET /api/timetable/teacher?date=YYYY-MM-DD
 *
 * Returns two kinds of slots for the requested date:
 *   1. "assigned" — slots originally assigned to this teacher (dayOfWeek match),
 *      filtered out if there is an active reassignment handing them off to someone else.
 *   2. "substitute" — slots that were reassigned TO this teacher for the date range
 *      covering the requested date.
 *
 * Each slot carries a `slotType: 'assigned' | 'substitute' | 'reassigned_away'` flag
 * so the UI can colour-code them.
 */
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!['teacher', 'school_admin', 'principal', 'hod'].includes(primary.role_code)) throw new ForbiddenError();

    const schoolId = primary.school_id;
    if (!schoolId) throw new AppError('No school assigned');

    const { searchParams } = new URL(request.url);
    const date       = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const dayOfWeek  = new Date(date + 'T00:00:00Z').getUTCDay(); // 0=Sun, 1=Mon...
    const dateObj    = new Date(date + 'T00:00:00Z');

    // Resolve teacher record
    const teacher = await prisma.teacher.findFirst({
      where: { schoolId, userId: user.id },
      select: { id: true },
    });
    if (!teacher) return Response.json({ slots: [], date, dayOfWeek });

    // ── 1. Fetch originally-assigned slots for this day ──────────────────────
    const assignedSlots = await prisma.timetableSlot.findMany({
      where: {
        teacherId: teacher.id,
        dayOfWeek,
        timetable: { schoolId, academicYear: currentAcademicYearLabel() },
      },
      include: {
        timetable:      { select: { classId: true, class: { select: { name: true, grade: true, section: true } } } },
        logs:           { where: { date: dateObj }, take: 1 },
        reassignments:  {
          where: {
            isActive:  true,
            startDate: { lte: dateObj },
            endDate:   { gte: dateObj },
          },
        },
      },
      orderBy: { periodNo: 'asc' },
    });

    // ── 2. Fetch substitute slots (reassigned TO this teacher for today) ─────
    const substituteReassignments = await prisma.timetableReassignment.findMany({
      where: {
        substituteTeacherId: teacher.id,
        isActive:  true,
        startDate: { lte: dateObj },
        endDate:   { gte: dateObj },
      },
      include: {
        slot: {
          include: {
            timetable: { select: { classId: true, class: { select: { name: true, grade: true, section: true } } } },
            logs:      { where: { date: dateObj }, take: 1 },
          },
        },
      },
    });

    // ── 3. Shape output ───────────────────────────────────────────────────────
    const slots = [
      // Original slots: mark as 'reassigned_away' if handed off, otherwise 'assigned'
      // (dayOfWeek already filtered in query, no additional filter needed)
      ...assignedSlots
        .map(s => {
          const activeReassignment = s.reassignments[0];
          return {
            ...s,
            reassignments: undefined,
            slotType:   activeReassignment ? 'reassigned_away' : 'assigned',
            reassignedTo: activeReassignment
              ? { reassignmentId: activeReassignment.id, substituteTeacherId: activeReassignment.substituteTeacherId, endDate: activeReassignment.endDate }
              : null,
          };
        }),
      // Substitute slots: always 'substitute'
      ...substituteReassignments
        .filter(r => r.slot.dayOfWeek === dayOfWeek)
        .map(r => ({
          ...r.slot,
          slotType:       'substitute',
          originalTeacherId: r.originalTeacherId,
          reassignmentId: r.id,
          endDate:        r.endDate,
          reason:         r.reason,
        })),
    ].sort((a, b) => a.periodNo - b.periodNo);

    return Response.json({ slots, date, dayOfWeek });
  } catch (err) { return handleError(err); }
}
