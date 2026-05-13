/**
 * GET  /api/super-admin/schools/[id]/menu-permissions?role=teacher
 *   → { items: { key, enabled, sortOrder }[] } for that role, ordered by sortOrder
 *
 * POST /api/super-admin/schools/[id]/menu-permissions
 *   body: { role: string, items: { key: string, enabled: boolean, sortOrder: number }[] }
 *   → saves the full permission + sequence set (replaces existing records)
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

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request);
    assertAdmin(user!);

    const schoolId = (await params).id;
    const role     = new URL(request.url).searchParams.get('role') || 'school_admin';

    const saved = await prisma.menuPermission.findMany({
      where:   { schoolId, roleCode: role },
      select:  { menuKey: true, enabled: true, sortOrder: true },
      orderBy: { sortOrder: 'asc' },
    });

    return Response.json({
      items: saved.map(p => ({ key: p.menuKey, enabled: p.enabled, sortOrder: p.sortOrder })),
    });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request);
    assertAdmin(user!);

    const schoolId = (await params).id;
    const body     = await request.json();
    const { role, items } = body as {
      role: string;
      items: { key: string; enabled: boolean; sortOrder: number }[];
    };

    if (!role || !Array.isArray(items)) {
      throw new AppError('role and items[] are required', 400);
    }

    await prisma.menuPermission.deleteMany({ where: { schoolId, roleCode: role } });

    if (items.length > 0) {
      await prisma.menuPermission.createMany({
        data: items.map(item => ({
          schoolId,
          roleCode:  role,
          menuKey:   item.key,
          enabled:   item.enabled,
          sortOrder: item.sortOrder,
        })),
      });
    }

    return Response.json({ ok: true, saved: items.length });
  } catch (err) { return handleError(err); }
}
