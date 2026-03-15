import { getUserFromRequest } from '@/lib/auth';
import { listQueries, submitQuery, respondToQuery } from '@/modules/queries/query.service';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';

export async function GET(request: Request) {
  try {
    const user        = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    return Response.json(await listQueries(primaryRole.school_id!));
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user        = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const query       = await submitQuery(primaryRole.school_id!, user.id, await request.json());
    return Response.json({ query }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user        = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!['super_admin', 'school_admin', 'teacher'].includes(primaryRole.role_code)) {
      throw new ForbiddenError('Admin or teacher access required');
    }
    const query = await respondToQuery(user.id, await request.json());
    return Response.json({ query });
  } catch (err) { return handleError(err); }
}
