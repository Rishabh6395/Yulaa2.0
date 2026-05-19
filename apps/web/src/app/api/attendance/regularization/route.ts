/**
 * GET    /api/attendance/regularization            — list requests (teacher sees own, admin sees all)
 * POST   /api/attendance/regularization            — submit regularization request (teacher)
 * PATCH  /api/attendance/regularization?id=X       — approve / reject (principal/admin)
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const schoolId = primary.school_id;
    if (!schoolId) throw new AppError('school_id required');

    const { searchParams } = new URL(request.url);
    const status    = searchParams.get('status') ?? undefined;
    const studentId = searchParams.get('student_id') ?? undefined;

    const where: any = { schoolId };
    if (status)    where.status    = status;
    if (studentId) where.studentId = studentId;

    const requests = await prisma.attendanceRegularization.findMany({
      where,
      include: {
        student:    { select: { firstName: true, lastName: true, admissionNo: true } },
        attendance: { select: { date: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return Response.json({ requests });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const schoolId = primary.school_id;
    if (!schoolId) throw new AppError('school_id required');

    const body = await request.json();
    const { attendanceId, studentId, toStatus, reason } = body;
    if (!attendanceId || !studentId || !toStatus || !reason)
      throw new AppError('attendanceId, studentId, toStatus, reason required');

    const attendance = await prisma.attendance.findFirst({
      where: { id: attendanceId, schoolId },
    });
    if (!attendance) throw new AppError('Attendance record not found', 404);

    // Check for duplicate pending request
    const existing = await prisma.attendanceRegularization.findFirst({
      where: { attendanceId, status: 'pending' },
    });
    if (existing) throw new AppError('A pending request already exists for this attendance record');

    const reg = await prisma.attendanceRegularization.create({
      data: {
        schoolId, studentId, attendanceId,
        requestedById: user.id,
        fromStatus:    attendance.status,
        toStatus,
        reason,
        status:        'pending',
      },
    });

    return Response.json({ regularization: reg }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!['super_admin', 'school_admin', 'principal'].includes(primary.role_code))
      throw new ForbiddenError('Only admins can review regularization requests');

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) throw new AppError('id required');

    const body = await request.json();
    const { action, reviewComment } = body;
    if (!['approved', 'rejected'].includes(action)) throw new AppError('action must be approved or rejected');

    const reg = await prisma.attendanceRegularization.findUnique({ where: { id } });
    if (!reg) throw new AppError('Request not found', 404);
    if (reg.status !== 'pending') throw new AppError('Request is already reviewed');
    if (primary.school_id && reg.schoolId !== primary.school_id) throw new ForbiddenError();

    const updated = await prisma.$transaction(async (tx) => {
      const upd = await tx.attendanceRegularization.update({
        where: { id },
        data: { status: action, reviewedById: user.id, reviewedAt: new Date(), reviewComment: reviewComment ?? null },
      });
      // If approved, update the actual attendance record
      if (action === 'approved') {
        await tx.attendance.update({
          where: { id: reg.attendanceId },
          data:  { status: reg.toStatus, updatedBy: user.id },
        });
      }
      return upd;
    });

    return Response.json({ regularization: updated });
  } catch (err) { return handleError(err); }
}
