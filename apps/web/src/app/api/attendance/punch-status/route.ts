import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError } from '@/utils/errors';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const schoolId = primary.school_id ?? '';

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { attendancePunchEnabled: true },
    });

    if (!school?.attendancePunchEnabled) {
      return Response.json({ punchEnabled: false });
    }

    const today = new Date();
    const dateOnly = new Date(today.toISOString().split('T')[0]);
    dateOnly.setUTCHours(0, 0, 0, 0);

    const employee = await prisma.teacher.findFirst({
      where: { userId: user.id ?? undefined, schoolId },
      select: { id: true },
    });

    if (!employee) {
      return Response.json({ punchEnabled: true, punchedIn: false, punchedOut: false, punchInTime: null, punchOutTime: null });
    }

    const record = await prisma.attendance.findFirst({
      where: { teacherId: employee.id, studentId: null, date: dateOnly },
      select: { punchInTime: true, punchOutTime: true },
    });

    return Response.json({
      punchEnabled:  true,
      punchedIn:     record?.punchInTime  != null,
      punchedOut:    record?.punchOutTime != null,
      punchInTime:   record?.punchInTime  ?? null,
      punchOutTime:  record?.punchOutTime ?? null,
    });
  } catch (err) { return handleError(err); }
}
