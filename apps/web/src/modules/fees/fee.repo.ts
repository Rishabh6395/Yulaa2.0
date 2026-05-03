import prisma from '@/lib/prisma';
import type { CreateInvoiceInput, RecordPaymentInput } from './fee.types';
import { currentAcademicYearLabel } from '@/lib/school-utils';

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

// ── Fee Structures (Fee Type Master) ──────────────────────────────────────────

export async function findFeeStructures(schoolId: string) {
  return prisma.feeStructure.findMany({
    where: { schoolId },
    include: { class: { select: { name: true, grade: true, section: true } } },
    orderBy: [{ name: 'asc' }],
  });
}

export async function upsertFeeStructure(data: {
  id?: string;
  schoolId: string;
  name: string;
  amount: number;
  frequency: string;
  classId?: string | null;
  academicYear: string;
}) {
  if (data.id) {
    return prisma.feeStructure.update({
      where: { id: data.id },
      data: { name: data.name, amount: data.amount, frequency: data.frequency, classId: data.classId ?? null, academicYear: data.academicYear },
    });
  }
  return prisma.feeStructure.create({
    data: {
      school:      { connect: { id: data.schoolId } },
      name:        data.name,
      amount:      data.amount,
      frequency:   data.frequency,
      academicYear: data.academicYear,
      ...(data.classId ? { class: { connect: { id: data.classId } } } : {}),
    },
  });
}

export async function findStudentsByClass(schoolId: string, classId: string) {
  return prisma.student.findMany({
    where: { schoolId, classId, status: 'active' },
    select: { id: true, firstName: true, lastName: true, admissionNo: true },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  });
}

export async function bulkCreateInvoices(invoices: {
  schoolId: string; studentId: string; amount: number;
  dueDate: Date; feeStructureId?: string; installmentNo: number;
}[]) {
  // Use Promise.all with individual creates — invoices are independent so no transaction needed,
  // and this avoids Prisma's 5-second interactive-transaction timeout on Neon cold starts.
  const results = await Promise.allSettled(
    invoices.map(inv =>
      prisma.feeInvoice.create({
        data: {
          school:        { connect: { id: inv.schoolId } },
          student:       { connect: { id: inv.studentId } },
          invoiceNo:     `INV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
          amount:        inv.amount,
          dueDate:       inv.dueDate,
          installmentNo: inv.installmentNo,
          ...(inv.feeStructureId ? { feeStructure: { connect: { id: inv.feeStructureId } } } : {}),
        },
      })
    )
  );
  const created = results.filter(r => r.status === 'fulfilled').length;
  const failed  = results.filter(r => r.status === 'rejected').length;
  return { created, failed };
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
