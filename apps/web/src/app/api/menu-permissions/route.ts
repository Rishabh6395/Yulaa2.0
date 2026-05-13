/**
 * GET /api/menu-permissions
 * Returns enabled menu keys for the current user's role + school,
 * ordered by sortOrder so the sidebar can apply the stored sequence.
 */

import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError } from '@/utils/errors';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const primary  = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const roleCode = primary.role_code as string;
    const schoolId = primary.school_id as string | null;

    if (!schoolId) {
      return Response.json({ menuKeys: [] });
    }

    const saved = await prisma.menuPermission.findMany({
      where:   { schoolId, roleCode },
      select:  { menuKey: true, enabled: true, sortOrder: true },
      orderBy: { sortOrder: 'asc' },
    });

    const menuKeys = saved.filter(p => p.enabled).map(p => p.menuKey);
    return Response.json({ menuKeys });
  } catch (err) { return handleError(err); }
}
