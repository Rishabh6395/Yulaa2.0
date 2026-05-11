/**
 * Super Admin — configure online class settings per school.
 * GET   - fetch config for a school
 * PATCH - toggle platforms (meet/teams/zoom), enable/disable online classes or courses
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

function assertSuperAdmin(user: Awaited<ReturnType<typeof getUserFromRequest>>) {
  if (!user) throw new UnauthorizedError();
  const role = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  if (role.role_code !== 'super_admin') throw new ForbiddenError();
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    assertSuperAdmin(user);

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');
    if (!schoolId) throw new AppError('school_id is required');

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true, name: true,
        onlineClassEnabled: true,
        courseEnabled: true,
        allowedPlatforms: true,
        allowExternalConsultant: true,
        allowExternalVendor: true,
      },
    });
    if (!school) throw new AppError('School not found');

    return Response.json({ config: school });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    assertSuperAdmin(user);

    const body = await request.json();
    const { school_id, online_class_enabled, course_enabled, allowed_platforms } = body;
    if (!school_id) throw new AppError('school_id is required');

    const updated = await prisma.school.update({
      where: { id: school_id },
      data: {
        ...(online_class_enabled !== undefined && { onlineClassEnabled: Boolean(online_class_enabled) }),
        ...(course_enabled       !== undefined && { courseEnabled: Boolean(course_enabled) }),
        ...(allowed_platforms    !== undefined && { allowedPlatforms: allowed_platforms }),
      },
      select: { id: true, onlineClassEnabled: true, courseEnabled: true, allowedPlatforms: true },
    });

    return Response.json({ config: updated });
  } catch (err) { return handleError(err); }
}
