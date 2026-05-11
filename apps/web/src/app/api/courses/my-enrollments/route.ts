import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError } from '@/utils/errors';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const enrollments = await prisma.courseEnrollment.findMany({
      where: { userId: user.id },
      include: {
        course: {
          select: {
            id: true, title: true, thumbnail: true, type: true, certificateEnabled: true,
            instructorName: true,
            teacher: { select: { user: { select: { firstName: true, lastName: true } } } },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    const rows = enrollments.map(e => ({
      id: e.id,
      progress_pct: e.progressPct,
      completed_at: e.completedAt,
      certificate_no: e.certificateNo,
      payment_status: e.paymentStatus,
      enrolled_at: e.enrolledAt,
      course: {
        id: e.course.id,
        title: e.course.title,
        thumbnail: e.course.thumbnail,
        type: e.course.type,
        certificate_enabled: e.course.certificateEnabled,
        instructor_name: e.course.instructorName,
        teacher: e.course.teacher,
      },
    }));

    return Response.json({ enrollments: rows });
  } catch (err) { return handleError(err); }
}
