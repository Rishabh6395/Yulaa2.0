import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError } from '@/utils/errors';
import { listQueries, submitQuery, addReply, resolveQuery, reopenQuery } from '@/modules/queries/query.service';

function primaryRole(user: any) {
  return user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const role = primaryRole(user);
    return Response.json(await listQueries(role.school_id!, user.id, role.role_code));
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const role  = primaryRole(user);
    const query = await submitQuery(role.school_id!, user.id, role.role_code, await request.json());
    return Response.json({ query }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const role = primaryRole(user);
    const body = await request.json();
    const { action, id } = body;

    if (action === 'reply') {
      const reply = await addReply(user.id, role.role_code, body);
      return Response.json({ reply });
    }
    if (action === 'resolve') {
      await resolveQuery(user.id, id);
      return Response.json({ ok: true });
    }
    if (action === 'reopen') {
      await reopenQuery(user.id, id);
      return Response.json({ ok: true });
    }
    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) { return handleError(err); }
}
