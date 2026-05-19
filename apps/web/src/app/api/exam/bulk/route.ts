/**
 * GET /api/exam/bulk?exam_id=X&class_id=Y&subject=Z
 *   Returns a CSV template pre-filled with student roster for that exam/class/subject.
 *
 * POST /api/exam/bulk (multipart/form-data)
 *   file     – CSV with marks / grades
 *   exam_id  – target exam UUID
 *   class_id – target class UUID
 *   subject  – subject name
 *
 * Supported CSV formats:
 *   Marks:  admission_no, student_name, marks_obtained, [max_marks], [grade], [remarks]
 *   Grades: admission_no, student_name, grade, [remarks]   (when exam gradingType = 'grades')
 */
import { REVIEWER_ROLES } from '@/lib/roles';
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import { csvDownloadResponse } from '@/services/upload.service';
import prisma from '@/lib/prisma';

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let cur = '', inQuote = false;
  for (const ch of line) {
    if (ch === '"') { inQuote = !inQuote; }
    else if (ch === ',' && !inQuote) { values.push(cur.trim()); cur = ''; }
    else { cur += ch; }
  }
  values.push(cur.trim());
  return values.map(v => v.replace(/^"|"$/g, ''));
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());
  return lines.slice(1).map(line => {
    const vals = parseCSVLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
    return obj;
  });
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!REVIEWER_ROLES.includes(primaryRole.role_code)) throw new ForbiddenError('Access denied');
    const schoolId = primaryRole.school_id!;

    const { searchParams } = new URL(request.url);
    const examId  = searchParams.get('exam_id');
    const classId = searchParams.get('class_id');
    const subject = searchParams.get('subject');

    if (!examId || !classId || !subject) throw new AppError('exam_id, class_id, and subject are required');

    const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId }, select: { id: true, title: true, gradingType: true } });
    if (!exam) throw new AppError('Exam not found', 404);

    const entry = await prisma.examTimetableEntry.findFirst({
      where: { examId, classId, subject },
      select: { maxMarks: true },
    });
    const maxMarks = entry?.maxMarks ?? 100;

    const students = await prisma.student.findMany({
      where: { classId, schoolId, status: 'active' },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      select: { id: true, admissionNo: true, firstName: true, lastName: true },
    });

    // Fetch any existing results for pre-fill
    const existing = await prisma.examResult.findMany({
      where: { examId, studentId: { in: students.map(s => s.id) }, subject },
      select: { studentId: true, marksObtained: true, grade: true, remarks: true },
    });
    const existingMap = Object.fromEntries(existing.map(r => [r.studentId, r]));

    const isGrades = exam.gradingType === 'grades';
    const header = isGrades
      ? 'admission_no,student_name,grade,remarks'
      : `admission_no,student_name,marks_obtained,max_marks,grade,remarks`;

    const rows = students.map(s => {
      const ex = existingMap[s.id];
      const name = `${s.firstName} ${s.lastName}`;
      if (isGrades) {
        return `${s.admissionNo},"${name}",${ex?.grade ?? ''},`;
      }
      return `${s.admissionNo},"${name}",${ex ? Number(ex.marksObtained) : ''},${maxMarks},${ex?.grade ?? ''},${ex?.remarks ?? ''}`;
    });

    const csv = [header, ...rows].join('\n');
    const filename = `marks-${exam.title.replace(/\s+/g, '-')}-${subject}-template.csv`;
    return csvDownloadResponse(csv, filename);
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!REVIEWER_ROLES.includes(primaryRole.role_code)) throw new ForbiddenError('Access denied');
    const schoolId = primaryRole.school_id!;

    const form    = await request.formData();
    const file    = form.get('file')    as File   | null;
    const examId  = form.get('exam_id') as string | null;
    const classId = form.get('class_id') as string | null;
    const subject = form.get('subject') as string | null;

    if (!file)    throw new AppError('CSV file is required');
    if (!examId)  throw new AppError('exam_id is required');
    if (!classId) throw new AppError('class_id is required');
    if (!subject) throw new AppError('subject is required');
    if (file.size > 2 * 1024 * 1024) throw new AppError('File too large (max 2 MB)');

    const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId }, select: { id: true, gradingType: true } });
    if (!exam) throw new AppError('Exam not found', 404);

    // Build student admission_no → id map scoped to class + school
    const students = await prisma.student.findMany({
      where: { classId, schoolId },
      select: { id: true, admissionNo: true },
    });
    const studentMap = Object.fromEntries(students.map(s => [s.admissionNo.toLowerCase(), s.id]));

    const entry = await prisma.examTimetableEntry.findFirst({
      where: { examId, classId, subject },
      select: { maxMarks: true },
    });
    const defaultMax = entry?.maxMarks ?? 100;

    const csvText = await file.text();
    const records = parseCSV(csvText);
    if (records.length === 0) throw new AppError('CSV file is empty or has no data rows');
    if (records.length > 500) throw new AppError('CSV exceeds 500 rows per upload');

    let saved = 0, skipped = 0, failed = 0;
    const results: { row: number; admission_no: string; status: string; error?: string }[] = [];

    for (let i = 0; i < records.length; i++) {
      const r   = records[i];
      const row = i + 2;
      const admNo = r['admission_no']?.toLowerCase().trim();

      try {
        if (!admNo) throw new Error('admission_no is required');
        const studentId = studentMap[admNo];
        if (!studentId) throw new Error(`Student with admission_no "${admNo}" not found in this class`);

        const isGrades = exam.gradingType === 'grades';

        if (isGrades) {
          const grade = r['grade']?.trim();
          if (!grade) { skipped++; results.push({ row, admission_no: admNo, status: 'skipped' }); continue; }
          await prisma.examResult.upsert({
            where: { examId_studentId_subject: { examId, studentId, subject } },
            update: { grade, remarks: r['remarks'] || null, enteredById: user.id, approved: false, approvedById: null },
            create: { examId, studentId, subject, marksObtained: 0, maxMarks: defaultMax, grade, remarks: r['remarks'] || null, enteredById: user.id },
          });
        } else {
          const rawMarks = r['marks_obtained']?.trim();
          if (!rawMarks) { skipped++; results.push({ row, admission_no: admNo, status: 'skipped' }); continue; }
          const marksObtained = parseFloat(rawMarks);
          if (isNaN(marksObtained)) throw new Error(`Invalid marks value: "${rawMarks}"`);
          const maxMarks = r['max_marks'] ? parseInt(r['max_marks']) : defaultMax;
          if (marksObtained < 0 || marksObtained > maxMarks) throw new Error(`Marks ${marksObtained} out of range (0–${maxMarks})`);
          const grade = r['grade']?.trim() || null;
          await prisma.examResult.upsert({
            where: { examId_studentId_subject: { examId, studentId, subject } },
            update: { marksObtained, maxMarks, grade, remarks: r['remarks'] || null, enteredById: user.id, approved: false, approvedById: null },
            create: { examId, studentId, subject, marksObtained, maxMarks, grade, remarks: r['remarks'] || null, enteredById: user.id },
          });
        }

        saved++;
        results.push({ row, admission_no: admNo, status: 'saved' });
      } catch (e: any) {
        failed++;
        results.push({ row, admission_no: admNo ?? `row ${row}`, status: 'failed', error: e.message });
      }
    }

    return Response.json({ total: records.length, saved, skipped, failed, results });
  } catch (err) { return handleError(err); }
}
