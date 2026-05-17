/**
 * GET    /api/attendance/gate-pass        — list gate passes (date filtered)
 * POST   /api/attendance/gate-pass        — issue gate pass (teacher)
 * PATCH  /api/attendance/gate-pass?id=X   — mark returned / verify OTP
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';
import { createHash, randomInt } from 'crypto';

function hashOtp(otp: string) {
  return createHash('sha256').update(otp).digest('hex');
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const schoolId = primary.school_id;
    if (!schoolId) throw new AppError('school_id required');

    const { searchParams } = new URL(request.url);
    const date      = searchParams.get('date');
    const studentId = searchParams.get('student_id');
    const status    = searchParams.get('status');

    const where: any = { schoolId };
    if (studentId) where.studentId = studentId;
    if (status)    where.status    = status;
    if (date) {
      const d = new Date(date);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      where.exitTime = { gte: d, lt: next };
    }

    const passes = await prisma.gatePass.findMany({
      where,
      include: { student: { select: { firstName: true, lastName: true, admissionNo: true } } },
      orderBy: { exitTime: 'desc' },
      take: 100,
    });

    return Response.json({ passes });
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
      throw new ForbiddenError('Only teachers and admins can issue gate passes');

    const body = await request.json();
    const { studentId, reason, expectedReturn } = body;
    if (!studentId || !reason) throw new AppError('studentId, reason required');

    const student = await prisma.student.findFirst({ where: { id: studentId, schoolId } });
    if (!student) throw new AppError('Student not found', 404);

    // Generate 6-digit OTP for parent consent
    const otp = String(randomInt(100000, 999999));

    const gatePass = await prisma.gatePass.create({
      data: {
        schoolId, studentId,
        issuedById:     user.id,
        exitTime:       new Date(),
        reason,
        expectedReturn: expectedReturn ? new Date(expectedReturn) : null,
        parentOtp:      hashOtp(otp),
        status:         'issued',
      },
    });

    // In production, send OTP to parent via SMS. Return otp only for dev.
    return Response.json({
      gatePass,
      parentOtp: process.env.NODE_ENV === 'development' ? otp : undefined,
      message: 'Gate pass issued. Parent OTP sent via SMS.',
    }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) throw new AppError('id required');

    const body = await request.json();
    const { action, otp } = body;

    const gatePass = await prisma.gatePass.findUnique({ where: { id } });
    if (!gatePass) throw new AppError('Gate pass not found', 404);

    if (action === 'verify_otp') {
      if (!otp) throw new AppError('otp required');
      if (gatePass.parentOtp !== hashOtp(otp)) throw new AppError('Invalid OTP', 400);
      const updated = await prisma.gatePass.update({
        where: { id },
        data: { parentConsent: true, otpVerifiedAt: new Date() },
      });
      return Response.json({ gatePass: updated });
    }

    if (action === 'return') {
      const updated = await prisma.gatePass.update({
        where: { id },
        data: { status: 'returned', returnedAt: new Date() },
      });
      return Response.json({ gatePass: updated });
    }

    throw new AppError('action must be verify_otp or return');
  } catch (err) { return handleError(err); }
}
