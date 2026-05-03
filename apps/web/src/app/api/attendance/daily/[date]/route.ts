import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { date: string } },
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const { date } = params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new AppError('date must be YYYY-MM-DD');

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('user_id') ?? user.id;

    const primary  = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const schoolId = primary.school_id!;

    const parsedDate = new Date(date);
    parsedDate.setUTCHours(0, 0, 0, 0);

    const teacher = await prisma.teacher.findFirst({
      where: { userId: targetUserId, schoolId },
      select: { id: true, employeeId: true },
    });

    const record = teacher
      ? await prisma.attendance.findFirst({
          where: { teacherId: teacher.id, studentId: null, date: parsedDate },
          select: { id: true, status: true, punchInTime: true, punchOutTime: true },
        })
      : null;

    // Holiday / leave check
    const academicYear = (() => {
      const m = parsedDate.getUTCMonth();
      const y = parsedDate.getUTCFullYear();
      return `${m >= 3 ? y : y - 1}-${m >= 3 ? y + 1 : y}`;
    })();
    const [holiday, leave] = await Promise.all([
      prisma.holidayCalendar.findFirst({
        where: { schoolId, academicYear, date: parsedDate },
        select: { name: true },
      }),
      prisma.leaveRequest.findFirst({
        where: {
          schoolId, userId: targetUserId, status: 'approved',
          startDate: { lte: parsedDate }, endDate: { gte: parsedDate },
        },
        select: { leaveType: true },
      }),
    ]);

    function fmt(d: Date | null | undefined) {
      if (!d) return null;
      return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    const punchIn  = record?.punchInTime  ?? null;
    const punchOut = record?.punchOutTime ?? null;
    const workingHours = punchIn && punchOut
      ? Math.round((new Date(punchOut).getTime() - new Date(punchIn).getTime()) / 36000) / 100
      : null;

    return Response.json({
      date,
      status:         record?.status  ?? (leave ? 'leave' : holiday ? 'holiday' : null),
      punch_in_time:  fmt(punchIn),
      punch_out_time: fmt(punchOut),
      working_hours:  workingHours,
      is_holiday:     !!holiday,
      holiday_name:   holiday?.name ?? null,
      is_leave:       !!leave,
      leave_type:     leave?.leaveType ?? null,
    });
  } catch (err) { return handleError(err); }
}
