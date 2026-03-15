import { getUserFromRequest } from '@/lib/auth';
import { listUsers, listRoles, createUser, assignRole, removeRole, setUserStatus } from '@/modules/super-admin/super-admin.service';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';

function assertSuperAdmin(user: Awaited<ReturnType<typeof getUserFromRequest>>) {
  if (!user) throw new UnauthorizedError();
  if (!user.roles.some((r) => r.role_code === 'super_admin')) throw new ForbiddenError();
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    assertSuperAdmin(user);
    const { searchParams } = new URL(request.url);
    return Response.json(searchParams.get('roles') === '1' ? await listRoles() : await listUsers());
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user    = await getUserFromRequest(request);
    assertSuperAdmin(user);
    const newUser = await createUser(await request.json());
    return Response.json({ user: newUser }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    assertSuperAdmin(user);
    const body = await request.json();
    const { userId, status, removeRoleId, roleId, schoolId } = body;

    if (!userId) throw new ForbiddenError('userId is required');

    if (status)       return Response.json({ user:     await setUserStatus(userId, status) });
    if (removeRoleId) return Response.json({ success:  !!(await removeRole(userId, removeRoleId)) });
    const userRole    = await assignRole({ userId, roleId, schoolId });
    return Response.json({ userRole }, { status: 201 });
  } catch (err) { return handleError(err); }
}
