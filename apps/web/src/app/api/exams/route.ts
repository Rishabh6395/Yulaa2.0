/**
 * Exams API
 * GET    - list exams (filter by class_id, academic_year); GET ?exam_id=X for detail+results
 * POST   - create exam | action=bulk_results to upload results
 * PATCH  - update exam
 * DELETE - delete exam
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';
import { currentAcademicYearLabel } from '@/lib/school-utils';

function canManage(role: string) {
  return ['teacher', 'school_admin', 'principal', 'hod', 'super_admin'].includes(role);
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const { role_code: role, school_id: schoolId } = primary;
    const { searchParams } = new URL(request.url);
    const classId      = searchParams.get('class_id');
    const academicYear = searchParams.get('academic_year') ?? currentAcademicYearLabel();
    const examId       = searchParams.get('exam_id');
    if (!schoolId) throw new ForbiddenError();

    if (examId) {
      const exam = await prisma.exam.findUnique({
        where: { id: examId },
        include: {
          class: { select: { name: true, grade: true, section: true } },
          entries: true,
          results: {
            include: { student: { select: { id: true, admissionNo: true, firstName: true, lastName: true } } },
            orderBy: [{ subject: 'asc' }, { student: { firstName: 'asc' } }],
          },
        },
      });
      if (!exam || exam.schoolId !== schoolId) throw new AppError('Exam not found');
      return Response.json({ exam });
    }

    const where: any = { schoolId, academicYear };
    if (classId) where.classId = classId;

    if (role === 'teacher') {
      const teacher = await prisma.teacher.findFirst({ where: { schoolId, userId: user.id }, select: { id: true } });
      if (!teacher) return Response.json({ exams: [] });
      const slots = await prisma.timetableSlot.findMany({
        where: { teacherId: teacher.id },
        select: { timetableId: true, timetable: { select: { classId: true } } },
        distinct: ['timetableId'],
      });
      const teacherClassIds = [...new Set(slots.map(s => s.timetable.classId))];
      if (!classId) where.classId = { in: teacherClassIds };
    }

    const exams = await prisma.exam.findMany({
      where,
      include: {
        class: { select: { name: true, grade: true, section: true } },
        _count: { select: { results: true, entries: true } },
      },
      orderBy: { startDate: 'desc' },
    });
    return Response.json({ exams });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const { role_code: role, school_id: schoolId } = primary;
    if (!canManage(role) || !schoolId) throw new ForbiddenError();

    const body = await request.json();

    if (body.action === 'bulk_results') {
      const { examId, results } = body;
      if (!examId || !Array.isArray(results)) throw new AppError('examId and results required');
      const exam = await prisma.exam.findUnique({ where: { id: examId } });
      if (!exam || exam.schoolId !== schoolId) throw new AppError('Exam not found');

      let created = 0, failed = 0;
      const ops = results.map(async (r: any) => {
        try {
          await prisma.examResult.upsert({
            where: { examId_studentId_subject: { examId, studentId: r.student_id, subject: r.subject } },
            create: {
              examId,
              studentId:     r.student_id,
              subject:       r.subject,
              marksObtained: Number(r.marks_obtained ?? 0),
              maxMarks:      Number(r.max_marks ?? 100),
              grade:         r.grade ?? null,
              remarks:       r.remarks ?? null,
              enteredById:   user.id,
            },
            update: {
              marksObtained: Number(r.marks_obtained ?? 0),
              maxMarks:      Number(r.max_marks ?? 100),
              grade:         r.grade ?? null,
              remarks:       r.remarks ?? null,
            },
          });
          created++;
        } catch { failed++; }
      });
      await Promise.allSettled(ops);
      return Response.json({ created, failed });
    }

    const { title, exam_type, class_id, start_date, end_date, academic_year } = body;
    if (!title || !exam_type || !start_date || !end_date) throw new AppError('title, exam_type, start_date, end_date are required');

    const exam = await prisma.exam.create({
      data: {
        schoolId,
        title,
        examType:     exam_type,
        classId:      class_id ?? null,
        startDate:    new Date(start_date),
        endDate:      new Date(end_date),
        academicYear: academic_year ?? currentAcademicYearLabel(),
        status:       'scheduled',
      },
    });
    return Response.json({ exam }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const { role_code: role, school_id: schoolId } = primary;
    if (!canManage(role) || !schoolId) throw new ForbiddenError();

    const body = await request.json();
    const { exam_id, title, exam_type, class_id, start_date, end_date, status, grading_type } = body;
    if (!exam_id) throw new AppError('exam_id required');

    const exam = await prisma.exam.update({
      where: { id: exam_id },
      data: {
        ...(title        !== undefined && { title }),
        ...(exam_type    !== undefined && { examType: exam_type }),
        ...(class_id     !== undefined && { classId: class_id }),
        ...(start_date   !== undefined && { startDate: new Date(start_date) }),
        ...(end_date     !== undefined && { endDate: new Date(end_date) }),
        ...(status       !== undefined && { status }),
        ...(grading_type !== undefined && { gradingType: grading_type }),
      },
    });
    return Response.json({ exam });
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const { role_code: role, school_id: schoolId } = primary;
    if (!['school_admin', 'principal', 'super_admin', 'hod'].includes(role) || !schoolId) throw new ForbiddenError();

    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('id');
    if (!examId) throw new AppError('id required');
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam || exam.schoolId !== schoolId) throw new AppError('Exam not found');
    await prisma.exam.delete({ where: { id: examId } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
