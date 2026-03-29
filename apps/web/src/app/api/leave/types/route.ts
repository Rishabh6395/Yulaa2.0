import { getUserFromRequest } from '@/lib/auth';
import { getLeaveTypesForRole } from '@/modules/leave/leave.service';
import { handleError, UnauthorizedError } from '@/utils/errors';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const types = await getLeaveTypesForRole(primaryRole.school_id!, primaryRole.role_code);
    return Response.json({ types });
  } catch (err) { return handleError(err); }
}
