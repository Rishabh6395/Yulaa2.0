/**
 * GET    /api/board-exam-tracker?school_id=X&class_id=X&type=class10   — list trackers
 * POST   /api/board-exam-tracker                                        — create/upsert tracker entry
 * PATCH  /api/board-exam-tracker?id=X                                   — update progress
 * DELETE /api/board-exam-tracker?id=X                                   — delete entry
 *
 * boardExamType: 'class10' | 'class12' | 'entrance'
 * Typically used for Grade 10 and 12 students preparing for board exams.
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

async function resolveSchoolId(user: any, override?: string | null): Promise<string> {
  const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  if (primary.role_code === 'super_admin' && override) return override;
  if (primary.school_id) return primary.school_id;
  throw new AppError('school_id required');
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const { searchParams } = new URL(request.url);
    const schoolId    = await resolveSchoolId(user, searchParams.get('school_id'));
    const classId     = searchParams.get('class_id');
    const studentId   = searchParams.get('student_id');
    const examType    = searchParams.get('type');
    const subject     = searchParams.get('subject');

    // Parent/student: only own data
    let ownStudentId: string | null = null;
    if (primary.role_code === 'parent') {
      const parent = await prisma.parent.findUnique({ where: { userId: user.id }, include: { parentStudents: { select: { studentId: true } } } });
      if (studentId && !parent?.parentStudents.some(ps => ps.studentId === studentId)) throw new ForbiddenError();
      ownStudentId = studentId ?? parent?.parentStudents[0]?.studentId ?? null;
    }

    const trackers = await prisma.boardExamTracker.findMany({
      where: {
        schoolId,
        ...(ownStudentId ? { studentId: ownStudentId } : studentId ? { studentId } : {}),
        ...(examType ? { boardExamType: examType } : {}),
        ...(subject  ? { subject }                  : {}),
      },
      include: {
        student: {
          select: {
            id: true, firstName: true, lastName: true, admissionNo: true, classId: true,
            class: { select: { grade: true, section: true } },
          },
        },
      },
      orderBy: [{ boardExamType: 'asc' }, { subject: 'asc' }],
    });

    // Filter by classId after fetch
    const filtered = classId
      ? trackers.filter(t => t.student.classId === classId)
      : trackers;

    return Response.json({ trackers: filtered });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!['super_admin', 'school_admin', 'principal', 'hod', 'teacher'].includes(primary.role_code))
      throw new ForbiddenError('Staff role required');

    const body = await request.json();
    const {
      schoolId: sid, studentId, subject, boardExamType, examDate,
      syllabusCoverage, practiceTestScore, targetScore,
      weakTopics, strongTopics, notes, classId,
    } = body;

    const schoolId = await resolveSchoolId(user, sid);
    if (!studentId || !subject || !boardExamType) throw new AppError('studentId, subject, boardExamType required');
    if (!['class10', 'class12', 'entrance'].includes(boardExamType))
      throw new AppError('boardExamType must be class10 | class12 | entrance');

    const student = await prisma.student.findFirst({ where: { id: studentId, schoolId } });
    if (!student) throw new AppError('Student not found', 404);

    const tracker = await prisma.boardExamTracker.upsert({
      where:  { studentId_subject_boardExamType: { studentId, subject, boardExamType } },
      create: {
        schoolId, studentId, subject, boardExamType,
        classId:          classId          ?? student.classId,
        examDate:         examDate         ? new Date(examDate) : null,
        syllabusCoverage: syllabusCoverage ?? 0,
        practiceTestScore: practiceTestScore ?? null,
        targetScore:      targetScore      ?? null,
        weakTopics:       weakTopics       ? JSON.stringify(weakTopics) : null,
        strongTopics:     strongTopics     ? JSON.stringify(strongTopics) : null,
        notes:            notes            ?? null,
        updatedById:      user.id,
      },
      update: {
        ...(examDate          !== undefined ? { examDate: examDate ? new Date(examDate) : null } : {}),
        ...(syllabusCoverage  !== undefined ? { syllabusCoverage }                              : {}),
        ...(practiceTestScore !== undefined ? { practiceTestScore }                             : {}),
        ...(targetScore       !== undefined ? { targetScore }                                   : {}),
        ...(weakTopics        !== undefined ? { weakTopics: JSON.stringify(weakTopics) }        : {}),
        ...(strongTopics      !== undefined ? { strongTopics: JSON.stringify(strongTopics) }    : {}),
        ...(notes             !== undefined ? { notes }                                         : {}),
        updatedById: user.id,
      },
    });

    return Response.json({ tracker }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!['super_admin', 'school_admin', 'principal', 'hod', 'teacher'].includes(primary.role_code))
      throw new ForbiddenError();

    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new AppError('id required');
    const tracker = await prisma.boardExamTracker.findUnique({ where: { id } });
    if (!tracker) throw new AppError('Tracker not found', 404);
    if (primary.school_id && tracker.schoolId !== primary.school_id) throw new ForbiddenError();

    const body = await request.json();
    const updated = await prisma.boardExamTracker.update({
      where: { id },
      data: {
        ...(body.examDate          !== undefined ? { examDate: body.examDate ? new Date(body.examDate) : null } : {}),
        ...(body.syllabusCoverage  !== undefined ? { syllabusCoverage: body.syllabusCoverage }                 : {}),
        ...(body.practiceTestScore !== undefined ? { practiceTestScore: body.practiceTestScore }               : {}),
        ...(body.targetScore       !== undefined ? { targetScore: body.targetScore }                           : {}),
        ...(body.weakTopics        !== undefined ? { weakTopics: JSON.stringify(body.weakTopics) }             : {}),
        ...(body.strongTopics      !== undefined ? { strongTopics: JSON.stringify(body.strongTopics) }         : {}),
        ...(body.notes             !== undefined ? { notes: body.notes }                                       : {}),
        updatedById: user.id,
      },
    });

    return Response.json({ tracker: updated });
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!['super_admin', 'school_admin', 'principal'].includes(primary.role_code)) throw new ForbiddenError();

    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new AppError('id required');
    const tracker = await prisma.boardExamTracker.findUnique({ where: { id } });
    if (!tracker) throw new AppError('Tracker not found', 404);
    if (primary.school_id && tracker.schoolId !== primary.school_id) throw new ForbiddenError();

    await prisma.boardExamTracker.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
