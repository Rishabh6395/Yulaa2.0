/**
 * Courses API
 * GET   - browse available courses (school-scoped + approved external)
 * POST  - teacher/admin creates a course
 * PATCH - teacher updates course; super-admin approves external courses
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const { role_code: role } = primary;
    const schoolId = primary.school_id ?? '';

    const { searchParams } = new URL(request.url);
    const type     = searchParams.get('type');
    const mine     = searchParams.get('mine') === 'true';

    if (role === 'super_admin') {
      const courses = await prisma.course.findMany({
        include: {
          school: { select: { name: true } },
          teacher: { select: { user: { select: { firstName: true, lastName: true } } } },
          enrollments: { select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return Response.json({ courses });
    }

    if (mine && role === 'teacher') {
      const teacher = await prisma.teacher.findFirst({ where: { schoolId, userId: user.id ?? undefined }, select: { id: true } });
      if (!teacher) return Response.json({ courses: [] });
      const courses = await prisma.course.findMany({
        where: { teacherId: teacher.id },
        include: { modules: { include: { lessons: { select: { id: true } } } }, enrollments: { select: { id: true } } },
        orderBy: { createdAt: 'desc' },
      });
      return Response.json({ courses });
    }

    // Students/parents browse: school courses + approved external courses
    const school = schoolId
      ? await prisma.school.findUnique({ where: { id: schoolId }, select: { courseEnabled: true } })
      : null;

    const courses = await prisma.course.findMany({
      where: {
        isPublished: true,
        ...(type ? { type } : {}),
        OR: [
          { schoolId, isExternal: false },
          { isExternal: true, approvedById: { not: null } },
        ],
      },
      select: {
        id: true, title: true, description: true, thumbnail: true, type: true,
        price: true, isFree: true, totalDuration: true, tags: true, targetGrades: true,
        instructorName: true, certificateEnabled: true,
        teacher: { select: { user: { select: { firstName: true, lastName: true } } } },
        enrollments: { select: { id: true } },
        modules: { select: { lessons: { select: { id: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Response.json({ courses, courseEnabled: school?.courseEnabled ?? false });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const { role_code: role } = primary;
    const schoolId = primary.school_id ?? '';

    if (!['teacher', 'school_admin', 'principal', 'super_admin'].includes(role)) throw new ForbiddenError();

    const body = await request.json();
    const { title, description, type, price, is_free, thumbnail, tags,
            target_grades, instructor_name, certificate_enabled, is_external } = body;

    if (!title) throw new AppError('title is required');

    let teacherId: string | null = null;
    if (role === 'teacher') {
      const teacher = await prisma.teacher.findFirst({ where: { schoolId, userId: user.id ?? undefined }, select: { id: true } });
      if (!teacher) throw new ForbiddenError('Teacher profile not found');
      teacherId = teacher.id;
    }

    const course = await prisma.course.create({
      data: {
        schoolId:           role === 'super_admin' ? null : (schoolId ?? null),
        teacherId:          teacherId,
        instructorName:     instructor_name ?? null,
        title,
        description:        description ?? null,
        thumbnail:          thumbnail ?? null,
        type:               type ?? 'recorded',
        price:              price ?? 0,
        isFree:             Boolean(is_free),
        isExternal:         Boolean(is_external),
        requiresApproval:   Boolean(is_external),
        certificateEnabled: Boolean(certificate_enabled),
        tags:               tags ?? [],
        targetGrades:       target_grades ?? [],
      },
    });

    return Response.json({ course }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const { role_code: role } = primary;
    const schoolId = primary.school_id ?? '';

    const body = await request.json();
    const { id, is_published, approve, ...rest } = body;
    if (!id) throw new AppError('id is required');

    // Super admin can approve external courses
    if (approve) {
      if (role !== 'super_admin') throw new ForbiddenError();
      const updated = await prisma.course.update({
        where: { id },
        data: { approvedById: user.id, approvedAt: new Date(), isPublished: true },
      });
      return Response.json({ course: updated });
    }

    // Teacher or admin updates their own course
    const existing = await prisma.course.findUnique({ where: { id } });
    if (!existing) throw new AppError('Course not found');

    if (role === 'teacher') {
      const teacher = await prisma.teacher.findFirst({ where: { schoolId, userId: user.id ?? undefined }, select: { id: true } });
      if (!teacher || existing.teacherId !== teacher.id) throw new ForbiddenError();
    }

    const updated = await prisma.course.update({
      where: { id },
      data: {
        ...(rest.title       !== undefined && { title: rest.title }),
        ...(rest.description !== undefined && { description: rest.description }),
        ...(rest.price       !== undefined && { price: rest.price }),
        ...(rest.type        !== undefined && { type: rest.type }),
        ...(is_published     !== undefined && { isPublished: Boolean(is_published) }),
        ...(rest.tags        !== undefined && { tags: rest.tags }),
        ...(rest.thumbnail   !== undefined && { thumbnail: rest.thumbnail }),
      },
    });

    return Response.json({ course: updated });
  } catch (err) { return handleError(err); }
}
