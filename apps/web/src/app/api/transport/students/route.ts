/**
 * GET    /api/transport/students?school_id=X&route_id=X   — list students assigned to a route
 * PATCH  /api/transport/students                           — assign/unassign students to a route
 *
 * PATCH body:
 *   { studentIds: string[], routeId: string | null }
 *   routeId = null → unassign (clear transport route)
 */
import { PRINCIPAL_ADMIN_ROLES as ALLOWED_ROLES } from '@/lib/roles';
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

function getSchoolId(user: any, override?: string | null): string {
  if (user.roles.some((r: any) => r.role_code === 'super_admin') && override) return override;
  const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  if (!ALLOWED_ROLES.includes(primary.role_code)) throw new ForbiddenError();
  if (!primary.school_id) throw new ForbiddenError('No school associated');
  return primary.school_id;
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const { searchParams } = new URL(request.url);
    const schoolId = getSchoolId(user, searchParams.get('school_id'));
    const routeId  = searchParams.get('route_id');

    const students = await prisma.student.findMany({
      where: {
        schoolId,
        ...(routeId ? { transportRouteId: routeId } : { transportRouteId: { not: null } }),
      },
      select: {
        id: true, firstName: true, lastName: true, admissionNo: true,
        transportRouteId: true,
        class: { select: { grade: true, section: true } },
      },
      orderBy: [{ firstName: 'asc' }],
    });

    return Response.json({ students, total: students.length });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary  = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const schoolId = getSchoolId(user);

    const body = await request.json();
    const { studentIds, routeId } = body;
    if (!Array.isArray(studentIds) || studentIds.length === 0) throw new AppError('studentIds[] required');

    // Verify all students belong to this school
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds }, schoolId },
      select: { id: true },
    });
    if (students.length !== studentIds.length) throw new AppError('One or more students not found in your school');

    // If assigning (routeId provided), verify route belongs to school
    if (routeId) {
      const route = await prisma.transportRoute.findFirst({ where: { id: routeId, schoolId } });
      if (!route) throw new AppError('Route not found', 404);
    }

    const { count } = await prisma.student.updateMany({
      where: { id: { in: studentIds }, schoolId },
      data:  { transportRouteId: routeId ?? null },
    });

    return Response.json({ updated: count, routeId: routeId ?? null });
  } catch (err) { return handleError(err); }
}
