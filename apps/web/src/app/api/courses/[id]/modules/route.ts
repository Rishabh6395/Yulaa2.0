/**
 * Course modules CRUD — teacher who owns the course or admin of the same school
 * GET   - list modules with lessons for a course
 * POST  - add a module
 * PATCH - rename / reorder module
 * DELETE - remove module (and its lessons)
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

async function resolveOwnership(courseId: string, user: any) {
  const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  const { role_code: role, school_id: schoolId } = primary;

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new AppError('Course not found');

  if (role === 'super_admin') return { course, role };

  if (role === 'teacher') {
    const teacher = await prisma.teacher.findFirst({ where: { schoolId, userId: user.id }, select: { id: true } });
    if (!teacher || course.teacherId !== teacher.id) throw new ForbiddenError();
  } else if (['school_admin', 'principal'].includes(role)) {
    if (course.schoolId !== schoolId) throw new ForbiddenError();
  } else {
    throw new ForbiddenError();
  }

  return { course, role };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    await resolveOwnership(id, user);

    const modules = await prisma.courseModule.findMany({
      where: { courseId: id },
      orderBy: { sortOrder: 'asc' },
      include: {
        lessons: { orderBy: { sortOrder: 'asc' } },
      },
    });
    return Response.json({ modules });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    await resolveOwnership(id, user);

    const { title, description } = await request.json();
    if (!title) throw new AppError('title is required');

    const last = await prisma.courseModule.findFirst({
      where: { courseId: id },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const mod = await prisma.courseModule.create({
      data: {
        courseId:    id,
        title,
        description: description ?? null,
        sortOrder:   (last?.sortOrder ?? 0) + 1,
      },
    });
    return Response.json({ module: mod }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    await resolveOwnership(id, user);

    const { module_id, title, description, sort_order } = await request.json();
    if (!module_id) throw new AppError('module_id is required');

    const mod = await prisma.courseModule.update({
      where: { id: module_id },
      data: {
        ...(title       !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(sort_order  !== undefined && { sortOrder: sort_order }),
      },
    });
    return Response.json({ module: mod });
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    await resolveOwnership(id, user);

    const { module_id } = await request.json();
    if (!module_id) throw new AppError('module_id is required');

    await prisma.courseModule.delete({ where: { id: module_id } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
