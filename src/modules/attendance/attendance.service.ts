import { AppError } from '@/utils/errors';
import { parseCSV, generateCSV, type CSVField } from '@/services/upload.service';
import * as repo from './attendance.repo';

// ── Shared CSV field definition for attendance ────────────────────────────────

const ATTENDANCE_FIELDS: CSVField[] = [
  { key: 'student_id',   header: 'student_id'   },
  { key: 'student_name', header: 'student_name'  },
  { key: 'admission_no', header: 'admission_no'  },
  { key: 'date',         header: 'date'          },
  { key: 'status',       header: 'status'        },
  { key: 'remarks',      header: 'remarks'       },
];

const VALID_STATUSES = new Set(['present', 'absent', 'late', 'half_day', 'excused']);

// ── Template download (empty CSV with student roster) ─────────────────────────

export async function getAttendanceTemplate(classId: string, date: string): Promise<string> {
  const students = await repo.findClassStudentsForTemplate(classId);
  const rows = students.map((s) => ({
    student_id:   s.id,
    student_name: `${s.firstName} ${s.lastName}`,
    admission_no: s.admissionNo,
    date,
    status:       '',
    remarks:      '',
  }));
  return generateCSV(rows, ATTENDANCE_FIELDS);
}

// ── Export existing attendance data as CSV ────────────────────────────────────

export async function exportAttendanceCSV(classId: string, date: string): Promise<string> {
  const parsedDate = new Date(date);
  parsedDate.setUTCHours(0, 0, 0, 0);
  const students = await repo.findClassAttendanceForDate(classId, parsedDate);
  const rows = students.map((s) => ({
    student_id:   s.id,
    student_name: `${s.firstName} ${s.lastName}`,
    admission_no: s.admissionNo,
    date,
    status:       s.attendance[0]?.status  ?? '',
    remarks:      s.attendance[0]?.remarks ?? '',
  }));
  return generateCSV(rows, ATTENDANCE_FIELDS);
}

// ── Bulk upload from CSV ───────────────────────────────────────────────────────

export async function bulkUploadAttendance(
  schoolId: string,
  classId: string,
  markedBy: string,
  csvText: string,
): Promise<{ saved: number; skipped: number; errors: string[] }> {
  const rows = parseCSV(csvText);
  if (rows.length === 0) throw new AppError('CSV is empty or has no data rows');

  const errors: string[] = [];
  const valid: Array<{ student_id: string; status: string; remarks?: string; date: Date }> = [];

  rows.forEach((row, i) => {
    const rowNum = i + 2; // account for header row
    if (!row.student_id) { errors.push(`Row ${rowNum}: missing student_id`);  return; }
    if (!row.date)        { errors.push(`Row ${rowNum}: missing date`);        return; }
    if (!row.status)      { errors.push(`Row ${rowNum}: missing status`);      return; }

    const status = row.status.toLowerCase().trim();
    if (!VALID_STATUSES.has(status)) {
      errors.push(`Row ${rowNum}: invalid status "${row.status}" — must be one of: present, absent, late, half_day, excused`);
      return;
    }

    const parsedDate = new Date(row.date);
    if (isNaN(parsedDate.getTime())) {
      errors.push(`Row ${rowNum}: invalid date "${row.date}" — use YYYY-MM-DD format`);
      return;
    }
    parsedDate.setUTCHours(0, 0, 0, 0);
    valid.push({ student_id: row.student_id, status, remarks: row.remarks || undefined, date: parsedDate });
  });

  if (valid.length > 0) {
    await repo.bulkUpsertAttendance(schoolId, classId, markedBy, valid);
  }

  return { saved: valid.length, skipped: errors.length, errors };
}

export async function getAttendance(schoolId: string, searchParams: URLSearchParams) {
  const dateStr   = searchParams.get('date')       || new Date().toISOString().split('T')[0];
  const classId   = searchParams.get('class_id');
  const studentId = searchParams.get('student_id');
  const month     = searchParams.get('month'); // YYYY-MM

  // Monthly calendar for one student
  if (studentId && month) {
    const [year, monthNum] = month.split('-').map(Number);
    const firstDay = new Date(year, monthNum - 1, 1);
    const lastDay  = new Date(year, monthNum, 0);
    const attendance = await repo.findMonthlyAttendance(studentId, firstDay, lastDay);
    return { attendance };
  }

  const date = new Date(dateStr);
  date.setUTCHours(0, 0, 0, 0);

  // Per-class attendance sheet
  if (classId) {
    const students = await repo.findClassAttendanceForDate(classId, date);
    const rows = students.map((s) => ({
      student_id:    s.id,
      first_name:    s.firstName,
      last_name:     s.lastName,
      admission_no:  s.admissionNo,
      status:        s.attendance[0]?.status  ?? null,
      remarks:       s.attendance[0]?.remarks ?? null,
      attendance_id: s.attendance[0]?.id      ?? null,
    }));
    return { students: rows, date: dateStr };
  }

  // School-wide summary
  const classes = await repo.findSchoolAttendanceSummary(schoolId, date);
  const rows = classes.map((c) => ({
    class_id: c.id,
    grade:    c.grade,
    section:  c.section,
    present:  c.attendance.filter((a) => a.status === 'present').length,
    absent:   c.attendance.filter((a) => a.status === 'absent').length,
    late:     c.attendance.filter((a) => a.status === 'late').length,
    total:    c.attendance.length,
  }));
  return { classes: rows, date: dateStr };
}

export async function markAttendance(schoolId: string, markedBy: string, body: Record<string, any>) {
  const { records, date, class_id } = body;

  if (!records || !Array.isArray(records) || !date || !class_id) {
    throw new AppError('records array, date, and class_id are required');
  }

  const parsedDate = new Date(date);
  parsedDate.setUTCHours(0, 0, 0, 0);

  await repo.upsertAttendanceRecords({
    schoolId,
    classId:  class_id,
    date:     parsedDate,
    markedBy,
    records,
  });

  return { message: `Attendance marked for ${records.length} students`, date };
}
