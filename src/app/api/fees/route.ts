import { getUserFromRequest } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
  const schoolId = primaryRole.school_id!;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const studentId = searchParams.get('student_id');

  try {
    const invoices = await prisma.feeInvoice.findMany({
      where: {
        schoolId,
        ...(status && { status }),
        ...(studentId && { studentId }),
      },
      include: {
        student: {
          include: { class: true },
        },
      },
      orderBy: { dueDate: 'desc' },
    });

    const rows = invoices.map((fi) => ({
      id: fi.id,
      invoice_no: fi.invoiceNo,
      amount: Number(fi.amount),
      due_date: fi.dueDate,
      status: fi.status,
      paid_amount: Number(fi.paidAmount),
      paid_at: fi.paidAt,
      installment_no: fi.installmentNo,
      student_name: `${fi.student.firstName} ${fi.student.lastName}`,
      admission_no: fi.student.admissionNo,
      grade: fi.student.class?.grade ?? null,
      section: fi.student.class?.section ?? null,
    }));

    // Summary for entire school
    const allInvoices = await prisma.feeInvoice.findMany({
      where: { schoolId },
      select: { amount: true, paidAmount: true, status: true },
    });

    const total = allInvoices.reduce((s, i) => s + Number(i.amount), 0);
    const collected = allInvoices.reduce((s, i) => s + Number(i.paidAmount), 0);
    const pending = allInvoices
      .filter((i) => ['unpaid', 'overdue', 'partial'].includes(i.status))
      .reduce((s, i) => s + (Number(i.amount) - Number(i.paidAmount)), 0);
    const overdue_count = allInvoices.filter((i) => i.status === 'overdue').length;
    const unpaid_count = allInvoices.filter((i) => i.status === 'unpaid').length;

    return Response.json({
      invoices: rows,
      summary: { total, collected, pending, overdue_count, unpaid_count },
    });
  } catch (err) {
    console.error('Fees GET error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
  const schoolId = primaryRole.school_id!;

  try {
    const body = await request.json();
    const { student_id, amount, due_date, installment_no } = body;

    if (!student_id || !amount || !due_date) {
      return Response.json({ error: 'student_id, amount, and due_date required' }, { status: 400 });
    }

    const invoiceNo = `INV-${Date.now()}`;
    const invoice = await prisma.feeInvoice.create({
      data: {
        schoolId,
        studentId: student_id,
        invoiceNo,
        amount,
        dueDate: new Date(due_date),
        installmentNo: installment_no || 1,
      },
    });

    return Response.json({ invoice }, { status: 201 });
  } catch (err) {
    console.error('Fees POST error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { id, payment_amount, payment_method, transaction_ref } = body;

    if (!id || !payment_amount) {
      return Response.json({ error: 'id and payment_amount required' }, { status: 400 });
    }

    const invoice = await prisma.feeInvoice.findUnique({
      where: { id },
      select: { amount: true, paidAmount: true },
    });

    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const newPaidAmount = Number(invoice.paidAmount) + Number(payment_amount);
    const totalAmount = Number(invoice.amount);
    const newStatus =
      newPaidAmount >= totalAmount ? 'paid' : newPaidAmount > 0 ? 'partial' : 'unpaid';

    await prisma.feePayment.create({
      data: {
        invoiceId: id,
        amount: payment_amount,
        paymentMethod: payment_method || 'online',
        transactionRef: transaction_ref || null,
      },
    });

    const updated = await prisma.feeInvoice.update({
      where: { id },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
        paidAt: newStatus === 'paid' ? new Date() : undefined,
      },
    });

    return Response.json({ invoice: updated });
  } catch (err) {
    console.error('Fees PATCH error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
