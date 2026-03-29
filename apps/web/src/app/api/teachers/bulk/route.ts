import ExcelJS from 'exceljs';
import { getUserFromRequest } from '@/lib/auth';
import { bulkUploadTeachers, parseTeacherCSV } from '@/modules/teachers/teacher.service';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';

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

// GET /api/teachers/bulk — download Excel template
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primaryRole.role_code)) throw new ForbiddenError('Admin access required');

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Yulaa';

    const ws = wb.addWorksheet('Teachers');
    ws.columns = [
      { header: 'first_name',   key: 'first_name',   width: 18 },
      { header: 'last_name',    key: 'last_name',     width: 18 },
      { header: 'email',        key: 'email',         width: 28 },
      { header: 'password',     key: 'password',      width: 18 },
      { header: 'phone',        key: 'phone',         width: 16 },
      { header: 'employee_id',  key: 'employee_id',   width: 16 },
      { header: 'qualification',key: 'qualification', width: 20 },
      { header: 'joining_date', key: 'joining_date',  width: 16 },
    ];

    const headerRow = ws.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    headerRow.height = 22;

    ws.addRow({
      first_name:    'Priya',
      last_name:     'Sharma',
      email:         'priya.sharma@school.edu',
      password:      'Welcome@123',
      phone:         '+91 98765 43210',
      employee_id:   'EMP-001',
      qualification: 'B.Ed, M.A.',
      joining_date:  '2024-06-01',
    });

    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

    const buffer = await wb.xlsx.writeBuffer();
    return new Response(buffer, {
      headers: {
        'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="teachers-template.xlsx"',
      },
    });
  } catch (err) { return handleError(err); }
}

// POST /api/teachers/bulk — upload CSV or XLSX
export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primaryRole.role_code)) throw new ForbiddenError('Admin access required');

    const schoolId = primaryRole.school_id;
    if (!schoolId) throw new AppError('No school associated with this account');

    const form = await request.formData();
    const file = form.get('file') as File | null;
    if (!file) throw new AppError('File is required');

    const isXlsx = file.name.endsWith('.xlsx') || file.type.includes('spreadsheetml');
    const rows   = isXlsx
      ? await parseXlsx(await file.arrayBuffer())
      : parseTeacherCSV(await file.text());

    const result = await bulkUploadTeachers(schoolId, rows);
    return Response.json(result);
  } catch (err) { return handleError(err); }
}
