import { CORE_ADMIN_ROLES } from '@/lib/roles';
import { getUserFromRequest } from '@/lib/auth';
import { updateComplianceItem, deleteComplianceItem } from '@/modules/compliance/compliance.service';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';


function getSchoolId(user: any): string {
  const role = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  return role.school_id;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some((r: any) => CORE_ADMIN_ROLES.includes(r.role_code))) throw new ForbiddenError();

    const { id } = await params;
    const schoolId = getSchoolId(user);
    const body     = await request.json();
    const item     = await updateComplianceItem(id, schoolId, user.id, body);
    return Response.json(item);
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some((r: any) => CORE_ADMIN_ROLES.includes(r.role_code))) throw new ForbiddenError();

    const { id } = await params;
    const schoolId = getSchoolId(user);
    await deleteComplianceItem(id, schoolId);
    return Response.json({ message: 'Deleted' });
  } catch (err) { return handleError(err); }
}
