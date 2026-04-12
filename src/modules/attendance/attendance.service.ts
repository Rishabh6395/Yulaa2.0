import { AppError } from '@/utils/errors';
import { parseCSV, generateCSV, type CSVField } from '@/services/upload.service';
import prisma from '@/lib/prisma';
import * as repo from './attendance.repo';

// Haversine distance in metres between two lat/lng points
function haversineMetres(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
  const dateStr        = searchParams.get('date')            || new Date().toISOString().split('T')[0];
  const classId        = searchParams.get('class_id');
  const studentId      = searchParams.get('student_id');
  const month          = searchParams.get('month'); // YYYY-MM
  const type           = searchParams.get('type');  // 'employee'
  const teacherUserId  = searchParams.get('teacher_user_id');

  // ── Employee attendance ──────────────────────────────────────────────────────
  if (type === 'employee') {
    const date = new Date(dateStr);
    date.setUTCHours(0, 0, 0, 0);

    // Monthly view for one teacher (self)
    if (teacherUserId && month) {
      const [year, monthNum] = month.split('-').map(Number);
      const firstDay = new Date(year, monthNum - 1, 1);
      const lastDay  = new Date(year, monthNum, 0);
      const teacher = await prisma.teacher.findFirst({
        where: { userId: teacherUserId, schoolId },
        select: { id: true },
      });
      if (!teacher) return { attendance: [], teacher_id: null };
      const attendance = await repo.findTeacherMonthlyAttendance(teacher.id, firstDay, lastDay);
      // Also return today's punch state
      const todayDate = new Date(dateStr); todayDate.setUTCHours(0, 0, 0, 0);
      const today = await repo.findTeacherTodayAttendance(teacher.id, todayDate);
      return { attendance, teacher_id: teacher.id, today };
    }

    // Admin: monthly report for all teachers
    if (month) {
      const [year, monthNum] = month.split('-').map(Number);
      const firstDay = new Date(year, monthNum - 1, 1);
      const lastDay  = new Date(year, monthNum, 0);
      const teachers = await repo.findAllTeachersMonthlyAttendance(schoolId, firstDay, lastDay);
      return {
        report: teachers.map(t => ({
          teacher_id:  t.id,
          employee_id: t.employeeId ?? null,
          first_name:  t.user.firstName,
          last_name:   t.user.lastName,
          records:     t.attendance.map(a => ({
            date:          a.date,
            status:        a.status,
            punch_in_time:  a.punchInTime,
            punch_out_time: a.punchOutTime,
          })),
        })),
        month,
      };
    }

    // Admin: all teachers for a specific date
    const teachers = await repo.findAllTeachersAttendanceForDate(schoolId, date);
    const rows = teachers.map((t) => ({
      teacher_id:     t.id,
      employee_id:    t.employeeId ?? null,
      first_name:     t.user.firstName,
      last_name:      t.user.lastName,
      status:         t.attendance[0]?.status       ?? null,
      punch_in_time:  t.attendance[0]?.punchInTime  ?? null,
      punch_out_time: t.attendance[0]?.punchOutTime ?? null,
      attendance_id:  t.attendance[0]?.id           ?? null,
    }));
    return { teachers: rows, date: dateStr };
  }

  // Monthly calendar for one student
  if (studentId && month) {
    const [year, monthNum] = month.split('-').map(Number);
    const firstDay = new Date(year, monthNum - 1, 1);
    const lastDay  = new Date(year, monthNum, 0);
    const rows = await repo.findMonthlyAttendance(studentId, firstDay, lastDay);
    const attendance = rows.map(r => ({
      date:               r.date,
      status:             r.status,
      remarks:            r.remarks ?? null,
      subject_attendance: r.subjectAttendance ?? null,
    }));
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
      status:             s.attendance[0]?.status             ?? null,
      remarks:            s.attendance[0]?.remarks            ?? null,
      attendance_id:      s.attendance[0]?.id                 ?? null,
      subject_attendance: s.attendance[0]?.subjectAttendance  ?? null,
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
  // ── Employee attendance ──────────────────────────────────────────────────────
  if (body.type === 'employee') {
    const { records, date: dateStr, action, user_id } = body;

    // Punch In / Punch Out — teacher self-service
    if (action === 'punch_in' || action === 'punch_out') {
      if (!user_id) throw new AppError('user_id is required for punch action');

      // ── Geo-fence / geo-tagging validation ──────────────────────────────────
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { geoFencingEnabled: true, geoTaggingEnabled: true, latitude: true, longitude: true, geoFenceRadius: true },
      });

      if (school?.geoFencingEnabled) {
        // Fencing: punch must be within the configured radius
        const { lat, lng } = body as { lat?: number; lng?: number };
        if (lat == null || lng == null) {
          throw new AppError('Location (lat/lng) is required when Geo Fencing is active. Please enable location access and try again.');
        }
        if (school.latitude == null || school.longitude == null) {
          throw new AppError('School geo-fence centre is not configured. Contact your administrator.');
        }
        const dist = haversineMetres(lat, lng, school.latitude, school.longitude);
        const radius = school.geoFenceRadius ?? 500;
        if (dist > radius) {
          throw new AppError(
            `You are ${Math.round(dist)} m from school (allowed radius: ${radius} m). Punch blocked outside the geo-fence.`,
            403,
          );
        }
      }
      // geoTaggingEnabled = punches allowed from anywhere (no location check needed)

      const today = new Date();
      const dateOnly = new Date(today.toISOString().split('T')[0]);
      dateOnly.setUTCHours(0, 0, 0, 0);
      const teacher = await prisma.teacher.findFirst({ where: { userId: user_id, schoolId }, select: { id: true } });
      if (!teacher) throw new AppError('Teacher record not found');
      const field = action === 'punch_in' ? 'punchInTime' : 'punchOutTime';
      const rec = await repo.punchTeacherAttendance(schoolId, teacher.id, markedBy, dateOnly, field, today);
      return { message: `${action === 'punch_in' ? 'Punch In' : 'Punch Out'} recorded`, time: today, record: rec };
    }

    if (!Array.isArray(records) || !dateStr) {
      throw new AppError('records array and date are required for employee attendance');
    }
    const parsedDate = new Date(dateStr);
    parsedDate.setUTCHours(0, 0, 0, 0);
    for (const r of records) {
      let teacherId = r.teacher_id;
      if (!teacherId && r.user_id) {
        const t = await prisma.teacher.findFirst({ where: { userId: r.user_id, schoolId }, select: { id: true } });
        if (!t) continue;
        teacherId = t.id;
      }
      if (!teacherId || !r.status) continue;
      await repo.upsertTeacherAttendance(schoolId, teacherId, markedBy, parsedDate, r.status);
    }
    return { message: `Employee attendance saved for ${records.length} records`, date: dateStr };
  }

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
    records:  records.map((r: any) => ({
      student_id:        r.student_id,
      status:            r.status,
      remarks:           r.remarks,
      subjectAttendance: r.subject_attendance ?? undefined,
    })),
  });

  return { message: `Attendance marked for ${records.length} students`, date };
}
