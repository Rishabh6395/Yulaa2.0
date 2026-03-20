import { getUserFromRequest } from '@/lib/auth';
import { getWorkflow, saveWorkflow } from '@/modules/admission/admission.service';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';

const ADMIN_ROLES = ['super_admin', 'school_admin'];

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primaryRole.role_code)) throw new ForbiddenError();
    const workflow = await getWorkflow(primaryRole.school_id!);
    return Response.json({ workflow });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primaryRole.role_code)) throw new ForbiddenError();
    const body     = await request.json();
    const workflow = await saveWorkflow({ ...body, schoolId: primaryRole.school_id! });
    return Response.json({ workflow }, { status: 201 });
  } catch (err) { return handleError(err); }
}
