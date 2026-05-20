import { getUserFromRequest } from '@/lib/auth';
import { getCountries, addCountry, patchCountry } from '@/modules/masters/masters.service';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('includeInactive') !== 'true';
    return Response.json({ countries: await getCountries(activeOnly) });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some((r) => r.role_code === 'super_admin')) throw new ForbiddenError('Super admin access required');
    const { name, code, sortOrder } = await request.json();
    return Response.json({ country: await addCountry(name, code, sortOrder) }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some((r) => r.role_code === 'super_admin')) throw new ForbiddenError('Super admin access required');
    const { id, ...data } = await request.json();
    return Response.json({ country: await patchCountry(id, data) });
  } catch (err) { return handleError(err); }
}
