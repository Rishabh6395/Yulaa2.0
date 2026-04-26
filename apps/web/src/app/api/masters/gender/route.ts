import { getUserFromRequest } from '@/lib/auth';
import { getGenderMasters, addGenderMaster, patchGenderMaster } from '@/modules/masters/masters.service';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const ADMIN_ROLES = ['super_admin', 'school_admin'];

const DEFAULT_GENDERS = ['Male', 'Female', 'Other'];

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
    const schoolId  = getSchoolId(user, searchParams.get('schoolId') ?? undefined);
    const activeOnly = searchParams.get('includeInactive') !== 'true';

    // Auto-seed: check total count (ignore active filter) so we don't re-seed when items are merely inactive
    const total = await getGenderMasters(schoolId, false);
    if (total.length === 0) {
      await Promise.all(
        DEFAULT_GENDERS.map((name, i) => addGenderMaster(schoolId, name, i).catch(() => null))
      );
    }

    const items = await getGenderMasters(schoolId, activeOnly);
    return Response.json({ genderMasters: items });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some((r) => ADMIN_ROLES.includes(r.role_code))) throw new ForbiddenError('Admin access required');
    const { schoolId: bodySchoolId, name, sortOrder } = await request.json();
    const schoolId = getSchoolId(user, bodySchoolId);
    return Response.json({ genderMaster: await addGenderMaster(schoolId, name, sortOrder) }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some((r) => ADMIN_ROLES.includes(r.role_code))) throw new ForbiddenError('Admin access required');
    const { id, ...data } = await request.json();
    if (!id) throw new AppError('id is required', 400);
    const schoolId = getSchoolId(user);
    const record = await prisma.genderMaster.findUnique({ where: { id }, select: { schoolId: true } });
    if (!record) throw new AppError('Record not found', 404);
    if (record.schoolId !== schoolId) throw new ForbiddenError();
    return Response.json({ genderMaster: await patchGenderMaster(id, data) });
  } catch (err) { return handleError(err); }
}
