/**
 * GET  /api/super-admin/schools/[id]/menu-permissions?role=teacher
 *   → returns { menuKeys: string[] } for that role
 *
 * POST /api/super-admin/schools/[id]/menu-permissions
 *   body: { role: string, enabledItems: string[] }
 *   → saves the permission set; deletes old records and inserts new ones
 */

import { CORE_ADMIN_ROLES as ADMIN_ROLES } from '@/lib/roles';
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';


function assertAdmin(user: any) {
  if (!user) throw new UnauthorizedError();
  const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  if (!ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError();
  return primary;
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    assertAdmin(user!);

    const schoolId = params.id;
    const role     = new URL(request.url).searchParams.get('role') || 'school_admin';

    const saved = await prisma.menuPermission.findMany({
      where:  { schoolId, roleCode: role },
      select: { menuKey: true, enabled: true },
    });

    const menuKeys = saved.filter(p => p.enabled).map(p => p.menuKey);
    return Response.json({ menuKeys });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    assertAdmin(user!);

    const schoolId = params.id;
    const { role, enabledItems } = await request.json();

    if (!role || !Array.isArray(enabledItems)) {
      throw new AppError('role and enabledItems[] are required', 400);
    }

    // Delete existing permissions for this school+role and re-insert
    await prisma.menuPermission.deleteMany({ where: { schoolId, roleCode: role } });

    if (enabledItems.length > 0) {
      await prisma.menuPermission.createMany({
        data: enabledItems.map((menuKey: string) => ({
          schoolId,
          roleCode: role,
          menuKey,
          enabled: true,
        })),
      });
    }

    return Response.json({ ok: true, saved: enabledItems.length });
  } catch (err) { return handleError(err); }
}
