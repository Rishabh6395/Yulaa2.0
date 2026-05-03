import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';
import { WEEKOFF_EPOCH_DATES } from '@/lib/school-utils';

function formatTime(d: Date | null | undefined): string | null {
  if (!d) return null;
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function workingHours(punchIn: Date | null | undefined, punchOut: Date | null | undefined): number | null {
  if (!punchIn || !punchOut) return null;
  return Math.round((new Date(punchOut).getTime() - new Date(punchIn).getTime()) / 36000) / 100;
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const { searchParams } = new URL(request.url);
    const monthStr    = searchParams.get('month') ?? new Date().toISOString().slice(0, 7); // YYYY-MM
    const targetUserId = searchParams.get('user_id') ?? user.id;

    const [year, monthNum] = monthStr.split('-').map(Number);
    const firstDay = new Date(year, monthNum - 1, 1);
    const lastDay  = new Date(year, monthNum, 0);
    firstDay.setUTCHours(0, 0, 0, 0);
    lastDay.setUTCHours(23, 59, 59, 999);

    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const schoolId = primary.school_id as string | undefined;
    if (!schoolId) throw new AppError('No school associated with your account', 400);

    // Resolve teacher record for the target user
    const teacher = await prisma.teacher.findFirst({
      where: { userId: targetUserId, schoolId },
      select: { id: true },
    });

    // Attendance records
    const rawRecords = teacher
      ? await prisma.attendance.findMany({
          where: { teacherId: teacher.id, studentId: null, date: { gte: firstDay, lte: lastDay } },
          select: { id: true, date: true, status: true, punchInTime: true, punchOutTime: true },
          orderBy: { date: 'asc' },
        })
      : [];

    // Holidays for the month (including weekoffs for the school)
    const academicYear = `${monthNum >= 4 ? year : year - 1}-${monthNum >= 4 ? year + 1 : year}`;
    const [holidays, weekoffEntries] = await Promise.all([
      prisma.holidayCalendar.findMany({
        where: { schoolId, academicYear, date: { gte: firstDay, lte: lastDay } },
        select: { date: true, name: true },
      }),
      prisma.holidayCalendar.findMany({
        where: { schoolId, academicYear: '_weekoff_' },
        select: { date: true },
      }),
    ]);

    const weekoffDays = weekoffEntries
      .map(w => WEEKOFF_EPOCH_DATES.indexOf(new Date(w.date).toISOString().split('T')[0]))
      .filter(d => d >= 0);
    const effectiveWeekoffs = weekoffDays.length ? weekoffDays : [0, 6];

    const holidayMap: Record<string, string> = {};
    holidays.forEach(h => { holidayMap[new Date(h.date).toISOString().split('T')[0]] = h.name; });

    // Approved leaves for this employee in the month
    const leaveRecords = await prisma.leaveRequest.findMany({
      where: {
        schoolId,
        userId: targetUserId,
        status: 'approved',
        startDate: { lte: lastDay },
        endDate:   { gte: firstDay },
      },
      select: { leaveType: true, startDate: true, endDate: true },
    });
    const leaveMap: Record<string, string> = {};
    leaveRecords.forEach(l => {
      const cur = new Date(l.startDate);
      while (cur <= l.endDate) {
        leaveMap[cur.toISOString().split('T')[0]] = l.leaveType;
        cur.setDate(cur.getDate() + 1);
      }
    });

    // Attendance map
    const attMap: Record<string, (typeof rawRecords)[0]> = {};
    rawRecords.forEach(r => { attMap[new Date(r.date).toISOString().split('T')[0]] = r; });

    // Build day-by-day records for the month
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const records: any[] = [];

    const cur = new Date(firstDay);
    while (cur <= lastDay) {
      const ds  = cur.toISOString().split('T')[0];
      const dow = cur.getUTCDay();
      const att = attMap[ds];
      const isWeekoff = effectiveWeekoffs.includes(dow);
      const isHoliday = !!holidayMap[ds];
      const isLeave   = !!leaveMap[ds];
      const isFuture  = cur > today;

      let displayStatus: string;
      if (isWeekoff)    displayStatus = 'weekoff';
      else if (isHoliday) displayStatus = 'holiday';
      else if (isLeave && !att) displayStatus = 'leave';
      else if (att)       displayStatus = att.status;
      else if (isFuture)  displayStatus = 'future';
      else                displayStatus = 'absent'; // unrecorded working day

      records.push({
        date:          ds,
        day_of_week:   dow,
        status:        displayStatus,
        punch_in_time:  att ? formatTime(att.punchInTime)  : null,
        punch_out_time: att ? formatTime(att.punchOutTime) : null,
        working_hours:  att ? workingHours(att.punchInTime, att.punchOutTime) : null,
        is_holiday:    isHoliday,
        holiday_name:  holidayMap[ds] ?? null,
        is_leave:      isLeave,
        leave_type:    leaveMap[ds] ?? null,
        is_weekoff:    isWeekoff,
      });
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    // Summary
    const workingRecords = records.filter(r => !r.is_weekoff && !r.is_holiday && !r.is_future);
    const summary = {
      present:         workingRecords.filter(r => r.status === 'present').length,
      absent:          workingRecords.filter(r => r.status === 'absent').length,
      late:            workingRecords.filter(r => r.status === 'late').length,
      half_day:        workingRecords.filter(r => r.status === 'half_day').length,
      excused:         workingRecords.filter(r => r.status === 'excused').length,
      leave:           workingRecords.filter(r => r.status === 'leave').length,
      holidays:        records.filter(r => r.is_holiday).length,
      weekoffs:        records.filter(r => r.is_weekoff).length,
      working_days:    workingRecords.length,
      attendance_rate: workingRecords.length
        ? Math.round((workingRecords.filter(r => ['present', 'late', 'half_day', 'excused'].includes(r.status)).length / workingRecords.length) * 100)
        : 0,
    };

    return Response.json({ month: monthStr, records, summary });
  } catch (err) { return handleError(err); }
}
