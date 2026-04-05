/**
 * GET /api/menu-permissions
 * Returns the list of enabled menu keys for the current user's role + school.
 * Falls back to defaults if no permissions have been configured yet.
 */

import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError } from '@/utils/errors';
import prisma from '@/lib/prisma';

// Default menu items visible per role (used when no DB config exists)
const ROLE_DEFAULTS: Record<string, string[]> = {
  super_admin:  ['schools', 'masters'],
  school_admin: ['dashboard','masters','admissions','classes','students','teachers','parents','attendance','fees','scheduling','announcements','leave','queries','transport','compliance','reports','settings'],
  teacher:      ['dashboard','attendance','performance','homework','leave','queries','settings'],
  student:      ['dashboard','attendance','fees','homework','announcements','queries'],
  parent:       ['dashboard','attendance','fees','performance','homework','announcements','leave','queries','transport'],
  hod:          ['dashboard','students','teachers','classes','attendance','homework','performance','leave','queries','announcements','reports','settings'],
  principal:    ['dashboard','admissions','classes','students','teachers','parents','attendance','fees','scheduling','announcements','leave','queries','transport','compliance','reports','settings'],
  employee:     ['dashboard','attendance','leave','queries','settings'],
};

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const primary  = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const roleCode = primary.role_code as string;
    const schoolId = primary.school_id as string | null;

    // Super admin has no school-specific permissions
    if (!schoolId) {
      return Response.json({ menuKeys: ROLE_DEFAULTS[roleCode] ?? [] });
    }

    // Check if this school has saved any permissions for this role
    const saved = await prisma.menuPermission.findMany({
      where:  { schoolId, roleCode },
      select: { menuKey: true, enabled: true },
    });

    if (saved.length === 0) {
      // No config yet — return defaults
      return Response.json({ menuKeys: ROLE_DEFAULTS[roleCode] ?? [] });
    }

    const menuKeys = saved.filter(p => p.enabled).map(p => p.menuKey);
    return Response.json({ menuKeys });
  } catch (err) { return handleError(err); }
}
