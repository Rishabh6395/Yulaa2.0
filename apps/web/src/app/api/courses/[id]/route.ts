/**
 * Course detail — modules + lessons, enrollment status
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];

    const course = await prisma.course.findUnique({
      where: { id: params.id },
      include: {
        teacher: { select: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
        modules: {
          orderBy: { sortOrder: 'asc' },
          include: {
            lessons: {
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true, title: true, description: true, type: true, duration: true,
                isPreview: true, sortOrder: true,
                contentUrl: true,  // shown only to enrolled users (enforced below)
                meetingLink: true,
                scheduledAt: true,
              },
            },
          },
        },
        enrollments: {
          where: { userId: user.id },
          select: { id: true, progressPct: true, paymentStatus: true, completedAt: true, certificateNo: true },
          take: 1,
        },
        _count: { select: { enrollments: true } },
      },
    });

    if (!course) throw new AppError('Course not found');

    const enrollment = course.enrollments[0] ?? null;
    const isEnrolled = enrollment?.paymentStatus === 'paid' || course.isFree;

    // Hide content URLs for non-enrolled users (preview lessons stay visible)
    if (!isEnrolled) {
      course.modules.forEach(mod => {
        mod.lessons.forEach(lesson => {
          if (!lesson.isPreview) {
            (lesson as any).contentUrl  = null;
            (lesson as any).meetingLink = null;
          }
        });
      });
    }

    return Response.json({
      course: {
        ...course,
        enrollments: undefined,
        enrollment,
        enrolled_count: course._count.enrollments,
        is_enrolled: isEnrolled,
      },
    });
  } catch (err) { return handleError(err); }
}
