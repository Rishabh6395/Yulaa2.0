import { getUserFromRequest } from '@/lib/auth';
import { processAction } from '@/modules/admission/admission.service';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';

const ADMIN_ROLES = ['super_admin', 'school_admin'];

/** POST /api/admission/applications/[id]/action — admin */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primaryRole.role_code)) throw new ForbiddenError();

    const body = await request.json();
    if (!body.action || !['approve', 'reject'].includes(body.action)) {
      throw new AppError('action must be "approve" or "reject"');
    }

    const result = await processAction({
      applicationId: params.id,
      actorUserId:   user.id,
      actorName:     `${user.first_name} ${user.last_name}`,
      action:        body.action,
      comment:       body.comment,
    });

    return Response.json(result);
  } catch (err) { return handleError(err); }
}
