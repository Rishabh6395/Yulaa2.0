/**
 * Course Enrollment
 * POST - enroll in a course (free = instant; paid = pending payment)
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const body = await request.json();
    const { student_id, payment_ref, gateway } = body;

    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) throw new AppError('Course not found');
    if (!course.isPublished) throw new AppError('Course is not available for enrollment');

    const existing = await prisma.courseEnrollment.findUnique({
      where: { courseId_userId: { courseId: id, userId: user.id } },
    });
    if (existing) throw new AppError('Already enrolled in this course');

    const isFree = course.isFree || Number(course.price) === 0;

    const enrollment = await prisma.courseEnrollment.create({
      data: {
        courseId:      id,
        userId:        user.id,
        studentId:     student_id ?? null,
        paymentStatus: isFree ? 'paid' : (payment_ref ? 'paid' : 'pending'),
        paymentRef:    payment_ref ?? null,
        amountPaid:    isFree ? 0 : Number(course.price),
        gateway:       gateway ?? null,
      },
    });

    return Response.json({ enrollment }, { status: 201 });
  } catch (err) { return handleError(err); }
}
