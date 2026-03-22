import { getUserFromRequest } from '@/lib/auth';
import { listLeaveRequests, submitLeaveRequest, reviewLeaveStep } from '@/modules/leave/leave.service';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';

const ADMIN_ROLES    = ['super_admin', 'school_admin', 'principal', 'hod'];
const REVIEWER_ROLES = [...ADMIN_ROLES, 'teacher']; // teachers can review parent leaves in some workflows

export async function GET(request: Request) {
  try {
    const user        = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const isAdmin     = ADMIN_ROLES.includes(primaryRole.role_code);
    return Response.json(
      await listLeaveRequests(primaryRole.school_id!, user.id, primaryRole.role_code, isAdmin),
    );
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user        = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const leave       = await submitLeaveRequest(primaryRole.school_id!, user.id, primaryRole.role_code, await request.json());
    return Response.json({ leave }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user        = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!REVIEWER_ROLES.includes(primaryRole.role_code)) throw new ForbiddenError('Not authorised to review leaves');
    const leave = await reviewLeaveStep(user.id, primaryRole.school_id!, primaryRole.role_code, await request.json());
    return Response.json({ leave });
  } catch (err) { return handleError(err); }
}
