import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, AppError } from '@/utils/errors';
import { markAttendance } from '@/modules/attendance/attendance.service';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];

    // Block double punch-in: check if already punched in today
    const today = new Date();
    const dateOnly = new Date(today.toISOString().split('T')[0]);
    dateOnly.setUTCHours(0, 0, 0, 0);
    const employee = await prisma.teacher.findFirst({
      where: { userId: user.id ?? undefined, schoolId: primary.school_id ?? undefined },
      select: { id: true },
    });
    if (employee) {
      const existing = await prisma.attendance.findFirst({
        where: { teacherId: employee.id, studentId: null, date: dateOnly },
        select: { punchInTime: true },
      });
      if (existing?.punchInTime) throw new AppError('Already punched in today');
    }

    const result = await markAttendance(primary.school_id!, user.id, {
      type:    'employee',
      action:  'punch_in',
      user_id: user.id,
    });
    return Response.json(result);
  } catch (err) { return handleError(err); }
}
