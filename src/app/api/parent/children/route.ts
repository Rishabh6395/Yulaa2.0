import { getUserFromRequest } from '@/lib/auth';
import { getChildren } from '@/modules/parent/parent.service';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';

export async function GET(request: Request) {
  try {
    const user     = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some((r) => r.role_code === 'parent')) throw new ForbiddenError();
    return Response.json(await getChildren(user.id));
  } catch (err) { return handleError(err); }
}
