import { getUserFromRequest } from '@/lib/auth';
import { getAdminDashboard, getParentDashboard } from '@/modules/dashboard/dashboard.service';
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
    return Response.json(await getAdminDashboard(primaryRole.school_id!));
  } catch (err) { return handleError(err); }
}
