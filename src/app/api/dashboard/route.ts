import { getUserFromRequest } from '@/lib/auth';
import { getAdminDashboard, getParentDashboard, getSuperAdminDashboard } from '@/modules/dashboard/dashboard.service';
import { handleError, UnauthorizedError } from '@/utils/errors';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');
    const isParent  = user.roles.some((r) => r.role_code === 'parent');

    if (isParent && studentId) {
      return Response.json(await getParentDashboard(user.id, studentId));
    }

    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];

    // super_admin has no school_id — show platform-wide stats
    if (!primaryRole.school_id) {
      return Response.json(await getSuperAdminDashboard());
    }

    const dashData = await getAdminDashboard(primaryRole.school_id);
    return Response.json({ ...dashData, role: primaryRole.role_code });
  } catch (err) { return handleError(err); }
}
