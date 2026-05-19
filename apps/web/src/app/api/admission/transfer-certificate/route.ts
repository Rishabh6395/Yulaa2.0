/**
 * GET    /api/admission/transfer-certificate?school_id=X&student_id=X   — list TCs
 * POST   /api/admission/transfer-certificate                             — request TC
 * PATCH  /api/admission/transfer-certificate?id=X                       — approve / reject / issue
 * DELETE /api/admission/transfer-certificate?id=X                       — cancel (sets status=draft)
 *
 * Status flow: pending_approval → approved → issued
 * TC number auto-generated as TC-{SCHOOLCODE}-{YEAR}-{SEQ} on creation.
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const APPROVAL_ROLES = ['super_admin', 'school_admin', 'principal'];
const STAFF_ROLES    = ['super_admin', 'school_admin', 'principal', 'teacher'];

async function resolveSchoolId(user: any, override?: string | null): Promise<string> {
  const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  if (primary.role_code === 'super_admin' && override) return override;
  if (primary.school_id) return primary.school_id;
  throw new AppError('school_id required');
}

async function generateTcNumber(schoolId: string): Promise<string> {
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } });
  const code   = (school?.name ?? 'SCH').replace(/\s+/g, '').toUpperCase().slice(0, 4);
  const year   = new Date().getFullYear();
  const count  = await prisma.transferCertificate.count({ where: { schoolId } });
  return `TC-${code}-${year}-${String(count + 1).padStart(4, '0')}`;
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const { searchParams } = new URL(request.url);
    const schoolId  = await resolveSchoolId(user, searchParams.get('school_id'));
    const studentId = searchParams.get('student_id');
    const status    = searchParams.get('status');

    const tcs = await prisma.transferCertificate.findMany({
      where: {
        schoolId,
        ...(studentId ? { studentId } : {}),
        ...(status    ? { status }    : {}),
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, admissionNo: true, classId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Response.json({ tcs });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!STAFF_ROLES.includes(primary.role_code)) throw new ForbiddenError('Staff role required');

    const body = await request.json();
    const {
      schoolId: bodySchoolId, studentId, dateOfLeaving,
      lastClassAttended, reasonForLeaving, duesClearedStatus,
      conductCertificate, remarks,
    } = body;

    const schoolId = await resolveSchoolId(user, bodySchoolId);
    if (!studentId || !reasonForLeaving) throw new AppError('studentId, reasonForLeaving required');

    const student = await prisma.student.findFirst({ where: { id: studentId, schoolId } });
    if (!student) throw new AppError('Student not found', 404);

    const existing = await prisma.transferCertificate.findFirst({
      where: { studentId, status: { in: ['pending_approval', 'approved', 'issued'] } },
    });
    if (existing) throw new AppError('An active TC already exists for this student', 409);

    const tcNumber = await generateTcNumber(schoolId);

    const tc = await prisma.transferCertificate.create({
      data: {
        schoolId, studentId, tcNumber,
        dateOfLeaving:     dateOfLeaving ? new Date(dateOfLeaving) : null,
        lastClassAttended: lastClassAttended  ?? null,
        reasonForLeaving,
        duesClearedStatus: duesClearedStatus ?? false,
        conductCertificate: conductCertificate ?? 'Good',
        remarks:           remarks            ?? null,
        status:            'pending_approval',
        requestedById:     user.id,
      },
    });

    return Response.json({ tc }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];

    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new AppError('id required');

    const tc = await prisma.transferCertificate.findUnique({ where: { id } });
    if (!tc) throw new AppError('TC not found', 404);
    if (primary.school_id && tc.schoolId !== primary.school_id) throw new ForbiddenError();

    const body = await request.json();
    const { action } = body;

    if (action === 'approve') {
      if (!APPROVAL_ROLES.includes(primary.role_code)) throw new ForbiddenError('Approval role required');
      if (tc.status !== 'pending_approval') throw new AppError('TC must be pending approval');
      const updated = await prisma.transferCertificate.update({
        where: { id },
        data:  { status: 'approved', approvedById: user.id, approvedAt: new Date() },
      });
      return Response.json({ tc: updated });
    }

    if (action === 'issue') {
      if (!APPROVAL_ROLES.includes(primary.role_code)) throw new ForbiddenError('Approval role required');
      if (tc.status !== 'approved') throw new AppError('TC must be approved before issuing');
      const updated = await prisma.transferCertificate.update({
        where: { id },
        data:  { status: 'issued', issueDate: new Date() },
      });
      // Update student status to left
      if (tc.studentId) {
        await prisma.student.update({
          where: { id: tc.studentId },
          data:  { status: 'left' },
        });
      }
      return Response.json({ tc: updated });
    }

    if (action === 'reject') {
      if (!APPROVAL_ROLES.includes(primary.role_code)) throw new ForbiddenError('Approval role required');
      const updated = await prisma.transferCertificate.update({
        where: { id },
        data:  {
          status:      'pending_approval',  // stays in pending for re-submission
          approvedById: user.id,
          approvedAt:   new Date(),
          remarks:      body.remarks ?? tc.remarks,
        },
      });
      return Response.json({ tc: updated, rejected: true });
    }

    if (['issued', 'approved'].includes(tc.status))
      throw new AppError('Cannot edit an issued or approved TC', 409);

    const updated = await prisma.transferCertificate.update({
      where: { id },
      data: {
        ...(body.dateOfLeaving      !== undefined ? { dateOfLeaving: body.dateOfLeaving ? new Date(body.dateOfLeaving) : null } : {}),
        ...(body.lastClassAttended  !== undefined ? { lastClassAttended: body.lastClassAttended }   : {}),
        ...(body.reasonForLeaving   !== undefined ? { reasonForLeaving: body.reasonForLeaving }     : {}),
        ...(body.duesClearedStatus  !== undefined ? { duesClearedStatus: body.duesClearedStatus }   : {}),
        ...(body.conductCertificate !== undefined ? { conductCertificate: body.conductCertificate } : {}),
        ...(body.remarks            !== undefined ? { remarks: body.remarks }                       : {}),
      },
    });
    return Response.json({ tc: updated });
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!APPROVAL_ROLES.includes(primary.role_code)) throw new ForbiddenError('Admin required');

    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new AppError('id required');

    const tc = await prisma.transferCertificate.findUnique({ where: { id } });
    if (!tc) throw new AppError('TC not found', 404);
    if (primary.school_id && tc.schoolId !== primary.school_id) throw new ForbiddenError();
    if (tc.status === 'issued') throw new AppError('Cannot delete an issued TC', 409);

    await prisma.transferCertificate.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
