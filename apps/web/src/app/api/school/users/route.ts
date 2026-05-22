/**
 * GET /api/school/users
 * Returns all users belonging to the authenticated user's school.
 * Accessible to school_admin, principal, hod, teacher, super_admin.
 * Used for SPOC assignment in the admission workflow builder.
 */

import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';
import { MANAGEMENT_ROLES } from '@/lib/roles';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const primary  = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const roleCode = primary.role_code as string;

    // super_admin can pass ?schoolId=... to get users for any school
    const { searchParams } = new URL(request.url);
    let schoolId: string | null = primary.school_id ?? null;

    if (roleCode === 'super_admin') {
      const qs = searchParams.get('schoolId');
      if (qs) schoolId = qs;
    }

    if (!schoolId) throw new ForbiddenError('No school associated with your account');
    if (!MANAGEMENT_ROLES.includes(roleCode) && roleCode !== 'teacher') {
      throw new ForbiddenError('Insufficient permissions');
    }

    const users = await prisma.user.findMany({
      where: {
        status:    'active',
        userRoles: { some: { schoolId } },
      },
      select: {
        id:        true,
        firstName: true,
        lastName:  true,
        email:     true,
        userRoles: {
          where:   { schoolId },
          include: { role: { select: { code: true, displayName: true } } },
        },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    return Response.json({ users });
  } catch (err) { return handleError(err); }
}
