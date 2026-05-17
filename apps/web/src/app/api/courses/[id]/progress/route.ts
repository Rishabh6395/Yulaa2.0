/**
 * Course Progress — track lesson completion and compute overall progress.
 * PATCH - mark a lesson as watched/completed; auto-issue certificate at 100%
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const body = await request.json();
    const { lesson_id, watched_seconds } = body;
    if (!lesson_id) throw new AppError('lesson_id is required');

    // Get enrollment
    const enrollment = await prisma.courseEnrollment.findUnique({
      where: { courseId_userId: { courseId: id, userId: user.id } },
    });
    if (!enrollment || enrollment.paymentStatus !== 'paid') {
      throw new AppError('Not enrolled in this course');
    }

    // Upsert progress record
    await prisma.courseProgress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId: lesson_id } },
      create: {
        enrollmentId: enrollment.id,
        lessonId: lesson_id,
        watchedSeconds: watched_seconds ?? 0,
        completedAt: new Date(),
      },
      update: {
        watchedSeconds: watched_seconds ?? 0,
        completedAt: new Date(),
      },
    });

    // Compute overall progress
    const [totalLessons, completedLessons] = await Promise.all([
      prisma.courseLesson.count({
        where: { module: { courseId: id } },
      }),
      prisma.courseProgress.count({
        where: { enrollmentId: enrollment.id, completedAt: { not: null } },
      }),
    ]);

    const progressPct = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
    const isComplete  = progressPct >= 100;

    const course = await prisma.course.findUnique({ where: { id }, select: { certificateEnabled: true, title: true } });

    let certificateNo: string | null = null;
    if (isComplete && course?.certificateEnabled && !enrollment.certificateNo) {
      certificateNo = `CERT-${id.slice(0, 6).toUpperCase()}-${user.id.slice(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    }

    const updated = await prisma.courseEnrollment.update({
      where: { id: enrollment.id },
      data: {
        progressPct,
        ...(isComplete && !enrollment.completedAt && { completedAt: new Date() }),
        ...(certificateNo && {
          certificateNo,
          certificateIssuedAt: new Date(),
        }),
      },
    });

    return Response.json({ enrollment: updated, progress_pct: progressPct, certificate_no: updated.certificateNo });
  } catch (err) { return handleError(err); }
}
