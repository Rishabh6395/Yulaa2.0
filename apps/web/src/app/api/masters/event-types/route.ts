import { getUserFromRequest } from '@/lib/auth';
import { getEventTypeMasters, addEventTypeMaster, patchEventTypeMaster } from '@/modules/masters/masters.service';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';

const ADMIN_ROLES = ['super_admin', 'school_admin'];

const DEFAULT_EVENT_TYPES = [
  { name: 'Academic',   code: 'academic' },
  { name: 'Cultural',   code: 'cultural' },
  { name: 'Sports',     code: 'sports' },
  { name: 'Annual Day', code: 'annual_day' },
  { name: 'Trip',       code: 'trip' },
  { name: 'Workshop',   code: 'workshop' },
  { name: 'Other',      code: 'other' },
];

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

    let items = await getEventTypeMasters(schoolId);

    // Auto-seed defaults on first use
    if (items.length === 0) {
      await Promise.all(
        DEFAULT_EVENT_TYPES.map((et, i) => addEventTypeMaster(schoolId, et.name, et.code, i).catch(() => null))
      );
      items = await getEventTypeMasters(schoolId);
    }

    return Response.json({ eventTypeMasters: items });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some((r) => ADMIN_ROLES.includes(r.role_code))) throw new ForbiddenError('Admin access required');
    const { schoolId: bodySchoolId, name, code, sortOrder } = await request.json();
    const schoolId = getSchoolId(user, bodySchoolId);
    return Response.json({ eventTypeMaster: await addEventTypeMaster(schoolId, name, code, sortOrder) }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some((r) => ADMIN_ROLES.includes(r.role_code))) throw new ForbiddenError('Admin access required');
    const { id, ...data } = await request.json();
    return Response.json({ eventTypeMaster: await patchEventTypeMaster(id, data) });
  } catch (err) { return handleError(err); }
}
