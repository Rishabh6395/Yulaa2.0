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
      // school_id is null for parents — getStudentLeaveBalance derives it from the student record
      const balance = await getStudentLeaveBalance(primaryRole.school_id ?? null, studentId);
      return Response.json(balance);
    }

    // Teacher / staff balance — requires a school association
    const schoolId = primaryRole.school_id;
    if (!schoolId) return Response.json({ balances: [], configured: false });
    return Response.json(await getTeacherBalances(schoolId, user.id, academicYear));
  } catch (err) { return handleError(err); }
}
