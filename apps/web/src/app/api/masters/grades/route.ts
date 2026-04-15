import { getUserFromRequest } from '@/lib/auth';
import { getGradeMasters, addGradeMaster, patchGradeMaster } from '@/modules/masters/masters.service';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';

const ADMIN_ROLES = ['super_admin', 'school_admin'];

// Default grades seeded automatically the first time a school views the Grades master page
const DEFAULT_GRADES = [
  'Nursery', 'LKG', 'UKG',
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5',
  'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10',
  'Grade 11', 'Grade 12',
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
    const schoolId   = getSchoolId(user, searchParams.get('schoolId') ?? undefined);
    const activeOnly = searchParams.get('includeInactive') !== 'true';

    // Auto-seed: check total count (ignore active filter) so we don't re-seed when items are merely inactive
    const total = await getGradeMasters(schoolId, false);
    if (total.length === 0) {
      await Promise.all(
        DEFAULT_GRADES.map((name, i) => addGradeMaster(schoolId, name, i).catch(() => null))
      );
    }

    const grades = await getGradeMasters(schoolId, activeOnly);
    return Response.json({ gradeMasters: grades });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some((r) => ADMIN_ROLES.includes(r.role_code))) throw new ForbiddenError('Admin access required');
    const { schoolId: bodySchoolId, name, sortOrder } = await request.json();
    const schoolId = getSchoolId(user, bodySchoolId);
    return Response.json({ gradeMaster: await addGradeMaster(schoolId, name, sortOrder) }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some((r) => ADMIN_ROLES.includes(r.role_code))) throw new ForbiddenError('Admin access required');
    const { id, ...data } = await request.json();
    return Response.json({ gradeMaster: await patchGradeMaster(id, data) });
  } catch (err) { return handleError(err); }
}
