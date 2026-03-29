import { getUserFromRequest } from '@/lib/auth';
import { getTeacherBalances, getStudentLeaveBalance } from '@/modules/leave/leave.service';
import { handleError, UnauthorizedError } from '@/utils/errors';

export async function GET(request: Request) {
  try {
    const user        = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const { searchParams } = new URL(request.url);
    const studentId    = searchParams.get('student_id');
    const academicYear = searchParams.get('year') || '2024-25';

    if (studentId) {
      const balance = await getStudentLeaveBalance(primaryRole.school_id!, studentId);
      return Response.json(balance);
    }

    return Response.json(
      await getTeacherBalances(primaryRole.school_id!, user.id, academicYear),
    );
  } catch (err) { return handleError(err); }
}
