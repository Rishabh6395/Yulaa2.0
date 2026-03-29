import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError } from '@/utils/errors';
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

/**
 * GET /api/holidays?year=2025-2026
 * Returns the school's holiday list and configured weekoff days.
 * Accessible by all authenticated users (parents, teachers, admins, students).
 */
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const role = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const schoolId = role?.school_id;
    if (!schoolId) return Response.json({ holidays: [], weekoffDays: [0, 6] });

    const url = new URL(request.url);
    const academicYear = url.searchParams.get('year') || '2025-2026';

    const [holidays, weekoffEntries] = await Promise.all([
      prisma.holidayCalendar.findMany({
        where: { schoolId, academicYear },
        orderBy: { date: 'asc' },
        select: { id: true, date: true, name: true, type: true },
      }),
      prisma.holidayCalendar.findMany({
        where: { schoolId, academicYear: '__weekoff__' },
        select: { date: true },
      }),
    ]);

    const weekoffDays = weekoffEntries
      .map(w => {
        const d = new Date(w.date).toISOString().split('T')[0];
        return WEEKOFF_DATES.indexOf(d);
      })
      .filter(d => d >= 0);

    return Response.json({ holidays, weekoffDays });
  } catch (err) { return handleError(err); }
}
