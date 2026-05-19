/**
 * GET    /api/performance/course-recommendations  — list for student/class
 * POST   /api/performance/course-recommendations  — manual recommendation (teacher/admin)
 * PATCH  /api/performance/course-recommendations?id=X — accept / dismiss
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const { searchParams } = new URL(request.url);
    const schoolId  = primary.school_id ?? searchParams.get('school_id');
    const studentId = searchParams.get('student_id');
    const cycleId   = searchParams.get('cycle_id');
    const status    = searchParams.get('status');

    if (!schoolId) throw new AppError('school_id required');

    // Parent can only see their own child
    if (primary.role_code === 'parent') {
      if (!studentId) throw new AppError('student_id required for parent view');
      const parentRecord = await prisma.parent.findFirst({ where: { userId: user.id } });
      if (!parentRecord) throw new ForbiddenError();
      const link = await prisma.parentStudent.findFirst({
        where: { parentId: parentRecord.id, studentId },
      });
      if (!link) throw new ForbiddenError();
    }

    const recs = await prisma.courseRecommendation.findMany({
      where: {
        schoolId,
        ...(studentId ? { studentId } : {}),
        ...(cycleId   ? { cycleId }   : {}),
        ...(status    ? { status }    : {}),
      },
      include: {
        student:    { select: { firstName: true, lastName: true, admissionNo: true } },
        course:     { select: { title: true, thumbnail: true } },
        onlineClass: { select: { title: true, subject: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return Response.json({ recommendations: recs });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const schoolId = primary.school_id;
    if (!schoolId) throw new AppError('school_id required');

    if (!['teacher', 'school_admin', 'principal', 'hod'].includes(primary.role_code))
      throw new ForbiddenError('Teacher or admin required');

    const body = await request.json();
    const { studentId, cycleId, subject, reason, courseId, onlineClassId } = body;
    if (!studentId || !subject) throw new AppError('studentId, subject required');

    const rec = await prisma.courseRecommendation.create({
      data: {
        schoolId, studentId,
        cycleId:     cycleId      ?? null,
        subject,
        reason:      reason       ?? null,
        courseId:    courseId     ?? null,
        onlineClassId: onlineClassId ?? null,
        source:      'manual',
        status:      'pending',
      },
    });

    return Response.json({ recommendation: rec }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new AppError('id required');

    const body = await request.json();
    const { status } = body;
    if (!['accepted', 'dismissed'].includes(status)) throw new AppError('status must be accepted or dismissed');

    const rec = await prisma.courseRecommendation.findUnique({ where: { id } });
    if (!rec) throw new AppError('Recommendation not found', 404);

    // Parent or student can accept/dismiss their own
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (primary.role_code === 'parent') {
      const parentRecord = await prisma.parent.findFirst({ where: { userId: user.id } });
      if (!parentRecord) throw new ForbiddenError();
      const link = await prisma.parentStudent.findFirst({
        where: { parentId: parentRecord.id, studentId: rec.studentId },
      });
      if (!link) throw new ForbiddenError();
    }

    const updated = await prisma.courseRecommendation.update({ where: { id }, data: { status } });
    return Response.json({ recommendation: updated });
  } catch (err) { return handleError(err); }
}
