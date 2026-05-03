import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError } from '@/utils/errors';
import prisma from '@/lib/prisma';
import { WEEKOFF_EPOCH_DATES } from '@/lib/school-utils';

/**
 * GET /api/holidays?year=2025-2026[&studentId=xxx]
 * Returns the school's holiday list and weekoff days.
 *
 * When studentId is supplied (parent/student view):
 *   weekoffDays = days NOT covered by the student's class timetable.
 *   Falls back to the leave-config weekoff if no timetable exists.
 *
 * For all other callers:
 *   weekoffDays = school's weekoff configuration from Leave Calendar.
 */
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const url          = new URL(request.url);
    const academicYear = url.searchParams.get('year') || '2025-2026';
    const studentId    = url.searchParams.get('studentId');

    // Resolve schoolId — prefer explicit query param, then role, then student
    const role = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    let schoolId: string | null = url.searchParams.get('schoolId') ?? role?.school_id ?? null;

    if (studentId) {
      // When a studentId is provided, derive schoolId from the student record
      const student = await prisma.student.findUnique({
        where:  { id: studentId },
        select: { schoolId: true, classId: true },
      });

      if (student) {
        schoolId = student.schoolId;

        // Try to build weekoffDays from the class timetable (parent/student view)
        const timetable = student.classId
          ? await prisma.timetable.findFirst({
              where:   { schoolId: student.schoolId, classId: student.classId, isActive: true },
              include: { slots: { select: { dayOfWeek: true } } },
            })
          : null;

        if (timetable && timetable.slots.length > 0) {
          const scheduledDays = [...new Set(timetable.slots.map(s => s.dayOfWeek))];
          const weekoffDays   = [0, 1, 2, 3, 4, 5, 6].filter(d => !scheduledDays.includes(d));

          const holidays = await prisma.holidayCalendar.findMany({
            where:   { schoolId: student.schoolId, academicYear },
            orderBy: { date: 'asc' },
            select:  { id: true, date: true, name: true, type: true },
          });
          return Response.json({ holidays, weekoffDays, source: 'timetable' });
        }
        // No timetable found — fall through to leave-config weekoff below
      }
    }

    if (!schoolId) return Response.json({ holidays: [], weekoffDays: [0, 6] });

    // Default: leave-config weekoff (teachers, admins, employees, and fallback)
    const [holidays, weekoffEntries] = await Promise.all([
      prisma.holidayCalendar.findMany({
        where:   { schoolId, academicYear },
        orderBy: { date: 'asc' },
        select:  { id: true, date: true, name: true, type: true },
      }),
      prisma.holidayCalendar.findMany({
        where:  { schoolId, academicYear: '_weekoff_' },
        select: { date: true },
      }),
    ]);

    const weekoffDays = weekoffEntries
      .map(w => WEEKOFF_EPOCH_DATES.indexOf(new Date(w.date).toISOString().split('T')[0]))
      .filter(d => d >= 0);

    return Response.json({ holidays, weekoffDays, source: 'leave_config' });
  } catch (err) { return handleError(err); }
}
