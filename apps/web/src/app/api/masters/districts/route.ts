import { getUserFromRequest } from '@/lib/auth';
import { getDistrictsByState, getAllDistricts, addDistrict, patchDistrict } from '@/modules/masters/masters.service';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const { searchParams } = new URL(request.url);
    const stateId    = searchParams.get('stateId') ?? undefined;
    const activeOnly = searchParams.get('includeInactive') !== 'true';
    const districts = stateId
      ? await getDistrictsByState(stateId, activeOnly)
      : await getAllDistricts(activeOnly);
    return Response.json({ districts });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some((r) => r.role_code === 'super_admin')) throw new ForbiddenError('Super admin access required');
    const { stateId, name, sortOrder } = await request.json();
    return Response.json({ district: await addDistrict(stateId, name, sortOrder) }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some((r) => r.role_code === 'super_admin')) throw new ForbiddenError('Super admin access required');
    const { id, ...data } = await request.json();
    return Response.json({ district: await patchDistrict(id, data) });
  } catch (err) { return handleError(err); }
}
