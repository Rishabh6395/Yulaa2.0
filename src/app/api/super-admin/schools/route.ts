import { getUserFromRequest } from '@/lib/auth';
import { listSchools, createSchool, updateSchool } from '@/modules/super-admin/super-admin.service';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';

function assertSuperAdmin(user: Awaited<ReturnType<typeof getUserFromRequest>>) {
  if (!user) throw new UnauthorizedError();
  if (!user.roles.some((r) => r.role_code === 'super_admin')) throw new ForbiddenError();
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    assertSuperAdmin(user);
    return Response.json(await listSchools());
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    assertSuperAdmin(user);
    const school = await createSchool(await request.json());
    return Response.json({ school }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    assertSuperAdmin(user);
    const school = await updateSchool(await request.json());
    return Response.json({ school });
  } catch (err) { return handleError(err); }
}
