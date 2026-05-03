import { getUserFromRequest } from '@/lib/auth';
import { getAttendance, markAttendance } from '@/modules/attendance/attendance.service';
import { handleError, UnauthorizedError } from '@/utils/errors';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user        = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const { searchParams } = new URL(request.url);

    // Parents have no school_id — derive it from the requested student
    let schoolId = primaryRole.school_id as string | null | undefined;
    if (!schoolId) {
      const studentId = searchParams.get('student_id');
      if (studentId) {
        const student = await prisma.student.findUnique({ where: { id: studentId }, select: { schoolId: true } });
        schoolId = student?.schoolId;
      }
    }
    if (!schoolId) return Response.json({ attendance: [] });

    return Response.json(await getAttendance(schoolId, searchParams));
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user        = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const result      = await markAttendance(primaryRole.school_id!, user.id, await request.json());
    return Response.json(result);
  } catch (err) { return handleError(err); }
}
