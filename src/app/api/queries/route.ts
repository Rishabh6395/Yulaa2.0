import { getUserFromRequest } from '@/lib/auth';
import { listQueries, submitQuery, respondToQuery, reopenQuery, confirmResolveQuery } from '@/modules/queries/query.service';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';

export async function GET(request: Request) {
  try {
    const user        = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    return Response.json(await listQueries(primaryRole.school_id!, user.id, primaryRole.role_code));
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
    const body        = await request.json();

    // Actions allowed for any authenticated user (submitter acts on their own query)
    if (body.action === 'reopen') {
      const query = await reopenQuery(body);
      return Response.json({ query });
    }
    if (body.action === 'confirm_resolve') {
      const query = await confirmResolveQuery(body);
      return Response.json({ query });
    }

    if (!['super_admin', 'school_admin', 'teacher'].includes(primaryRole.role_code)) {
      throw new ForbiddenError('Admin or teacher access required');
    }
    const query = await respondToQuery(user.id, body);
    return Response.json({ query });
  } catch (err) { return handleError(err); }
}
