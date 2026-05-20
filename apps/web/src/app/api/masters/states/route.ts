import { getUserFromRequest } from '@/lib/auth';
import { getStatesByCountry, getAllStates, addState, patchState } from '@/modules/masters/masters.service';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const { searchParams } = new URL(request.url);
    const countryId  = searchParams.get('countryId') ?? undefined;
    const activeOnly = searchParams.get('includeInactive') !== 'true';
    const states = countryId
      ? await getStatesByCountry(countryId, activeOnly)
      : await getAllStates(activeOnly);
    return Response.json({ states });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some((r) => r.role_code === 'super_admin')) throw new ForbiddenError('Super admin access required');
    const { countryId, name, code, sortOrder } = await request.json();
    return Response.json({ state: await addState(countryId, name, code, sortOrder) }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some((r) => r.role_code === 'super_admin')) throw new ForbiddenError('Super admin access required');
    const { id, ...data } = await request.json();
    return Response.json({ state: await patchState(id, data) });
  } catch (err) { return handleError(err); }
}
