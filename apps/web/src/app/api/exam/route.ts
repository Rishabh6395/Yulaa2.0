import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const ADMIN_ROLES = ['super_admin', 'school_admin', 'principal'];

function getSchoolId(user: any, override?: string): string {
  const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  // Only super_admin may target a different school
  if (override && user.roles.some((r: any) => r.role_code === 'super_admin')) return override;
  if (primary.school_id) return primary.school_id;
  throw new AppError('No school associated with your account');
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const { searchParams } = new URL(request.url);
    const schoolId = await getSchoolId(user, searchParams.get('schoolId') ?? undefined);
    const examId = searchParams.get('examId');
    const academicYear = searchParams.get('academicYear') || undefined;

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
      if (!exam) throw new AppError('Exam not found');
      return Response.json({ exam });
    }

    const exams = await prisma.exam.findMany({
      where: { schoolId, ...(academicYear ? { academicYear } : {}) },
      orderBy: { startDate: 'desc' },
      include: {
        _count: { select: { entries: true, results: true } },
      },
    });
    return Response.json({ exams });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const body = await request.json();
    const { action } = body;
    const schoolId = await getSchoolId(user, body.schoolId);

    // Create exam
    if (!action || action === 'create_exam') {
      if (!ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError();
      const { title, examType, academicYear, classId, startDate, endDate, gradingType } = body;
      if (!title || !examType) throw new AppError('title and examType required');
      const exam = await prisma.exam.create({
        data: {
          schoolId,
          title,
          examType,
          academicYear: academicYear || '',
          classId: classId || null,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          status: 'scheduled',
          gradingType: gradingType || 'marks',
        },
      });
      return Response.json({ exam }, { status: 201 });
    }

    // Add timetable entry
    if (action === 'add_timetable_entry') {
      if (!ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError();
      const { examId, classId, subject, date, startTime, endTime, maxMarks, venue } = body;
      if (!examId || !classId || !subject || !date) throw new AppError('examId, classId, subject, date required');
      const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId } });
      if (!exam) throw new AppError('Exam not found');
      const entry = await prisma.examTimetableEntry.upsert({
        where: { examId_classId_subject: { examId, classId, subject } },
        update: { date: new Date(date), startTime: startTime || '', endTime: endTime || '', maxMarks: maxMarks ?? 100, venue: venue || null },
        create: { examId, classId, subject, date: new Date(date), startTime: startTime || '', endTime: endTime || '', maxMarks: maxMarks ?? 100, venue: venue || null },
      });
      return Response.json({ entry }, { status: 201 });
    }

    // Enter result
    if (action === 'enter_result') {
      if (!['teacher', ...ADMIN_ROLES].includes(primary.role_code)) throw new ForbiddenError();
      const { examId, studentId, subject, marksObtained, maxMarks, grade } = body;
      if (!examId || !studentId || !subject || marksObtained === undefined) throw new AppError('examId, studentId, subject, marksObtained required');
      const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId } });
      if (!exam) throw new AppError('Exam not found');
      const result = await prisma.examResult.upsert({
        where: { examId_studentId_subject: { examId, studentId, subject } },
        update: { marksObtained, maxMarks: maxMarks ?? 100, grade: grade || null, enteredById: user.id, approved: false, approvedById: null },
        create: { examId, studentId, subject, marksObtained, maxMarks: maxMarks ?? 100, grade: grade || null, enteredById: user.id, approved: false },
      });
      return Response.json({ result }, { status: 201 });
    }

    // Approve results
    if (action === 'approve_results') {
      if (!ADMIN_ROLES.includes(primary.role_code) && primary.role_code !== 'principal') throw new ForbiddenError();
      const { examId, studentIds } = body;
      if (!examId) throw new AppError('examId required');
      const where: any = { examId, exam: { schoolId } };
      if (studentIds?.length) where.studentId = { in: studentIds };
      await prisma.examResult.updateMany({ where, data: { approved: true, approvedById: user.id } });
      return Response.json({ ok: true });
    }

    throw new AppError('Unknown action');
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError();

    const body = await request.json();
    const { examId, status } = body;
    if (!examId) throw new AppError('examId required');
    const schoolId = await getSchoolId(user, body.schoolId);

    const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId } });
    if (!exam) throw new AppError('Exam not found');

    const updated = await prisma.exam.update({
      where: { id: examId },
      data: {
        ...(status && { status }),
        ...(body.title && { title: body.title }),
      },
    });
    return Response.json({ exam: updated });
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError();
    const { examId } = await request.json();
    if (!examId) throw new AppError('examId required');
    const schoolId = await getSchoolId(user);
    await prisma.exam.deleteMany({ where: { id: examId, schoolId } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
