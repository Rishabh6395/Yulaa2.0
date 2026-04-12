import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';
import { bulkUpsertTeacherBalances } from '@/modules/leave/leave.repo';

const ADMIN_ROLES = ['super_admin', 'school_admin', 'principal'];

/**
 * POST /api/leave/bulk
 * Bulk upload teacher leave balances via Excel/CSV.
 * Only accessible to school_admin / principal / super_admin.
 *
 * Body (JSON): { fileData: <base64>, fileExt: 'csv'|'xlsx', academicYear: '2025-26' }
 *
 * Template columns: employee_id, teacher_id, leave_type, total_days
 *
 * GET /api/leave/bulk?action=template  → downloads the Excel template
 */

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primaryRole.role_code)) throw new ForbiddenError();

    const { searchParams } = new URL(request.url);
    if (searchParams.get('action') !== 'template') {
      return Response.json({ error: 'Use ?action=template to download template' }, { status: 400 });
    }

    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Leave Balance');
    ws.columns = [
      { header: 'employee_id', key: 'employee_id', width: 18 },
      { header: 'teacher_id',  key: 'teacher_id',  width: 36 },
      { header: 'leave_type',  key: 'leave_type',  width: 20 },
      { header: 'total_days',  key: 'total_days',  width: 12 },
    ];
    ws.addRow({ employee_id: 'EMP001', teacher_id: '<uuid from system>', leave_type: 'sick',   total_days: 10 });
    ws.addRow({ employee_id: 'EMP001', teacher_id: '<uuid from system>', leave_type: 'casual', total_days: 12 });

    const buf = await wb.xlsx.writeBuffer();
    return new Response(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="leave-balance-template.xlsx"',
      },
    });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const schoolId    = primaryRole.school_id!;
    if (!ADMIN_ROLES.includes(primaryRole.role_code)) throw new ForbiddenError();

    const body = await request.json();
    const { fileData, fileExt, academicYear } = body;
    if (!fileData) throw new AppError('fileData (base64) is required');

    const currentYear = academicYear || (() => {
      const y = new Date().getFullYear();
      return `${y}-${String(y + 1).slice(2)}`;
    })();

    const buf  = Buffer.from(fileData, 'base64');
    const rows: { teacher_id: string; leave_type: string; total_days: number }[] = [];

    if (fileExt === 'csv') {
      const text  = buf.toString('utf-8');
      const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean);
      for (const line of lines.slice(1)) {
        const [, teacher_id, leave_type, total_days_str] = line
          .split(',')
          .map((s: string) => s.trim().replace(/^["']|["']$/g, ''));
        if (teacher_id && leave_type && total_days_str) {
          rows.push({ teacher_id, leave_type: leave_type.toLowerCase(), total_days: parseInt(total_days_str, 10) || 0 });
        }
      }
    } else {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await wb.xlsx.load(buf as any);
      const ws = wb.worksheets[0];
      ws.eachRow((row: any, rowNum: number) => {
        if (rowNum === 1) return;
        const teacher_id  = row.getCell(2).value?.toString?.()?.trim();
        const leave_type  = row.getCell(3).value?.toString?.()?.trim()?.toLowerCase();
        const total_days  = parseInt(row.getCell(4).value?.toString?.() || '0', 10);
        if (teacher_id && leave_type) rows.push({ teacher_id, leave_type, total_days: total_days || 0 });
      });
    }

    if (rows.length === 0) throw new AppError('No valid rows found in the uploaded file');

    // Map teacher_id → validate they belong to this school
    const teachers = await prisma.teacher.findMany({
      where: { schoolId, id: { in: rows.map(r => r.teacher_id) } },
      select: { id: true },
    });
    const validIds = new Set(teachers.map(t => t.id));

    const validRows = rows
      .filter(r => validIds.has(r.teacher_id))
      .map(r => ({ schoolId, teacherId: r.teacher_id, leaveType: r.leave_type, academicYear: currentYear, totalDays: r.total_days }));

    const skipped = rows.length - validRows.length;
    await bulkUpsertTeacherBalances(validRows);

    return Response.json({ saved: validRows.length, skipped, total: rows.length });
  } catch (err) { return handleError(err); }
}
