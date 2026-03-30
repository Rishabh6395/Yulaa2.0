import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';
import { htmlToPdf } from '@/services/pdf.service';
import { renderTemplate } from '@/services/template.service';
import { DEFAULT_FEE_INVOICE_TEMPLATE } from '@/services/default-templates';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    // Admins, teachers and parents can generate invoices
    if (!['super_admin', 'school_admin', 'principal', 'parent', 'teacher'].includes(primary.role_code)) throw new ForbiddenError();

    const { searchParams } = new URL(request.url);
    const invoiceId  = searchParams.get('invoiceId');
    const preview    = searchParams.get('preview') === '1'; // return HTML instead of PDF
    if (!invoiceId) throw new AppError('invoiceId required');

    const schoolId = primary.school_id;

    // Fetch invoice with all related data
    const invoice = await prisma.feeInvoice.findFirst({
      where: { id: invoiceId, ...(schoolId ? { schoolId } : {}) },
      include: {
        school:  true,
        student: { include: { class: true } },
      },
    });
    if (!invoice) throw new AppError('Invoice not found');

    // Get school's custom template, or system default
    const customTemplate = await prisma.letterTemplate.findFirst({
      where: { schoolId: invoice.schoolId, templateType: 'fee_invoice', isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
    const templateHtml = customTemplate?.htmlContent ?? DEFAULT_FEE_INVOICE_TEMPLATE;

    const school  = invoice.school;
    const student = invoice.student;
    const cls     = student.class;

    const amount     = Number(invoice.amount);
    const paid       = Number(invoice.paidAmount);
    const balance    = Math.max(0, amount - paid);

    const fmt = (d: Date) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const data: Record<string, string> = {
      // School
      school_name:    school.name,
      school_address: school.address ?? '',
      school_email:   school.email ?? '',
      school_phone:   school.phone ?? '',
      school_city:    school.city ?? '',
      school_website: school.website ?? '',
      school_logo:    school.logoUrl ? `<img src="${school.logoUrl}" style="max-height:60px;max-width:120px;object-fit:contain;"/>` : '',
      // Student
      student_name:         `${student.firstName} ${student.lastName}`,
      student_first_name:   student.firstName,
      student_last_name:    student.lastName,
      student_admission_no: student.admissionNo,
      student_class:        cls?.name ?? '',
      student_grade:        cls?.grade ?? '',
      student_section:      cls?.section ?? '',
      // Invoice
      invoice_no:     invoice.invoiceNo,
      invoice_date:   fmt(invoice.createdAt),
      due_date:       fmt(invoice.dueDate),
      amount:         amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      paid_amount:    paid.toLocaleString('en-IN',   { minimumFractionDigits: 2 }),
      balance_due:    balance.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      status:         invoice.status,
      installment_no: String(invoice.installmentNo),
      description:    'School Fee',
      academic_year:  cls?.academicYear ?? '',
      // General
      generated_date: fmt(new Date()),
      generated_by:   school.name,
    };

    const html = renderTemplate(templateHtml, data);

    if (preview) {
      return new Response(html, { headers: { 'Content-Type': 'text/html' } });
    }

    const pdf = await htmlToPdf(html);
    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNo}.pdf"`,
        'Content-Length':      String(pdf.length),
      },
    });
  } catch (err) { return handleError(err); }
}
