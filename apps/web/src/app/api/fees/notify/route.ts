import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const ALLOWED = ['super_admin', 'school_admin', 'principal'];

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!ALLOWED.includes(primary.role_code)) throw new ForbiddenError();

    const schoolId = primary.school_id as string;

    // Count unpaid/overdue invoices that have parents linked
    const invoices = await prisma.feeInvoice.findMany({
      where: { schoolId, status: { in: ['unpaid', 'overdue', 'partial'] } },
      select: { id: true, studentId: true },
    });

    // Find distinct student IDs that have parent links
    const studentIds = [...new Set(invoices.map(i => i.studentId))];
    const parentLinks = await prisma.parentStudent.findMany({
      where: { studentId: { in: studentIds } },
      select: { studentId: true, parentId: true },
    });

    const notified = new Set(parentLinks.map(p => p.parentId)).size;

    // In a real integration you would fire push/SMS/email here.
    // For now we return the count of parents that would be notified.
    return Response.json({ notified, total: invoices.length });
  } catch (err) { return handleError(err); }
}
