import { CORE_ADMIN_ROLES as ADMIN_ROLES } from '@/lib/roles';
import { getUserFromRequest } from '@/lib/auth';
import { getContentTypes, addContentType, patchContentType, deleteContentType } from '@/modules/masters/masters.service';
import { handleError, UnauthorizedError, ForbiddenError, AppError, NotFoundError } from '@/utils/errors';


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
    const formName   = searchParams.get('formName') ?? undefined;
    const activeOnly = searchParams.get('includeInactive') !== 'true';
    return Response.json({ contentTypes: await getContentTypes(schoolId, formName, activeOnly) });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some((r) => ADMIN_ROLES.includes(r.role_code))) throw new ForbiddenError('Admin access required');
    const { schoolId: bodySchoolId, ...data } = await request.json();
    const schoolId = getSchoolId(user, bodySchoolId);
    return Response.json({ contentType: await addContentType(schoolId, data) }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some((r) => ADMIN_ROLES.includes(r.role_code))) throw new ForbiddenError('Admin access required');
    const { id, ...data } = await request.json();
    if (!id) throw new AppError('id is required', 400);
    return Response.json({ contentType: await patchContentType(id, data) });
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some((r) => ADMIN_ROLES.includes(r.role_code))) throw new ForbiddenError('Admin access required');
    const { id } = await request.json();
    if (!id) throw new AppError('id is required', 400);
    await deleteContentType(id);
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
