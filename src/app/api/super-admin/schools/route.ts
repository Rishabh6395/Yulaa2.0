import { getUserFromRequest } from '@/lib/auth';
import { listSchools, createSchool, updateSchool, setDefaultSchool, getSchoolById } from '@/modules/super-admin/super-admin.service';
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
    const id = searchParams.get('id');
    if (id) return Response.json(await getSchoolById(id));
    return Response.json(await listSchools());
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user   = await getUserFromRequest(request);
    assertSuperAdmin(user);
    const school = await createSchool(await request.json());
    return Response.json({ school }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    assertSuperAdmin(user);
    const body = await request.json();
    if (body.action === 'setDefault') {
      return Response.json(await setDefaultSchool(body.id));
    }
    const school = await updateSchool(body);
    return Response.json({ school });
  } catch (err) { return handleError(err); }
}
