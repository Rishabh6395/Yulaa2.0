/**
 * GET    /api/performance/subject-chat?student_id=X&teacher_id=X&subject=X   — list/get threads
 * POST   /api/performance/subject-chat                                        — open thread / send message
 * PATCH  /api/performance/subject-chat?thread_id=X                           — resolve thread / mark read
 *
 * Threads are scoped to (student, teacher, subject, cycle).
 * Messages within a thread are returned with the thread.
 * Parent can read/write threads for their child.
 * Teacher can read/write threads for their students.
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
    const schoolId  = await resolveSchoolId(user, searchParams.get('school_id'));
    const studentId = searchParams.get('student_id');
    const teacherId = searchParams.get('teacher_id');
    const subject   = searchParams.get('subject');
    const threadId  = searchParams.get('thread_id');
    const status    = searchParams.get('status');

    // Single thread with messages
    if (threadId) {
      const thread = await prisma.subjectChatThread.findUnique({
        where: { id: threadId },
        include: {
          messages: { orderBy: { createdAt: 'asc' } },
          student:  { select: { id: true, firstName: true, lastName: true } },
          teacher:  { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
        },
      });
      if (!thread) throw new AppError('Thread not found', 404);
      if (primary.school_id && thread.schoolId !== primary.school_id) throw new ForbiddenError();
      return Response.json({ thread });
    }

    // Parent: only own child's threads
    let filterStudentId = studentId;
    if (primary.role_code === 'parent') {
      const parent = await prisma.parent.findUnique({ where: { userId: user.id }, include: { parentStudents: { select: { studentId: true } } } });
      const childIds = parent?.parentStudents.map(ps => ps.studentId) ?? [];
      if (studentId && !childIds.includes(studentId)) throw new ForbiddenError();
      filterStudentId = studentId ?? (childIds.length === 1 ? childIds[0] : undefined) ?? null;
    }

    // Teacher: only their threads
    let filterTeacherId = teacherId;
    if (primary.role_code === 'teacher') {
      const teacher = await prisma.teacher.findFirst({ where: { userId: user.id, schoolId } });
      filterTeacherId = teacher?.id ?? null;
    }

    const threads = await prisma.subjectChatThread.findMany({
      where: {
        schoolId,
        ...(filterStudentId ? { studentId: filterStudentId } : {}),
        ...(filterTeacherId ? { teacherId: filterTeacherId } : {}),
        ...(subject         ? { subject }                    : {}),
        ...(status          ? { status }                     : {}),
      },
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        student:  { select: { id: true, firstName: true, lastName: true } },
        teacher:  { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
        _count:   { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return Response.json({ threads });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];

    const body = await request.json();
    const { schoolId: sid, studentId, teacherId, subject, cycleId, message, attachments, threadId } = body;
    const schoolId = await resolveSchoolId(user, sid);

    // Determine sender role
    const senderRole = primary.role_code === 'parent'   ? 'parent'
                     : primary.role_code === 'student'  ? 'student'
                     : primary.role_code === 'teacher'  ? 'teacher'
                     : 'teacher';  // admin acts as teacher

    // If threadId provided, just send a message to existing thread
    if (threadId) {
      const thread = await prisma.subjectChatThread.findUnique({ where: { id: threadId } });
      if (!thread) throw new AppError('Thread not found', 404);
      if (primary.school_id && thread.schoolId !== primary.school_id) throw new ForbiddenError();
      if (!message) throw new AppError('message required');

      const msg = await prisma.subjectChatMessage.create({
        data: { threadId, senderId: user.id, senderRole, message, attachments: attachments ?? null },
      });
      // Update thread timestamp
      await prisma.subjectChatThread.update({ where: { id: threadId }, data: { updatedAt: new Date() } });
      return Response.json({ message: msg }, { status: 201 });
    }

    // Create new thread + first message
    if (!studentId || !teacherId || !subject || !message)
      throw new AppError('studentId, teacherId, subject, message required');

    // Prisma upsert cannot match NULL in compound unique — use findFirst + create/update
    const existingThread = await prisma.subjectChatThread.findFirst({
      where: { studentId, teacherId, subject, cycleId: cycleId ?? null },
    });

    const [thread, msg] = await prisma.$transaction(async (tx) => {
      const t = existingThread
        ? await tx.subjectChatThread.update({ where: { id: existingThread.id }, data: { status: 'open' } })
        : await tx.subjectChatThread.create({ data: { schoolId, studentId, teacherId, subject, cycleId: cycleId ?? null, status: 'open' } });
      const m = await tx.subjectChatMessage.create({
        data: { threadId: t.id, senderId: user.id, senderRole, message, attachments: attachments ?? null },
      });
      return [t, m];
    });

    return Response.json({ thread, message: msg }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];

    const threadId = new URL(request.url).searchParams.get('thread_id');
    if (!threadId) throw new AppError('thread_id required');

    const thread = await prisma.subjectChatThread.findUnique({ where: { id: threadId } });
    if (!thread) throw new AppError('Thread not found', 404);
    if (primary.school_id && thread.schoolId !== primary.school_id) throw new ForbiddenError();

    const body = await request.json();
    const { action } = body;

    if (action === 'resolve') {
      const updated = await prisma.subjectChatThread.update({ where: { id: threadId }, data: { status: 'resolved' } });
      return Response.json({ thread: updated });
    }

    if (action === 'mark_read') {
      // Mark all unread messages in thread as read
      await prisma.subjectChatMessage.updateMany({
        where: { threadId, readAt: null, senderId: { not: user.id } },
        data:  { readAt: new Date() },
      });
      return Response.json({ ok: true });
    }

    throw new AppError('action must be resolve | mark_read');
  } catch (err) { return handleError(err); }
}
