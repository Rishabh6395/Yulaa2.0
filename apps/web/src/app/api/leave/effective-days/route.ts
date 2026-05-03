import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';
import {
  WEEKOFF_EPOCH_DATES,
  getAcademicYearsForRange,
  assertParentOwnsStudent,
  getSchoolWeekoffDays,
} from '@/lib/school-utils';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * GET /api/leave/effective-days?start=YYYY-MM-DD&end=YYYY-MM-DD[&studentId=xxx]
 *
 * Calculates how many effective leave days exist in a date range after
 * excluding weekoff days and holidays.
 */
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const url       = new URL(request.url);
    const startStr  = url.searchParams.get('start');
    const endStr    = url.searchParams.get('end');
    const studentId = url.searchParams.get('studentId');

    if (!startStr || !endStr) throw new AppError('start and end query parameters are required', 400);

    const startDate = new Date(startStr + 'T00:00:00Z');
    const endDate   = new Date(endStr   + 'T00:00:00Z');
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate < startDate) {
      throw new AppError('Invalid date range', 400);
    }

    const role = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    let schoolId: string | null = role?.school_id ?? null;
    let weekoffDayNums: number[] = [0, 6];

    if (studentId) {
      // Parents must own the student they are querying for
      if (role.role_code === 'parent') {
        await assertParentOwnsStudent(user.id, studentId);
      }

      const student = await prisma.student.findUnique({
        where:  { id: studentId },
        select: { schoolId: true, classId: true },
      });
      if (student) {
        schoolId = student.schoolId;
        if (student.classId) {
          const timetable = await prisma.timetable.findFirst({
            where:   { schoolId: student.schoolId, classId: student.classId, isActive: true },
            include: { slots: { select: { dayOfWeek: true } } },
          });
          if (timetable && timetable.slots.length > 0) {
            const scheduledDays = [...new Set(timetable.slots.map((s: any) => s.dayOfWeek))];
            weekoffDayNums = [0, 1, 2, 3, 4, 5, 6].filter(d => !scheduledDays.includes(d));
          } else {
            weekoffDayNums = await getSchoolWeekoffDays(schoolId);
          }
        }
      }
    } else if (schoolId) {
      weekoffDayNums = await getSchoolWeekoffDays(schoolId);
    }

    // Resolve holidays in the date range
    const holidayDates = new Set<string>();
    const holidayNames: Record<string, string> = {};

    if (schoolId) {
      const academicYears = getAcademicYearsForRange(startDate, endDate);
      const holidays = await prisma.holidayCalendar.findMany({
        where: { schoolId, academicYear: { in: academicYears }, date: { gte: startDate, lte: endDate } },
        select: { date: true, name: true },
      });
      holidays.forEach(h => {
        const ds = new Date(h.date).toISOString().split('T')[0];
        holidayDates.add(ds);
        holidayNames[ds] = h.name;
      });
    }

    const excluded: { date: string; reason: 'weekoff' | 'holiday'; name: string }[] = [];
    let weekoffCount = 0, holidayCount = 0, effectiveCount = 0;

    const cur = new Date(startDate);
    while (cur <= endDate) {
      const ds  = cur.toISOString().split('T')[0];
      const dow = cur.getUTCDay();
      if (weekoffDayNums.includes(dow)) {
        weekoffCount++;
        excluded.push({ date: ds, reason: 'weekoff', name: DAY_NAMES[dow] });
      } else if (holidayDates.has(ds)) {
        holidayCount++;
        excluded.push({ date: ds, reason: 'holiday', name: holidayNames[ds] || 'Holiday' });
      } else {
        effectiveCount++;
      }
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    return Response.json({
      totalDays:     weekoffCount + holidayCount + effectiveCount,
      weekoffDays:   weekoffCount,
      holidayDays:   holidayCount,
      effectiveDays: effectiveCount,
      excluded,
    });
  } catch (err) { return handleError(err); }
}
