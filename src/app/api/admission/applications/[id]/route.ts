import { getUserFromRequest } from '@/lib/auth';
import { getApplicationDetail } from '@/modules/admission/admission.service';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';

const ADMIN_ROLES = ['super_admin', 'school_admin'];

/** GET /api/admission/applications/[id] — admin */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(_request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primaryRole.role_code)) throw new ForbiddenError();

    const app = await getApplicationDetail(params.id);
    return Response.json({ application: app });
  } catch (err) { return handleError(err); }
}
