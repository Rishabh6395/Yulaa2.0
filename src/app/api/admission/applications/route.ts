import { getUserFromRequest } from '@/lib/auth';
import { listApplications } from '@/modules/admission/admission.service';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';

const ADMIN_ROLES = ['super_admin', 'school_admin'];

/** GET /api/admission/applications — admin */
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primaryRole.role_code)) throw new ForbiddenError();
    if (!primaryRole.school_id) throw new ForbiddenError('No school associated');

    const { searchParams } = new URL(request.url);
    const result = await listApplications(primaryRole.school_id, searchParams);
    return Response.json(result);
  } catch (err) { return handleError(err); }
}
