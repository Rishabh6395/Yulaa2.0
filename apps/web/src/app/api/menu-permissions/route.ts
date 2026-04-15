/**
 * GET /api/menu-permissions
 * Returns the list of enabled menu keys for the current user's role + school.
 * Always fetched from the DB — no hardcoded defaults.
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

    // Super admin has no school-specific permissions — sidebar handles this role separately
    if (!schoolId) {
      return Response.json({ menuKeys: [] });
    }

    // Return only what has been explicitly enabled for this school + role
    const saved = await prisma.menuPermission.findMany({
      where:  { schoolId, roleCode },
      select: { menuKey: true, enabled: true },
    });

    const menuKeys = saved.filter(p => p.enabled).map(p => p.menuKey);
    return Response.json({ menuKeys });
  } catch (err) { return handleError(err); }
}
