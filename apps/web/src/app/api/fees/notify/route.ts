import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const ALLOWED = ['super_admin', 'school_admin', 'principal'];

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!ALLOWED.includes(primary.role_code)) throw new ForbiddenError();

    const body = await request.json();
    const { invoiceId, studentId, message } = body;
    const schoolId = primary.school_id;
    if (!schoolId) throw new AppError('No school assigned');

    // Find overdue / pending invoices to notify about
    const where: any = { schoolId, status: { in: ['pending', 'overdue', 'partially_paid'] } };
    if (invoiceId) where.id = invoiceId;
    if (studentId) where.studentId = studentId;

    const invoices = await prisma.feeInvoice.findMany({
      where,
      include: {
        student: {
          include: {
            parents: {
              include: { parent: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } } },
              take: 1,
            },
          },
        },
      },
      take: 100,
    });

    if (invoices.length === 0) return Response.json({ notified: 0, message: 'No pending invoices found' });

    // Create in-app notification records for each invoice's parent
    const notificationData: any[] = [];
    for (const inv of invoices) {
      const parent = inv.student?.parents?.[0]?.parent;
      if (!parent) continue;
      const amount = Number(inv.amount) - Number(inv.paidAmount || 0);
      const notifMsg = message || `Fee reminder: ₹${amount.toFixed(2)} is due for ${inv.student.name}. Invoice #${inv.id.slice(-6).toUpperCase()}. Please pay at the earliest.`;
      notificationData.push({
        schoolId,
        userId: parent.userId,
        type: 'fee_reminder',
        title: 'Fee Payment Reminder',
        message: notifMsg,
        relatedId: inv.id,
        isRead: false,
      });
    }

    if (notificationData.length > 0) {
      await prisma.notification.createMany({ data: notificationData, skipDuplicates: true });
    }

    return Response.json({ notified: notificationData.length, total: invoices.length });
  } catch (err) { return handleError(err); }
}
