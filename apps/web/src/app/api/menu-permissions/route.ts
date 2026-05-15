/**
 * GET /api/menu-permissions
 * Returns enabled menu keys for the current user's role + school,
 * ordered by sortOrder so the sidebar can apply the stored sequence.
 *
 * Fallback: if no records are configured for this school+role yet,
 * returns the full default key set from menuConfig so the sidebar works
 * out-of-box without manual DB seeding.
 */

import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError } from '@/utils/errors';
import prisma from '@/lib/prisma';
import { getDefaultOrderedKeys } from '@/lib/menuConfig';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const primary  = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const roleCode = primary.role_code as string;
    const schoolId = primary.school_id as string | null;

    if (!schoolId) {
      // Roles without a school (shouldn't reach here for school-scoped roles)
      return Response.json({ menuKeys: getDefaultOrderedKeys(roleCode) });
    }

    const saved = await prisma.menuPermission.findMany({
      where:   { schoolId, roleCode },
      select:  { menuKey: true, enabled: true, sortOrder: true },
      orderBy: { sortOrder: 'asc' },
    });

    // No explicit config yet — return full defaults so the sidebar is usable immediately
    if (saved.length === 0) {
      return Response.json({ menuKeys: getDefaultOrderedKeys(roleCode) });
    }

    const menuKeys = saved.filter(p => p.enabled).map(p => p.menuKey);
    return Response.json({ menuKeys });
  } catch (err) { return handleError(err); }
}
