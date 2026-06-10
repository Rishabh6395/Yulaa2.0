import { CORE_ADMIN_ROLES as ADMIN_ROLES, PRINCIPAL_ADMIN_ROLES } from '@/lib/roles';
import { getUserFromRequest } from '@/lib/auth';
import { listInvoices, createInvoice, recordPayment, listFeeStructures, upsertFeeStructure, applyBulkFees } from '@/modules/fees/fee.service';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';
import { assertParentOwnsStudent } from '@/lib/school-utils';

export async function GET(request: Request) {
  try {
    const user        = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const { role_code: role, school_id: schoolId } = primaryRole;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'structures') {
      return Response.json({ structures: await listFeeStructures(schoolId!) });
    }

    // Role-based invoice scoping — prevent cross-student data access
    const scopedParams = new URLSearchParams(searchParams);

    if (role === 'student') {
      const student = await prisma.student.findFirst({ where: { userId: user.id, schoolId: schoolId! }, select: { id: true } });
      if (!student) return Response.json({ invoices: [], summary: { total: 0, collected: 0, pending: 0, overdue_count: 0, unpaid_count: 0 } });
      scopedParams.set('student_id', student.id);
    } else if (role === 'parent') {
      const requestedStudentId = searchParams.get('student_id');
      if (!requestedStudentId) return Response.json({ invoices: [], summary: { total: 0, collected: 0, pending: 0, overdue_count: 0, unpaid_count: 0 } });
      await assertParentOwnsStudent(user.id, requestedStudentId);
    } else if (!PRINCIPAL_ADMIN_ROLES.includes(role)) {
      // Teachers and HODs have no legitimate need to see school-wide fee records (G-011).
      throw new ForbiddenError('Fee records are accessible to admins, principals, students, and parents only');
    }

    const result = await listInvoices(schoolId!, scopedParams);

    // For student/parent views, recalculate the summary from their scoped invoices only —
    // prevents leaking school-wide aggregate financial data to non-admin roles.
    if (role === 'student' || role === 'parent') {
      const inv = result.invoices;
      result.summary = {
        total:         inv.reduce((s: number, i: any) => s + i.amount, 0),
        collected:     inv.reduce((s: number, i: any) => s + i.paid_amount, 0),
        pending:       inv.filter((i: any) => ['unpaid', 'overdue', 'partial'].includes(i.status))
                          .reduce((s: number, i: any) => s + (i.amount - i.paid_amount), 0),
        overdue_count: inv.filter((i: any) => i.status === 'overdue').length,
        unpaid_count:  inv.filter((i: any) => i.status === 'unpaid').length,
      };
    }

    return Response.json(result);
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user        = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const body        = await request.json();

    if (body.action === 'upsert_structure') {
      if (!ADMIN_ROLES.includes(primaryRole.role_code)) throw new ForbiddenError('Admin access required');
      const structure = await upsertFeeStructure(primaryRole.school_id!, body);
      return Response.json({ structure }, { status: 201 });
    }

    if (body.action === 'apply_bulk') {
      if (!ADMIN_ROLES.includes(primaryRole.role_code)) throw new ForbiddenError('Admin access required');
      const result = await applyBulkFees(primaryRole.school_id!, body);
      return Response.json(result, { status: 201 });
    }

    // createInvoice is an admin-only operation
    if (!PRINCIPAL_ADMIN_ROLES.includes(primaryRole.role_code)) throw new ForbiddenError('Admin access required');
    const invoice = await createInvoice(primaryRole.school_id!, body);
    return Response.json({ invoice }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user        = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!PRINCIPAL_ADMIN_ROLES.includes(primaryRole.role_code)) throw new ForbiddenError('Admin access required');
    if (!primaryRole.school_id) throw new ForbiddenError('No school associated with this account');
    // school_id comes from the verified JWT — prevents cross-school invoice modification
    const invoice = await recordPayment(await request.json(), primaryRole.school_id);
    return Response.json({ invoice });
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request) {
  try {
    const user        = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primaryRole.role_code)) throw new ForbiddenError('Admin access required');
    const { searchParams } = new URL(request.url);
    const structureId = searchParams.get('structureId');
    if (!structureId) throw new AppError('structureId required');
    const prisma = (await import('@/lib/prisma')).default;
    const s = await prisma.feeStructure.findFirst({ where: { id: structureId, schoolId: primaryRole.school_id! } });
    if (!s) throw new AppError('Fee structure not found', 404);
    await prisma.feeStructure.delete({ where: { id: structureId } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
