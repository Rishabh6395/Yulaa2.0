import { PRINCIPAL_ADMIN_ROLES as ADMIN_ROLES } from '@/lib/roles';
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, NotFoundError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

function getPrimary(user: any) {
  return user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
}

function getSchoolId(user: any, override?: string | null): string {
  const primary = getPrimary(user);
  if (override && primary.role_code === 'super_admin') return override;
  if (primary.school_id) return primary.school_id;
  throw new AppError('No school associated with your account');
}

// Returns the Teacher record plus the teacher's primary assigned classId.
// Derives classId from: teacher.classId field → Class.classTeacherId lookup.
async function getTeacherRecord(userId: string, schoolId: string) {
  const teacher = await prisma.teacher.findFirst({ where: { userId, schoolId } });
  if (!teacher) throw new AppError('Teacher record not found');
  // If classId not stored directly, derive from Class where this teacher is class teacher
  let classId = teacher.classId ?? null;
  if (!classId) {
    const cls = await prisma.class.findFirst({
      where: { classTeacherId: teacher.id, schoolId },
      select: { id: true },
    });
    classId = cls?.id ?? null;
  }
  return { ...teacher, classId };
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const { searchParams } = new URL(request.url);
    const schoolId    = getSchoolId(user, searchParams.get('schoolId'));
    const examId      = searchParams.get('examId');
    const academicYear = searchParams.get('academicYear') || undefined;
    const classId     = searchParams.get('classId') || undefined;

    if (examId) {
      const exam = await prisma.exam.findFirst({
        where: { id: examId, schoolId },
        include: {
          entries: true,
          results: {
            include: {
              student: { select: { firstName: true, lastName: true, admissionNo: true } },
            },
          },
        },
      });
      if (!exam) throw new NotFoundError('Exam');
      return Response.json({ exam });
    }

    const primary = getPrimary(user);
    const isTeacher = primary.role_code === 'teacher';

    // Teachers only see exams for their assigned class
    let classFilter: string | undefined = classId;
    if (isTeacher) {
      const teacher = await getTeacherRecord(user.id, schoolId);
      classFilter = classId ?? teacher.classId ?? undefined;
    }

    const exams = await prisma.exam.findMany({
      where: {
        schoolId,
        ...(academicYear ? { academicYear } : {}),
        ...(classFilter ? { classId: classFilter } : {}),
      },
      orderBy: { startDate: 'desc' },
      include: { _count: { select: { entries: true, results: true } } },
    });
    return Response.json({ exams });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const primary  = getPrimary(user);
    const body     = await request.json();
    const { action } = body;
    const schoolId = getSchoolId(user, body.schoolId);
    const isAdmin  = ADMIN_ROLES.includes(primary.role_code);
    const isTeacher = primary.role_code === 'teacher';

    // ── Create exam / class test ────────────────────────────────────────────
    if (!action || action === 'create_exam') {
      if (!isAdmin && !isTeacher) throw new ForbiddenError();

      const { title, examType, subject, academicYear, classId, startDate, endDate, gradingType, maxMarks, passingMarks } = body;
      if (!title?.trim()) throw new AppError('title is required');
      if (!examType?.trim()) throw new AppError('examType is required');

      let targetClassId = classId ?? null;

      if (isTeacher) {
        const teacher = await getTeacherRecord(user.id, schoolId);
        if (!teacher.classId && !targetClassId) {
          throw new AppError('No class assigned. Please specify class_id or ask admin to assign a class to your profile.');
        }
        if (targetClassId && teacher.classId && targetClassId !== teacher.classId) {
          throw new ForbiddenError('You can only create exams for your assigned class.');
        }
        targetClassId = targetClassId ?? teacher.classId;
      }

      const exam = await prisma.exam.create({
        data: {
          schoolId,
          title:        title.trim(),
          examType:     examType.trim(),
          subject:      subject?.trim() || null,
          academicYear: academicYear || '',
          classId:      targetClassId,
          startDate:    startDate ? new Date(startDate) : new Date(),
          endDate:      endDate   ? new Date(endDate)   : new Date(),
          status:       'scheduled',
          gradingType:  gradingType || 'marks',
          maxMarks:     maxMarks ?? 100,
          passingMarks: passingMarks ?? 35,
        },
      });
      return Response.json({ exam }, { status: 201 });
    }

    // ── Add timetable entry ────────────────────────────────────────────────
    if (action === 'add_timetable_entry') {
      if (!isAdmin && !isTeacher) throw new ForbiddenError();

      const { examId, classId, subject, date, startTime, endTime, maxMarks, venue } = body;
      if (!examId || !subject?.trim() || !date) throw new AppError('examId, subject, date are required');

      const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId } });
      if (!exam) throw new NotFoundError('Exam');

      const entryClassId = classId ?? exam.classId;
      if (!entryClassId) throw new AppError('classId is required');

      // Teacher: verify exam belongs to their class
      if (isTeacher) {
        const teacher = await getTeacherRecord(user.id, schoolId);
        if (teacher.classId && exam.classId && exam.classId !== teacher.classId) {
          throw new ForbiddenError('You can only add entries for your assigned class.');
        }
      }

      const entry = await prisma.examTimetableEntry.upsert({
        where:  { examId_classId_subject: { examId, classId: entryClassId, subject } },
        update: { date: new Date(date), startTime: startTime || '', endTime: endTime || '', maxMarks: maxMarks ?? 100, venue: venue || null },
        create: { examId, classId: entryClassId, subject, date: new Date(date), startTime: startTime || '', endTime: endTime || '', maxMarks: maxMarks ?? 100, venue: venue || null },
      });
      return Response.json({ entry }, { status: 201 });
    }

    // ── Enter single result ────────────────────────────────────────────────
    if (action === 'enter_result') {
      if (!isAdmin && !isTeacher) throw new ForbiddenError();

      const { examId, studentId, subject, marksObtained, maxMarks, grade, remarks } = body;
      if (!examId || !studentId || !subject?.trim() || marksObtained === undefined) {
        throw new AppError('examId, studentId, subject, marksObtained are required');
      }

      const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId } });
      if (!exam) throw new NotFoundError('Exam');

      // Teacher: can only enter results for their class
      if (isTeacher) {
        const teacher = await getTeacherRecord(user.id, schoolId);
        if (teacher.classId && exam.classId && exam.classId !== teacher.classId) {
          throw new ForbiddenError('You can only enter results for your assigned class.');
        }
      }

      const student = await prisma.student.findFirst({ where: { id: studentId, schoolId }, select: { id: true } });
      if (!student) throw new AppError('Student not found in this school');

      const result = await prisma.examResult.upsert({
        where:  { examId_studentId_subject: { examId, studentId, subject } },
        update: { marksObtained, maxMarks: maxMarks ?? 100, grade: grade || null, remarks: remarks || null, enteredById: user.id, approved: false, approvedById: null },
        create: { examId, studentId, subject, marksObtained, maxMarks: maxMarks ?? 100, grade: grade || null, remarks: remarks || null, enteredById: user.id, approved: false },
      });

      // Auto-compute grade if not provided
      if (!grade) {
        const pct = Math.round((Number(marksObtained) / (maxMarks ?? 100)) * 100);
        const autoGrade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : pct >= 40 ? 'D' : 'F';
        await prisma.examResult.update({ where: { id: result.id }, data: { grade: autoGrade } });
        return Response.json({ result: { ...result, grade: autoGrade } }, { status: 201 });
      }

      return Response.json({ result }, { status: 201 });
    }

    // ── Bulk upload results (array) ───────────────────────────────────────
    // Allowed: school_admin, principal, teacher
    // Body: { action: 'upload_results', examId, results: [{ studentId, subject, marksObtained, maxMarks?, remarks? }] }
    if (action === 'upload_results') {
      const canUpload = isAdmin || isTeacher || primary.role_code === 'principal';
      if (!canUpload) throw new ForbiddenError('Only admin, principal, or teacher can upload results');

      const { examId, results: rows } = body;
      if (!examId) throw new AppError('examId is required');
      if (!Array.isArray(rows) || rows.length === 0) throw new AppError('results array is required and must not be empty');
      if (rows.length > 500) throw new AppError('Maximum 500 results per upload');

      const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId } });
      if (!exam) throw new NotFoundError('Exam');

      if (isTeacher) {
        const teacher = await getTeacherRecord(user.id, schoolId);
        if (teacher.classId && exam.classId && exam.classId !== teacher.classId) {
          throw new ForbiddenError('You can only upload results for your assigned class.');
        }
      }

      // Validate all students belong to school upfront
      const studentIds = [...new Set(rows.map((r: any) => r.studentId).filter(Boolean))];
      const validStudents = await prisma.student.findMany({
        where: { id: { in: studentIds }, schoolId },
        select: { id: true },
      });
      const validIds = new Set(validStudents.map(s => s.id));

      let saved = 0, failed = 0;
      const errors: { row: number; error: string }[] = [];

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        try {
          if (!r.studentId) throw new Error('studentId is required');
          if (!r.subject?.trim()) throw new Error('subject is required');
          if (r.marksObtained === undefined || r.marksObtained === null) throw new Error('marksObtained is required');
          if (!validIds.has(r.studentId)) throw new Error(`Student ${r.studentId} not found in this school`);

          const maxMarks = r.maxMarks ?? 100;
          const pct = Math.round((Number(r.marksObtained) / maxMarks) * 100);
          const autoGrade = r.grade || (pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : pct >= 40 ? 'D' : 'F');

          await prisma.examResult.upsert({
            where:  { examId_studentId_subject: { examId, studentId: r.studentId, subject: r.subject.trim() } },
            update: { marksObtained: r.marksObtained, maxMarks, grade: autoGrade, remarks: r.remarks || null, enteredById: user.id, approved: false, approvedById: null },
            create: { examId, studentId: r.studentId, subject: r.subject.trim(), marksObtained: r.marksObtained, maxMarks, grade: autoGrade, remarks: r.remarks || null, enteredById: user.id, approved: false },
          });
          saved++;
        } catch (e: any) {
          failed++;
          errors.push({ row: i + 1, error: e.message });
        }
      }

      return Response.json({ total: rows.length, saved, failed, errors }, { status: 201 });
    }

    // ── Approve results ───────────────────────────────────────────────────
    if (action === 'approve_results') {
      if (!isAdmin && primary.role_code !== 'principal') throw new ForbiddenError();

      const { examId, studentIds } = body;
      if (!examId) throw new AppError('examId is required');

      const where: any = { examId, exam: { schoolId } };
      if (studentIds?.length) where.studentId = { in: studentIds };

      await prisma.examResult.updateMany({ where, data: { approved: true, approvedById: user.id } });
      return Response.json({ ok: true });
    }

    throw new AppError('Unknown action. Valid: create_exam, add_timetable_entry, enter_result, upload_results, approve_results');
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const primary = getPrimary(user);
    const body    = await request.json();
    const schoolId = getSchoolId(user, body.schoolId);
    const isAdmin  = ADMIN_ROLES.includes(primary.role_code);
    const isTeacher = primary.role_code === 'teacher';

    const { examId, status, title } = body;
    if (!examId) throw new AppError('examId is required');

    const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId } });
    if (!exam) throw new NotFoundError('Exam');

    // Teacher can only update exams they own (their class)
    if (isTeacher) {
      const teacher = await getTeacherRecord(user.id, schoolId);
      if (exam.classId !== teacher.classId) throw new ForbiddenError('You can only update exams for your assigned class.');
      // Teachers cannot publish/approve — only admins can change status beyond 'scheduled'
      if (status && !['scheduled', 'ongoing'].includes(status)) throw new ForbiddenError('Teachers can only set status to scheduled or ongoing.');
    } else if (!isAdmin) {
      throw new ForbiddenError();
    }

    const updated = await prisma.exam.update({
      where: { id: examId },
      data: {
        ...(status && { status }),
        ...(title?.trim() && { title: title.trim() }),
      },
    });
    return Response.json({ exam: updated });
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const primary = getPrimary(user);
    if (!ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError();

    const { examId } = await request.json();
    if (!examId) throw new AppError('examId is required');

    const schoolId = getSchoolId(user);
    await prisma.exam.deleteMany({ where: { id: examId, schoolId } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
