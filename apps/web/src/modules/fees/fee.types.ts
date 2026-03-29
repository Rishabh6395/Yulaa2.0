export interface FeeInvoiceRow {
  id:             string;
  invoice_no:     string;
  amount:         number;
  due_date:       Date;
  status:         string;
  paid_amount:    number;
  paid_at:        Date | null;
  installment_no: number;
  student_name:   string;
  admission_no:   string;
  grade:          string | null;
  section:        string | null;
}

export interface FeeSummary {
  total:         number;
  collected:     number;
  pending:       number;
  overdue_count: number;
  unpaid_count:  number;
}

export interface CreateInvoiceInput {
  schoolId:       string;
  studentId:      string;
  amount:         number;
  dueDate:        string;
  installmentNo?: number;
}

export interface RecordPaymentInput {
  invoiceId:      string;
  paymentAmount:  number;
  paymentMethod?: string;
  transactionRef?: string;
}
