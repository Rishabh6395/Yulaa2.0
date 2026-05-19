/**
 * GET    /api/diary?school_id=X&class_id=X&date=YYYY-MM-DD   — list diary entries
 * POST   /api/diary                                           — create entry (teacher)
 * PATCH  /api/diary?id=X                                     — update entry
 * DELETE /api/diary?id=X                                     — delete entry
 *
 * Parents and students see published entries for their class only.
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
    const schoolId = await resolveSchoolId(user, searchParams.get('school_id'));
    const classId  = searchParams.get('class_id');
    const dateStr  = searchParams.get('date');
    const fromStr  = searchParams.get('from');
    const toStr    = searchParams.get('to');

    // Parent: can only see own child's class
    let allowedClassIds: string[] | null = null;
    if (primary.role_code === 'parent') {
      const parentRecord = await prisma.parent.findUnique({
        where: { userId: user.id },
        include: { parentStudents: { include: { student: { select: { classId: true } } } } },
      });
      allowedClassIds = (parentRecord?.parentStudents ?? [])
        .map(ps => ps.student.classId)
        .filter(Boolean) as string[];
    }

    const entries = await prisma.diaryEntry.findMany({
      where: {
        schoolId,
        ...(classId ? { classId } : allowedClassIds ? { classId: { in: allowedClassIds } } : {}),
        ...(primary.role_code === 'parent' || primary.role_code === 'student' ? { isPublished: true } : {}),
        ...(dateStr  ? { date: new Date(dateStr) } : {}),
        ...(fromStr && toStr ? { date: { gte: new Date(fromStr), lte: new Date(toStr) } } : {}),
      },
      include: {
        class:   { select: { grade: true, section: true, name: true } },
        teacher: { select: { user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });

    return Response.json({ entries });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!['super_admin', 'school_admin', 'principal', 'teacher'].includes(primary.role_code))
      throw new ForbiddenError('Teacher or admin role required');

    const body = await request.json();
    const { schoolId: sid, classId, date, subject, content, homeworkDetails, attachments, isPublished } = body;
    const schoolId = await resolveSchoolId(user, sid);
    if (!classId || !date || !content) throw new AppError('classId, date, content required');

    // For teacher: get their teacherId
    let teacherId: string;
    if (primary.role_code === 'teacher') {
      const teacher = await prisma.teacher.findFirst({ where: { userId: user.id, schoolId } });
      if (!teacher) throw new AppError('Teacher record not found', 404);
      teacherId = teacher.id;
    } else {
      if (!body.teacherId) throw new AppError('teacherId required for admin entry');
      teacherId = body.teacherId;
    }

    const entry = await prisma.diaryEntry.create({
      data: {
        schoolId, classId, teacherId,
        date:           new Date(date),
        subject:        subject        ?? null,
        content,
        homeworkDetails: homeworkDetails ?? null,
        attachments:    attachments    ?? null,
        isPublished:    isPublished    ?? true,
      },
    });

    return Response.json({ entry }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];

    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new AppError('id required');
    const entry = await prisma.diaryEntry.findUnique({ where: { id } });
    if (!entry) throw new AppError('Entry not found', 404);
    if (primary.school_id && entry.schoolId !== primary.school_id) throw new ForbiddenError();

    // Teacher can only edit own entries
    if (primary.role_code === 'teacher') {
      const teacher = await prisma.teacher.findFirst({ where: { userId: user.id, schoolId: entry.schoolId } });
      if (!teacher || teacher.id !== entry.teacherId) throw new ForbiddenError('You can only edit your own diary entries');
    }

    const body = await request.json();
    const updated = await prisma.diaryEntry.update({
      where: { id },
      data: {
        ...(body.content         !== undefined ? { content: body.content }                 : {}),
        ...(body.subject         !== undefined ? { subject: body.subject }                 : {}),
        ...(body.homeworkDetails !== undefined ? { homeworkDetails: body.homeworkDetails } : {}),
        ...(body.attachments     !== undefined ? { attachments: body.attachments }         : {}),
        ...(body.isPublished     !== undefined ? { isPublished: body.isPublished }         : {}),
      },
    });

    return Response.json({ entry: updated });
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];

    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new AppError('id required');
    const entry = await prisma.diaryEntry.findUnique({ where: { id } });
    if (!entry) throw new AppError('Entry not found', 404);
    if (primary.school_id && entry.schoolId !== primary.school_id) throw new ForbiddenError();

    await prisma.diaryEntry.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
