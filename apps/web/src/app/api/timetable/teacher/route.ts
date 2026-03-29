import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const ACADEMIC_YEAR = '2025-2026';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!['teacher', 'school_admin', 'principal', 'hod'].includes(primary.role_code)) throw new ForbiddenError();

    const schoolId = primary.school_id;
    if (!schoolId) throw new AppError('No school assigned');

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date(date).getDay(); // 0=Sun, 1=Mon...

    // Teacher ID: look up by user.id in Teacher table
    const teacher = await prisma.teacher.findFirst({
      where: { schoolId, userId: user.id },
      select: { id: true },
    });
    if (!teacher) return Response.json({ slots: [], logs: [] });

    const slots = await prisma.timetableSlot.findMany({
      where: {
        teacherId: teacher.id,
        dayOfWeek,
        timetable: { schoolId, academicYear: ACADEMIC_YEAR },
      },
      include: {
        timetable: { select: { classId: true, class: { select: { name: true } } } },
        logs: { where: { date: new Date(date) }, take: 1 },
      },
      orderBy: { periodNo: 'asc' },
    });

    return Response.json({ slots, date, dayOfWeek });
  } catch (err) { return handleError(err); }
}
