import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, AppError } from '@/utils/errors';
import { listSlaPolicies, upsertSlaPolicy } from '@/modules/queries/query.service';

function isSuperAdmin(user: any) {
  const role = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  return role.role_code === 'super_admin';
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const policies = await listSlaPolicies();
    return Response.json({ policies });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || !isSuperAdmin(user)) throw new UnauthorizedError();
    const { priority, response_hours, resolution_hours } = await request.json();
    if (!priority) throw new AppError('priority is required');
    const policy = await upsertSlaPolicy(priority, Number(response_hours) || 24, Number(resolution_hours) || 72);
    return Response.json({ policy });
  } catch (err) { return handleError(err); }
}
