import { AppError } from '@/utils/errors';
import * as repo from './attendance.repo';

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
