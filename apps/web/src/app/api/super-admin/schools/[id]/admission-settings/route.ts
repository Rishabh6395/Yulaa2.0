/**
 * GET  /api/super-admin/schools/[id]/admission-settings
 * PATCH /api/super-admin/schools/[id]/admission-settings
 *
 * Manages school-level admission configuration:
 *   - allowTaskReassign: boolean — whether tasks can be reassigned
 *   - taskReassignRoles: string[] — roles that can reassign tasks
 *   - spocEnabled: boolean — whether SPOC involvement is enabled
 *   - defaultSpocUserId: string | null — default SPOC user
 */

import { CORE_ADMIN_ROLES } from '@/lib/roles';
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';
import prisma from '@/lib/prisma';

function assertAdmin(user: any) {
  if (!user) throw new UnauthorizedError();
  const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  if (!CORE_ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError();
}

const DEFAULT_SETTINGS = {
  allowTaskReassign:  false,
  taskReassignRoles:  ['school_admin', 'principal'],
  spocEnabled:        false,
  defaultSpocUserId:  null as string | null,
};

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request);
    assertAdmin(user);
    const school = await prisma.school.findUnique({
      where:  { id: (await params).id },
      select: { admissionSettings: true },
    });
    const settings = { ...DEFAULT_SETTINGS, ...((school?.admissionSettings as object) ?? {}) };
    return Response.json({ settings });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request);
    assertAdmin(user);
    const schoolId = (await params).id;
    const body = await request.json();

    const current = await prisma.school.findUnique({
      where:  { id: schoolId },
      select: { admissionSettings: true },
    });
    const merged = {
      ...DEFAULT_SETTINGS,
      ...((current?.admissionSettings as object) ?? {}),
      ...body,
    };

    await prisma.school.update({
      where: { id: schoolId },
      data:  { admissionSettings: merged },
    });
    return Response.json({ settings: merged });
  } catch (err) { return handleError(err); }
}
