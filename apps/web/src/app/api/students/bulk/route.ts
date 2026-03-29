import ExcelJS from 'exceljs';
import { getUserFromRequest } from '@/lib/auth';
import { bulkUploadStudents, parseStudentCSV } from '@/modules/students/student.service';
import { listClasses } from '@/modules/classes/class.service';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';

const ADMIN_ROLES = ['super_admin', 'school_admin'];

// ── helpers ──────────────────────────────────────────────────────────────────

function classLabel(c: { grade: string; section: string }) {
  return `${c.grade} - ${c.section}`;
}

/** Parse an xlsx ArrayBuffer into rows with lowercase header keys. */
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
    // skip completely empty rows
    if (Object.values(obj).some((v) => v !== '')) rows.push(obj);
  });

  return rows;
}

// ── GET /api/students/bulk ────────────────────────────────────────────────────
/**
 * Returns an Excel template (.xlsx) with:
 *  - Column headers
 *  - Data-validation dropdown for the "Class" column populated from school's classes
 *  - Example row
 */
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primaryRole.role_code)) throw new ForbiddenError('Admin access required');

    const classes = await listClasses(primaryRole.school_id!);
    const labels  = classes.map(classLabel); // e.g. ["Grade 5 - A", "Grade 6 - B"]

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Yulaa';

    // ── "Students" sheet ─────────────────────────────────────────────────────
    const ws = wb.addWorksheet('Students');

    // Header row
    const HEADERS = [
      { header: 'admission_no', key: 'admission_no', width: 18 },
      { header: 'first_name',   key: 'first_name',   width: 18 },
      { header: 'last_name',    key: 'last_name',    width: 18 },
      { header: 'dob',          key: 'dob',          width: 14 },
      { header: 'gender',       key: 'gender',       width: 12 },
      { header: 'class',        key: 'class',        width: 20 },
      { header: 'address',      key: 'address',      width: 30 },
      { header: 'blood_group',  key: 'blood_group',  width: 14 },
    ];
    ws.columns = HEADERS;

    // Style header row
    const headerRow = ws.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    headerRow.height = 22;

    // Example row (row 2)
    ws.addRow({
      admission_no: '2024001',
      first_name:   'John',
      last_name:    'Smith',
      dob:          '2010-05-15',
      gender:       'male',
      class:        labels[0] ?? 'Grade 5 - A',
      address:      '123 Main Street',
      blood_group:  'O+',
    });

    // Freeze header row
    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

    // Data-validation dropdown for "class" column (column F = index 6)
    if (labels.length > 0) {
      // Put class list on a hidden sheet so we can reference it for the formula
      const refWs = wb.addWorksheet('_classes');
      refWs.state = 'veryHidden';
      labels.forEach((lbl, i) => {
        refWs.getCell(i + 1, 1).value = lbl;
      });

      // Apply dropdown to rows 2–500
      for (let row = 2; row <= 500; row++) {
        ws.getCell(row, 6).dataValidation = {
          type:           'list',
          allowBlank:     true,
          formulae:       [`_classes!$A$1:$A$${labels.length}`],
          showErrorMessage: true,
          errorTitle:     'Invalid class',
          error:          `Please select a class from the dropdown.`,
        };
      }
    }

    // ── Serialize and return ─────────────────────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer();
    return new Response(buffer, {
      headers: {
        'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="students-template.xlsx"',
      },
    });
  } catch (err) { return handleError(err); }
}

// ── POST /api/students/bulk ───────────────────────────────────────────────────
/**
 * Accepts multipart/form-data { file: CSV or XLSX }
 * Returns: { created, errors, total }
 */
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

    let rows: Record<string, string>[];
    if (isXlsx) {
      rows = await parseXlsx(await file.arrayBuffer());
    } else {
      rows = parseStudentCSV(await file.text());
    }

    const classes  = await listClasses(schoolId);
    const classMap = classes.map((c) => ({ id: c.id, grade: c.grade, section: c.section }));

    const result = await bulkUploadStudents(schoolId, rows, classMap);
    return Response.json(result);
  } catch (err) { return handleError(err); }
}
