/**
 * GET    /api/exams/results?exam_id=X&class_id=X   — list results (grid view)
 * POST   /api/exams/results                         — save/bulk-upsert results (draft)
 * PATCH  /api/exams/results?exam_id=X               — submit for approval / approve / reject
 *
 * CSV import: POST with multipart/form-data and field "csv"
 *   Template columns: admission_no, student_name, marks_obtained, grade, remarks
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const ENTRY_ROLES    = ['teacher', 'school_admin', 'principal', 'hod', 'super_admin'];
const APPROVAL_ROLES = ['school_admin', 'principal', 'hod', 'super_admin'];

async function getSchoolId(user: any): Promise<string> {
  const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  if (primary.school_id) return primary.school_id;
  throw new AppError('school_id required');
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const { searchParams } = new URL(request.url);
    const examId  = searchParams.get('exam_id');
    const classId = searchParams.get('class_id');
    if (!examId) throw new AppError('exam_id required');

    const schoolId = await getSchoolId(user);

    // Verify exam belongs to school
    const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId } });
    if (!exam) throw new AppError('Exam not found', 404);

    // Get students in class (or all school if no class)
    const students = await prisma.student.findMany({
      where: {
        schoolId,
        status: 'active',
        ...(classId ? { classId } : exam.classId ? { classId: exam.classId } : {}),
      },
      orderBy: { firstName: 'asc' },
      select: { id: true, firstName: true, lastName: true, admissionNo: true },
    });

    // Get existing results for this exam
    const results = await prisma.examResult.findMany({
      where: { examId, studentId: { in: students.map(s => s.id) } },
    });

    // Build grid: one row per student × subject
    const entries = await prisma.examTimetableEntry.findMany({
      where: { examId, ...(classId ? { classId } : {}) },
    });
    const subjects = [...new Set(entries.map(e => e.subject))];

    const grid = students.map(s => ({
      student: s,
      subjects: subjects.map(subj => {
        const r = results.find(r => r.studentId === s.id && r.subject === subj);
        return {
          subject:       subj,
          maxMarks:      entries.find(e => e.subject === subj)?.maxMarks ?? exam.maxMarks,
          marksObtained: r ? Number(r.marksObtained) : null,
          grade:         r?.grade  ?? null,
          remarks:       r?.remarks ?? null,
          approved:      r?.approved ?? false,
          resultId:      r?.id ?? null,
        };
      }),
    }));

    return Response.json({ exam, grid, subjects, students: students.length });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!ENTRY_ROLES.includes(primary.role_code)) throw new ForbiddenError('Entry role required');

    const contentType = request.headers.get('content-type') ?? '';
    const schoolId = await getSchoolId(user);

    // ── CSV import path ──────────────────────────────────────────────────────
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const examId   = formData.get('exam_id') as string;
      const classId  = formData.get('class_id') as string;
      const subject  = formData.get('subject')  as string;
      const csvFile  = formData.get('csv') as File;
      if (!examId || !csvFile || !subject) throw new AppError('exam_id, subject, csv required');

      const text  = await csvFile.text();
      const lines = text.trim().split('\n').slice(1); // skip header

      const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId } });
      if (!exam) throw new AppError('Exam not found', 404);

      const students = await prisma.student.findMany({
        where: { schoolId, ...(classId ? { classId } : {}) },
        select: { id: true, admissionNo: true },
      });
      const byAdmNo = Object.fromEntries(students.map(s => [s.admissionNo, s.id]));

      const parsed: { studentId: string; marks: number; grade: string | null; remarks: string | null }[] = [];
      const errors: string[] = [];

      for (const [i, line] of lines.entries()) {
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        const [admNo, , marksStr, grade, remarks] = cols;
        const studentId = byAdmNo[admNo];
        if (!studentId) { errors.push(`Row ${i + 2}: admission_no "${admNo}" not found`); continue; }
        const marks = parseFloat(marksStr);
        if (isNaN(marks)) { errors.push(`Row ${i + 2}: invalid marks "${marksStr}"`); continue; }
        if (marks < 0 || marks > exam.maxMarks) { errors.push(`Row ${i + 2}: marks out of range (0–${exam.maxMarks})`); continue; }
        parsed.push({ studentId, marks, grade: grade || null, remarks: remarks || null });
      }

      if (errors.length > 0 && parsed.length === 0) return Response.json({ errors }, { status: 422 });

      await prisma.$transaction(
        parsed.map(p =>
          prisma.examResult.upsert({
            where:  { examId_studentId_subject: { examId, studentId: p.studentId, subject } },
            create: {
              examId, studentId: p.studentId, subject, schoolId,
              marksObtained: p.marks,
              maxMarks:      exam.maxMarks,
              grade:         p.grade,
              remarks:       p.remarks,
              enteredById:   user.id,
              approved:      false,
            },
            update: {
              marksObtained: p.marks,
              grade:         p.grade,
              remarks:       p.remarks,
              enteredById:   user.id,
              approved:      false,
            },
          }),
        ),
      );

      return Response.json({ imported: parsed.length, errors, skipped: errors.length });
    }

    // ── Manual grid path ─────────────────────────────────────────────────────
    const body = await request.json();
    const { examId, results } = body;
    if (!examId || !Array.isArray(results)) throw new AppError('examId and results[] required');

    const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId } });
    if (!exam) throw new AppError('Exam not found', 404);

    await prisma.$transaction(
      results.map((r: any) =>
        prisma.examResult.upsert({
          where:  { examId_studentId_subject: { examId, studentId: r.studentId, subject: r.subject } },
          create: {
            examId, studentId: r.studentId, subject: r.subject, schoolId,
            marksObtained: r.marksObtained,
            maxMarks:      r.maxMarks ?? exam.maxMarks,
            grade:         r.grade   ?? null,
            remarks:       r.remarks ?? null,
            enteredById:   user.id,
            approved:      false,
          },
          update: {
            marksObtained: r.marksObtained,
            maxMarks:      r.maxMarks ?? exam.maxMarks,
            grade:         r.grade   ?? null,
            remarks:       r.remarks ?? null,
            enteredById:   user.id,
            approved:      false,
          },
        }),
      ),
    );

    // Update exam status → result_pending
    await prisma.exam.update({
      where: { id: examId },
      data:  { status: 'result_pending' },
    });

    return Response.json({ saved: results.length });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];

    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('exam_id');
    if (!examId) throw new AppError('exam_id required');

    const body = await request.json();
    const { action, comment } = body;
    const schoolId = await getSchoolId(user);

    const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId } });
    if (!exam) throw new AppError('Exam not found', 404);

    if (action === 'submit') {
      // Teacher submits results for approval
      await prisma.exam.update({ where: { id: examId }, data: { status: 'result_uploaded' } });
      return Response.json({ status: 'result_uploaded' });
    }

    if (action === 'approve') {
      if (!APPROVAL_ROLES.includes(primary.role_code)) throw new ForbiddenError('Approval role required');
      await prisma.$transaction([
        prisma.examResult.updateMany({
          where: { examId },
          data:  { approved: true, approvedById: user.id },
        }),
        prisma.exam.update({
          where: { id: examId },
          data:  { status: 'approved', approvedById: user.id },
        }),
      ]);
      return Response.json({ status: 'approved' });
    }

    if (action === 'reject') {
      if (!APPROVAL_ROLES.includes(primary.role_code)) throw new ForbiddenError('Approval role required');
      await prisma.exam.update({
        where: { id: examId },
        data:  { status: 'result_pending' },
      });
      return Response.json({ status: 'result_pending', comment });
    }

    throw new AppError('action must be submit | approve | reject');
  } catch (err) { return handleError(err); }
}
