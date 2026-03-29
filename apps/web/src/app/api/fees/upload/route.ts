import ExcelJS from 'exceljs';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import { parseCSV } from '@/services/upload.service';

const ADMIN_ROLES = ['super_admin', 'school_admin'];

async function parseXlsx(buffer: ArrayBuffer): Promise<Record<string, string>[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const headers: string[] = [];
  const rows: Record<string, string>[] = [];
  ws.eachRow((row, rowIdx) => {
    if (rowIdx === 1) {
      row.eachCell((cell) => headers.push(String(cell.value ?? '').trim().toLowerCase()));
      return;
    }
    const obj: Record<string, string> = {};
    row.eachCell({ includeEmpty: true }, (cell, colIdx) => {
      const key = headers[colIdx - 1];
      if (key) obj[key] = cell.value == null ? '' : String(cell.value).trim();
    });
    if (Object.values(obj).some((v) => v !== '')) rows.push(obj);
  });
  return rows;
}

// GET — download Excel template
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primaryRole.role_code)) throw new ForbiddenError();

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Yulaa';
    const ws = wb.addWorksheet('Fee Invoices');
    ws.columns = [
      { header: 'admission_no',   key: 'admission_no',   width: 18 },
      { header: 'amount',         key: 'amount',         width: 14 },
      { header: 'due_date',       key: 'due_date',       width: 16 },
      { header: 'installment_no', key: 'installment_no', width: 18 },
      { header: 'description',    key: 'description',    width: 30 },
    ];
    const hRow = ws.getRow(1);
    hRow.eachCell(cell => {
      cell.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    hRow.height = 22;
    ws.addRow({ admission_no: '2024001', amount: '15000', due_date: '2025-04-30', installment_no: '1', description: 'Term 1 Fee' });
    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

    const buffer = await wb.xlsx.writeBuffer();
    return new Response(buffer, {
      headers: {
        'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="fees-template.xlsx"',
      },
    });
  } catch (err) { return handleError(err); }
}

// POST — bulk create invoices from CSV/XLSX
export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primaryRole.role_code)) throw new ForbiddenError();

    const schoolId = primaryRole.school_id!;
    const form     = await request.formData();
    const file     = form.get('file') as File | null;
    if (!file) throw new AppError('File is required');

    const isXlsx = file.name.endsWith('.xlsx') || file.type.includes('spreadsheetml');
    const rows   = isXlsx ? await parseXlsx(await file.arrayBuffer()) : parseCSV(await file.text());

    if (rows.length === 0) throw new AppError('File is empty or has no data rows');

    // Build admission_no → student map
    const admissionNos = [...new Set(rows.map(r => r['admission_no']?.trim()).filter(Boolean))];
    const students     = await prisma.student.findMany({
      where: { schoolId, admissionNo: { in: admissionNos } },
      select: { id: true, admissionNo: true },
    });
    const studentMap = new Map(students.map(s => [s.admissionNo, s.id]));

    let created = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row    = rows[i];
      const rowNum = i + 2;

      const admissionNo    = row['admission_no']?.trim();
      const amount         = parseFloat(row['amount']?.trim() || '');
      const dueDateStr     = row['due_date']?.trim();
      const installmentNo  = parseInt(row['installment_no']?.trim() || '1', 10);

      if (!admissionNo || !dueDateStr || isNaN(amount) || amount <= 0) {
        errors.push(`Row ${rowNum}: admission_no, amount, and due_date are required`);
        continue;
      }

      const studentId = studentMap.get(admissionNo);
      if (!studentId) {
        errors.push(`Row ${rowNum}: Student with admission_no "${admissionNo}" not found`);
        continue;
      }

      try {
        await prisma.feeInvoice.create({
          data: {
            schoolId,
            studentId,
            invoiceNo:     `INV-${Date.now()}-${i}`,
            amount,
            dueDate:       new Date(dueDateStr),
            installmentNo: isNaN(installmentNo) ? 1 : installmentNo,
          },
        });
        created++;
      } catch (err: any) {
        errors.push(`Row ${rowNum} (${admissionNo}): ${err.message ?? 'insert failed'}`);
      }
    }

    return Response.json({ created, errors, total: rows.length });
  } catch (err) { return handleError(err); }
}
