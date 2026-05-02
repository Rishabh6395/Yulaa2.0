import { PRINCIPAL_ADMIN_ROLES as ADMIN_ROLES } from '@/lib/roles';
import { getUserFromRequest } from '@/lib/auth';
import { listInvoices } from '@/modules/fees/fee.service';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';


export async function GET(request: Request) {
  try {
    const user        = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primaryRole.role_code)) throw new ForbiddenError();

    const { searchParams } = new URL(request.url);
    const { invoices } = await listInvoices(primaryRole.school_id!, searchParams);

    const header = ['Invoice No', 'Student Name', 'Class', 'Section', 'Amount (₹)', 'Due Date', 'Paid (₹)', 'Status'];
    const rows   = invoices.map(inv => [
      inv.invoice_no,
      inv.student_name,
      inv.grade  ?? '',
      inv.section ?? '',
      inv.amount,
      new Date(inv.due_date).toLocaleDateString('en-IN'),
      inv.paid_amount,
      inv.status,
    ]);

    const csv = [header, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

    return new Response(csv, {
      headers: {
        'Content-Type':        'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="fees-${new Date().toISOString().slice(0,10)}.csv"`,
      },
    });
  } catch (err) { return handleError(err); }
}
