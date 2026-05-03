import { CORE_ADMIN_ROLES as ADMIN_ROLES } from '@/lib/roles';
import { getUserFromRequest } from '@/lib/auth';
import { listInvoices, createInvoice, recordPayment, listFeeStructures, upsertFeeStructure, applyBulkFees } from '@/modules/fees/fee.service';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';

export async function GET(request: Request) {
  try {
    const user        = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'structures') {
      return Response.json({ structures: await listFeeStructures(primaryRole.school_id!) });
    }

    return Response.json(await listInvoices(primaryRole.school_id!, searchParams));
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

    const invoice = await createInvoice(primaryRole.school_id!, body);
    return Response.json({ invoice }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user    = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const invoice = await recordPayment(await request.json());
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
