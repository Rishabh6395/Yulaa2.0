import { AppError, NotFoundError } from '@/utils/errors';
import * as repo from './fee.repo';
import type { FeeInvoiceRow, FeeSummary } from './fee.types';

export async function listInvoices(schoolId: string, searchParams: URLSearchParams) {
  const status    = searchParams.get('status');
  const studentId = searchParams.get('student_id');

  const [invoices, allInvoices] = await Promise.all([
    repo.findInvoices(schoolId, status, studentId),
    repo.findAllInvoicesSummary(schoolId),
  ]);

  const rows: FeeInvoiceRow[] = invoices.map((fi) => ({
    id:             fi.id,
    invoice_no:     fi.invoiceNo,
    amount:         Number(fi.amount),
    due_date:       fi.dueDate,
    status:         fi.status,
    paid_amount:    Number(fi.paidAmount),
    paid_at:        fi.paidAt,
    installment_no: fi.installmentNo,
    student_name:   `${fi.student.firstName} ${fi.student.lastName}`,
    admission_no:   fi.student.admissionNo,
    grade:          fi.student.class?.grade   ?? null,
    section:        fi.student.class?.section ?? null,
  }));

  const summary: FeeSummary = {
    total:         allInvoices.reduce((s, i) => s + Number(i.amount), 0),
    collected:     allInvoices.reduce((s, i) => s + Number(i.paidAmount), 0),
    pending:       allInvoices
      .filter((i) => ['unpaid', 'overdue', 'partial'].includes(i.status))
      .reduce((s, i) => s + (Number(i.amount) - Number(i.paidAmount)), 0),
    overdue_count: allInvoices.filter((i) => i.status === 'overdue').length,
    unpaid_count:  allInvoices.filter((i) => i.status === 'unpaid').length,
  };

  return { invoices: rows, summary };
}

export async function createInvoice(schoolId: string, body: Record<string, any>) {
  const { student_id, amount, due_date, installment_no } = body;
  if (!student_id || !amount || !due_date) {
    throw new AppError('student_id, amount, and due_date are required');
  }
  return repo.createInvoice({ schoolId, studentId: student_id, amount, dueDate: due_date, installmentNo: installment_no });
}

export async function recordPayment(body: Record<string, any>) {
  const { id, payment_amount, payment_method, transaction_ref } = body;
  if (!id || !payment_amount) throw new AppError('id and payment_amount are required');

  const result = await repo.recordPayment({
    invoiceId:      id,
    paymentAmount:  payment_amount,
    paymentMethod:  payment_method,
    transactionRef: transaction_ref,
  });

  if (!result) throw new NotFoundError('Invoice');
  return result;
}
