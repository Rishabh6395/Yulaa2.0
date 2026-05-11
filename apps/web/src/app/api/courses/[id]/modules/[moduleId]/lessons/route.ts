/**
 * Course lessons CRUD inside a module
 * GET    - list lessons
 * POST   - add lesson
 * PATCH  - update lesson
 * DELETE - remove lesson
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

async function resolveOwnership(courseId: string, moduleId: string, user: any) {
  const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  const { role_code: role, school_id: schoolId } = primary;

  const mod = await prisma.courseModule.findUnique({ where: { id: moduleId }, include: { course: true } });
  if (!mod || mod.courseId !== courseId) throw new AppError('Module not found');

  if (role === 'super_admin') return { mod, role };

  if (role === 'teacher') {
    const teacher = await prisma.teacher.findFirst({ where: { schoolId, userId: user.id }, select: { id: true } });
    if (!teacher || mod.course.teacherId !== teacher.id) throw new ForbiddenError();
  } else if (['school_admin', 'principal'].includes(role)) {
    if (mod.course.schoolId !== schoolId) throw new ForbiddenError();
  } else {
    throw new ForbiddenError();
  }

  return { mod, role };
}

export async function GET(
  request: Request,
  { params }: { params: { id: string; moduleId: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    await resolveOwnership(params.id, params.moduleId, user);

    const lessons = await prisma.courseLesson.findMany({
      where: { moduleId: params.moduleId },
      orderBy: { sortOrder: 'asc' },
    });
    return Response.json({ lessons });
  } catch (err) { return handleError(err); }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string; moduleId: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    await resolveOwnership(params.id, params.moduleId, user);

    const { title, type, content_url, meeting_link, duration, is_preview, scheduled_at, description } = await request.json();
    if (!title) throw new AppError('title is required');

    const last = await prisma.courseLesson.findFirst({
      where: { moduleId: params.moduleId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const lesson = await prisma.courseLesson.create({
      data: {
        moduleId:    params.moduleId,
        title,
        description: description ?? null,
        type:        type ?? 'video',
        contentUrl:  content_url ?? null,
        meetingLink: meeting_link ?? null,
        duration:    duration ?? null,
        isPreview:   Boolean(is_preview),
        scheduledAt: scheduled_at ? new Date(scheduled_at) : null,
        sortOrder:   (last?.sortOrder ?? 0) + 1,
      },
    });
    return Response.json({ lesson }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; moduleId: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    await resolveOwnership(params.id, params.moduleId, user);

    const { lesson_id, title, type, content_url, meeting_link, duration, is_preview, scheduled_at, sort_order, description } = await request.json();
    if (!lesson_id) throw new AppError('lesson_id is required');

    const lesson = await prisma.courseLesson.update({
      where: { id: lesson_id },
      data: {
        ...(title       !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(type        !== undefined && { type }),
        ...(content_url !== undefined && { contentUrl: content_url }),
        ...(meeting_link !== undefined && { meetingLink: meeting_link }),
        ...(duration    !== undefined && { duration }),
        ...(is_preview  !== undefined && { isPreview: Boolean(is_preview) }),
        ...(scheduled_at !== undefined && { scheduledAt: scheduled_at ? new Date(scheduled_at) : null }),
        ...(sort_order  !== undefined && { sortOrder: sort_order }),
      },
    });
    return Response.json({ lesson });
  } catch (err) { return handleError(err); }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; moduleId: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    await resolveOwnership(params.id, params.moduleId, user);

    const { lesson_id } = await request.json();
    if (!lesson_id) throw new AppError('lesson_id is required');

    await prisma.courseLesson.delete({ where: { id: lesson_id } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
