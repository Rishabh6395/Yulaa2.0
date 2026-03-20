import { getUserFromRequest } from '@/lib/auth';
import { listInvoices, createInvoice, recordPayment } from '@/modules/fees/fee.service';
import { handleError, UnauthorizedError } from '@/utils/errors';

export async function GET(request: Request) {
  try {
    const user        = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const { searchParams } = new URL(request.url);
    return Response.json(await listInvoices(primaryRole.school_id!, searchParams));
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user        = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const invoice     = await createInvoice(primaryRole.school_id!, await request.json());
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
