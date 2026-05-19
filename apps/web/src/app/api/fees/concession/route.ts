/**
 * GET    /api/fees/concession?school_id=X&student_id=X   — list concessions
 * POST   /api/fees/concession                            — create concession
 * PATCH  /api/fees/concession?id=X                       — approve / reject / update
 * DELETE /api/fees/concession?id=X                       — remove pending concession
 *
 * status: 'pending' → 'approved' | 'rejected'
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const APPROVAL_ROLES = ['super_admin', 'school_admin', 'principal'];

async function resolveSchoolId(user: any, override?: string | null): Promise<string> {
  const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  if (primary.role_code === 'super_admin' && override) return override;
  if (primary.school_id) return primary.school_id;
  throw new AppError('school_id required');
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const { searchParams } = new URL(request.url);
    const schoolId  = await resolveSchoolId(user, searchParams.get('school_id'));
    const studentId = searchParams.get('student_id');
    const status    = searchParams.get('status');

    const concessions = await prisma.feeConcession.findMany({
      where: {
        schoolId,
        ...(studentId ? { studentId } : {}),
        ...(status    ? { status }    : {}),
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, admissionNo: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Response.json({ concessions });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!['super_admin', 'school_admin', 'principal', 'accountant'].includes(primary.role_code))
      throw new ForbiddenError('Finance staff required');

    const body = await request.json();
    const {
      schoolId: bodySchoolId, studentId, concessionType,
      discountPercent, discountAmount, academicYear,
      validFrom, validTo, reason,
    } = body;

    const schoolId = await resolveSchoolId(user, bodySchoolId);
    if (!studentId || !concessionType || !academicYear)
      throw new AppError('studentId, concessionType, academicYear required');
    if (discountPercent === undefined && discountAmount === undefined)
      throw new AppError('discountPercent or discountAmount required');
    if (discountPercent !== undefined && (discountPercent < 0 || discountPercent > 100))
      throw new AppError('discountPercent must be 0–100');

    const student = await prisma.student.findFirst({ where: { id: studentId, schoolId } });
    if (!student) throw new AppError('Student not found', 404);

    const concession = await prisma.feeConcession.create({
      data: {
        schoolId, studentId, concessionType, academicYear,
        discountPercent: discountPercent ?? null,
        discountAmount:  discountAmount  ?? null,
        validFrom: validFrom ? new Date(validFrom) : null,
        validTo:   validTo   ? new Date(validTo)   : null,
        reason:    reason    ?? null,
        status:    'pending',
        createdById: user.id,
      },
    });

    return Response.json({ concession }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];

    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new AppError('id required');

    const concession = await prisma.feeConcession.findUnique({ where: { id } });
    if (!concession) throw new AppError('Concession not found', 404);
    if (primary.school_id && concession.schoolId !== primary.school_id) throw new ForbiddenError();

    const body = await request.json();
    const { action } = body;

    if (action === 'approve') {
      if (!APPROVAL_ROLES.includes(primary.role_code)) throw new ForbiddenError('Approval role required');
      if (concession.status !== 'pending') throw new AppError('Only pending concessions can be approved');

      const updated = await prisma.$transaction(async (tx) => {
        const approved = await tx.feeConcession.update({
          where: { id },
          data:  { status: 'approved', isActive: true, approvedById: user.id, approvedAt: new Date() },
        });

        // Apply concession as credit payments on unpaid/partial invoices for this student+year
        const invoices = await tx.feeInvoice.findMany({
          where: {
            schoolId:   concession.schoolId,
            studentId:  concession.studentId,
            status:     { in: ['unpaid', 'partial', 'overdue'] },
            ...(concession.feeStructureId ? { feeStructureId: concession.feeStructureId } : {}),
          },
        });

        for (const inv of invoices) {
          const total       = Number(inv.amount);
          const alreadyPaid = Number(inv.paidAmount);
          const outstanding = total - alreadyPaid;
          if (outstanding <= 0) continue;

          const creditAmt = concession.discountAmount
            ? Math.min(Number(concession.discountAmount), outstanding)
            : concession.discountPercent
              ? Math.min((Number(concession.discountPercent) / 100) * total, outstanding)
              : 0;

          if (creditAmt <= 0) continue;

          await tx.feePayment.create({
            data: {
              invoiceId:     inv.id,
              amount:        creditAmt,
              paymentMethod: 'concession',
              remarks:       `Concession approved: ${concession.concessionType}`,
            },
          });

          const newPaid  = alreadyPaid + creditAmt;
          const newStatus = newPaid >= total ? 'paid' : 'partial';
          await tx.feeInvoice.update({
            where: { id: inv.id },
            data:  { paidAmount: newPaid, status: newStatus, ...(newStatus === 'paid' ? { paidAt: new Date() } : {}) },
          });
        }

        return approved;
      });

      return Response.json({ concession: updated });
    }

    if (action === 'reject') {
      if (!APPROVAL_ROLES.includes(primary.role_code)) throw new ForbiddenError('Approval role required');
      const updated = await prisma.feeConcession.update({
        where: { id },
        data:  { status: 'rejected', isActive: false, approvedById: user.id, approvedAt: new Date(), reason: body.reason ?? concession.reason },
      });
      return Response.json({ concession: updated });
    }

    if (concession.status === 'approved')
      throw new AppError('Approved concessions cannot be edited. Reject and recreate.', 409);

    const updated = await prisma.feeConcession.update({
      where: { id },
      data: {
        ...(body.concessionType  !== undefined ? { concessionType: body.concessionType }                     : {}),
        ...(body.discountPercent !== undefined ? { discountPercent: body.discountPercent }                   : {}),
        ...(body.discountAmount  !== undefined ? { discountAmount: body.discountAmount }                     : {}),
        ...(body.academicYear    !== undefined ? { academicYear: body.academicYear }                         : {}),
        ...(body.validFrom       !== undefined ? { validFrom: body.validFrom ? new Date(body.validFrom) : null } : {}),
        ...(body.validTo         !== undefined ? { validTo:   body.validTo   ? new Date(body.validTo)   : null } : {}),
        ...(body.reason          !== undefined ? { reason: body.reason }                                     : {}),
      },
    });

    return Response.json({ concession: updated });
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

    const concession = await prisma.feeConcession.findUnique({ where: { id } });
    if (!concession) throw new AppError('Concession not found', 404);
    if (primary.school_id && concession.schoolId !== primary.school_id) throw new ForbiddenError();
    if (concession.status === 'approved')
      throw new AppError('Cannot delete an approved concession', 409);

    await prisma.feeConcession.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
