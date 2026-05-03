import prisma from '@/lib/prisma';
import type { CreateInvoiceInput, RecordPaymentInput } from './fee.types';

export async function findInvoices(schoolId: string, status?: string | null, studentId?: string | null) {
  return prisma.feeInvoice.findMany({
    where: {
      schoolId,
      ...(status    && { status }),
      ...(studentId && { studentId }),
    },
    include: { student: { include: { class: true } } },
    orderBy: { dueDate: 'desc' },
  });
}

export async function findAllInvoicesSummary(schoolId: string) {
  return prisma.feeInvoice.findMany({
    where: { schoolId },
    select: { amount: true, paidAmount: true, status: true },
  });
}

export async function createInvoice(data: CreateInvoiceInput) {
  return prisma.feeInvoice.create({
    data: {
      schoolId:      data.schoolId,
      studentId:     data.studentId,
      invoiceNo:     `INV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      amount:        data.amount,
      dueDate:       new Date(data.dueDate),
      installmentNo: data.installmentNo || 1,
    },
  });
}

export async function findInvoiceById(id: string) {
  return prisma.feeInvoice.findUnique({
    where: { id },
    select: { amount: true, paidAmount: true },
  });
}

export async function recordPayment(data: RecordPaymentInput) {
  const invoice = await findInvoiceById(data.invoiceId);
  if (!invoice) return null;

  const newPaid  = Number(invoice.paidAmount) + Number(data.paymentAmount);
  const total    = Number(invoice.amount);
  const status   = newPaid >= total ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';

  await prisma.feePayment.create({
    data: {
      invoiceId:      data.invoiceId,
      amount:         data.paymentAmount,
      paymentMethod:  data.paymentMethod  || 'online',
      transactionRef: data.transactionRef || null,
    },
  });

  return prisma.feeInvoice.update({
    where: { id: data.invoiceId },
    data: {
      paidAmount: newPaid,
      status,
      paidAt: status === 'paid' ? new Date() : undefined,
    },
  });
}
