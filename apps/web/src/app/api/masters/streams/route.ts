import { getUserFromRequest } from '@/lib/auth';
import { getStreamMasters, addStreamMaster, patchStreamMaster } from '@/modules/masters/masters.service';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';

const ADMIN_ROLES = ['super_admin', 'school_admin'];

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
    const schoolId    = getSchoolId(user, searchParams.get('schoolId') ?? undefined);
    const activeOnly  = searchParams.get('includeInactive') !== 'true';
    const classId     = searchParams.get('classId') ?? undefined;
    return Response.json({ streamMasters: await getStreamMasters(schoolId, activeOnly, classId) });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some((r) => ADMIN_ROLES.includes(r.role_code))) throw new ForbiddenError('Admin access required');
    const { schoolId: bodySchoolId, name, sortOrder, classId } = await request.json();
    if (!name?.trim()) throw new AppError('Subject name is required');
    if (!classId)      throw new AppError('Class is required');
    const schoolId = getSchoolId(user, bodySchoolId);
    return Response.json({ streamMaster: await addStreamMaster(schoolId, name, sortOrder, classId) }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some((r) => ADMIN_ROLES.includes(r.role_code))) throw new ForbiddenError('Admin access required');
    const { id, ...data } = await request.json();
    if (!id) throw new AppError('id is required');
    return Response.json({ streamMaster: await patchStreamMaster(id, data) });
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some((r) => ADMIN_ROLES.includes(r.role_code))) throw new ForbiddenError('Admin access required');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) throw new AppError('id is required');
    const { default: prisma } = await import('@/lib/prisma');
    await prisma.streamMaster.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
