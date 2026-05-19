/**
 * GET /api/school/online-config
 * Returns online class settings for the caller's school.
 * Accessible to any authenticated school-scoped role.
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const primary  = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const schoolId = primary.school_id as string | null;
    if (!schoolId) throw new ForbiddenError();

    const school = await prisma.school.findUnique({
      where:  { id: schoolId },
      select: { onlineClassEnabled: true, allowedPlatforms: true },
    });

    return Response.json({
      online_class_enabled: school?.onlineClassEnabled ?? false,
      allowed_platforms:    school?.allowedPlatforms   ?? [],
    });
  } catch (err) { return handleError(err); }
}
