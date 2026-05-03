import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

// Canonical epoch dates for weekday encoding (Sun=0 … Sat=6)
const WEEKOFF_DATES = [
  '1970-01-04', // 0 Sunday
  '1970-01-05', // 1 Monday
  '1970-01-06', // 2 Tuesday
  '1970-01-07', // 3 Wednesday
  '1970-01-08', // 4 Thursday
  '1970-01-09', // 5 Friday
  '1970-01-10', // 6 Saturday
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * GET /api/leave/effective-days?start=YYYY-MM-DD&end=YYYY-MM-DD[&studentId=xxx]
 *
 * Calculates how many effective leave days exist in a date range after
 * excluding weekoff days and holidays.
 *
 * Weekoff source:
 *   - With studentId → derived from class timetable working days (days NOT in timetable = weekoff)
 *   - Without studentId → from Leave Configuration (_weekoff_ entries)
 *
 * Holidays are always loaded from HolidayCalendar for the matching academic year.
 */
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const url       = new URL(request.url);
    const startStr  = url.searchParams.get('start');
    const endStr    = url.searchParams.get('end');
    const studentId = url.searchParams.get('studentId');

    if (!startStr || !endStr) {
      throw new AppError('start and end query parameters are required', 400);
    }

    const startDate = new Date(startStr + 'T00:00:00Z');
    const endDate   = new Date(endStr   + 'T00:00:00Z');
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate < startDate) {
      throw new AppError('Invalid date range', 400);
    }

    // Resolve schoolId
    const role = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    let schoolId: string | null = role?.school_id ?? null;

    // ── Resolve weekoff days ──────────────────────────────────────────────────
    let weekoffDayNums: number[] = [0, 6]; // Default fallback

    if (studentId) {
      // Student/parent context → derive weekoff from class timetable
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
            const scheduledDays = [...new Set(timetable.slots.map(s => s.dayOfWeek))];
            weekoffDayNums = [0, 1, 2, 3, 4, 5, 6].filter(d => !scheduledDays.includes(d));
          } else {
            // No timetable → fall back to leave-config weekoff
            weekoffDayNums = await getLeaveConfigWeekoffs(schoolId);
          }
        }
      }
    } else if (schoolId) {
      // Employee/teacher/admin context → leave-config weekoff
      weekoffDayNums = await getLeaveConfigWeekoffs(schoolId);
    }

    // ── Resolve holidays in the date range ────────────────────────────────────
    const holidayDates = new Set<string>();
    const holidayNames: Record<string, string> = {};

    if (schoolId) {
      // Determine which academic years span the leave range
      const academicYears = getAcademicYearsForRange(startDate, endDate);

      const holidays = await prisma.holidayCalendar.findMany({
        where: {
          schoolId,
          academicYear: { in: academicYears },
          date: { gte: startDate, lte: endDate },
        },
        select: { date: true, name: true },
      });

      holidays.forEach(h => {
        const ds = new Date(h.date).toISOString().split('T')[0];
        holidayDates.add(ds);
        holidayNames[ds] = h.name;
      });
    }

    // ── Iterate each day, classify as weekoff / holiday / effective ────────────
    const excluded: { date: string; reason: 'weekoff' | 'holiday'; name: string }[] = [];
    let weekoffCount = 0;
    let holidayCount = 0;
    let effectiveCount = 0;

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

    const totalDays = weekoffCount + holidayCount + effectiveCount;

    return Response.json({
      totalDays,
      weekoffDays: weekoffCount,
      holidayDays: holidayCount,
      effectiveDays: effectiveCount,
      excluded,
    });
  } catch (err) { return handleError(err); }
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

async function getLeaveConfigWeekoffs(schoolId: string): Promise<number[]> {
  const entries = await prisma.holidayCalendar.findMany({
    where:  { schoolId, academicYear: '_weekoff_' },
    select: { date: true },
  });
  if (entries.length === 0) return [0, 6]; // Default if not configured
  return entries
    .map(w => {
      const d = new Date(w.date).toISOString().split('T')[0];
      return WEEKOFF_DATES.indexOf(d);
    })
    .filter(d => d >= 0);
}

function getAcademicYearsForRange(start: Date, end: Date): string[] {
  const years = new Set<string>();
  const cur = new Date(start);
  while (cur <= end) {
    const y = cur.getUTCMonth() >= 3 ? cur.getUTCFullYear() : cur.getUTCFullYear() - 1;
    years.add(`${y}-${y + 1}`);
    // Jump to next April to avoid iterating every day
    cur.setUTCMonth(cur.getUTCMonth() + 1);
  }
  return [...years];
}
