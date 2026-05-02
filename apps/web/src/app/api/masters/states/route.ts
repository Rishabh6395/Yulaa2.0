import { CORE_ADMIN_ROLES as ADMIN_ROLES } from '@/lib/roles';
import { getUserFromRequest } from '@/lib/auth';
import { getStatesByCountry, getAllStates, addState, patchState } from '@/modules/masters/masters.service';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';


function getSchoolId(user: NonNullable<Awaited<ReturnType<typeof getUserFromRequest>>>, override?: string) {
  if (user.roles.some((r) => r.role_code === 'super_admin') && override) return override;
  const schoolId = (user.roles.find((r) => r.is_primary) ?? user.roles[0])?.school_id;
  if (!schoolId) throw new AppError('schoolId is required — open Masters from a school configuration page', 400);
  return schoolId;
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const { searchParams } = new URL(request.url);
    const schoolId = getSchoolId(user, searchParams.get('schoolId') ?? undefined);
    const countryId  = searchParams.get('countryId') ?? undefined;
    const activeOnly = searchParams.get('includeInactive') !== 'true';
    const states = countryId
      ? await getStatesByCountry(schoolId, countryId, activeOnly)
      : await getAllStates(schoolId, activeOnly);
    return Response.json({ states });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some((r) => ADMIN_ROLES.includes(r.role_code))) throw new ForbiddenError('Admin access required');
    const { schoolId: bodySchoolId, countryId, name, code, sortOrder } = await request.json();
    const schoolId = getSchoolId(user, bodySchoolId);
    return Response.json({ state: await addState(schoolId, countryId, name, code, sortOrder) }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some((r) => ADMIN_ROLES.includes(r.role_code))) throw new ForbiddenError('Admin access required');
    const { id, ...data } = await request.json();
    return Response.json({ state: await patchState(id, data) });
  } catch (err) { return handleError(err); }
}
