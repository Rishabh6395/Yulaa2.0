import { getUserFromRequest } from '@/lib/auth';
import { getSchoolLocations, addSchoolLocation, patchSchoolLocation } from '@/modules/masters/masters.service';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';

const ADMIN_ROLES = ['super_admin', 'school_admin'];

function getSchoolId(user: NonNullable<Awaited<ReturnType<typeof getUserFromRequest>>>, override?: string) {
  if (user.roles.some((r) => r.role_code === 'super_admin') && override) return override;
  return (user.roles.find((r) => r.is_primary) ?? user.roles[0])?.school_id!;
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const { searchParams } = new URL(request.url);
    const schoolId = getSchoolId(user, searchParams.get('schoolId') ?? undefined);
    return Response.json({ locations: await getSchoolLocations(schoolId) });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some((r) => ADMIN_ROLES.includes(r.role_code))) throw new ForbiddenError('Admin access required');
    const { schoolId: bodySchoolId, ...data } = await request.json();
    const schoolId = getSchoolId(user, bodySchoolId);
    return Response.json({ location: await addSchoolLocation(schoolId, data) }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some((r) => ADMIN_ROLES.includes(r.role_code))) throw new ForbiddenError('Admin access required');
    const { id, ...data } = await request.json();
    return Response.json({ location: await patchSchoolLocation(id, data) });
  } catch (err) { return handleError(err); }
}
