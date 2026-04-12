import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError } from '@/utils/errors';
import prisma from '@/lib/prisma';

/**
 * GET /api/leave/today
 * Returns students who are on approved leave today, for the logged-in teacher's class.
 * Also returns a school-wide summary count for admins.
 *
 * Query params:
 *   ?class_id=<id>   filter to a specific class (teacher uses this)
 */
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const schoolId    = primaryRole.school_id!;
    const { searchParams } = new URL(request.url);
    const classId     = searchParams.get('class_id');

    const today     = new Date();
    const todayDate = new Date(today.toISOString().split('T')[0]);
    todayDate.setUTCHours(0, 0, 0, 0);

    // Find approved leaves covering today
    const leaves = await prisma.leaveRequest.findMany({
      where: {
        schoolId,
        status:    'approved',
        startDate: { lte: todayDate },
        endDate:   { gte: todayDate },
        studentId: { not: null },
      },
      select: {
        id:        true,
        studentId: true,
        leaveType: true,
        student: {
          select: {
            id:        true,
            firstName: true,
            lastName:  true,
            admissionNo: true,
            classId:   true,
            class: { select: { grade: true, section: true } },
          },
        },
      },
    });

    // Filter by class if specified
    const filtered = classId
      ? leaves.filter(l => l.student?.classId === classId)
      : leaves;

    return Response.json({
      total:    filtered.length,
      students: filtered.map(l => ({
        student_id:   l.studentId,
        first_name:   l.student?.firstName,
        last_name:    l.student?.lastName,
        admission_no: l.student?.admissionNo,
        class_id:     l.student?.classId,
        grade:        l.student?.class?.grade,
        section:      l.student?.class?.section,
        leave_type:   l.leaveType,
      })),
    });
  } catch (err) { return handleError(err); }
}
