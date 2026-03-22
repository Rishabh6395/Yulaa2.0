import { getUserFromRequest } from '@/lib/auth';
import { listClasses, createClass, updateClass } from '@/modules/classes/class.service';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';

function assertSuperAdmin(user: any) {
  if (!user) throw new UnauthorizedError();
  if (!user.roles.some((r: any) => r.role_code === 'super_admin')) throw new ForbiddenError();
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    assertSuperAdmin(user);
    return Response.json({ classes: await listClasses(params.id) });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    assertSuperAdmin(user);
    const cls = await createClass(params.id, await request.json());
    return Response.json({ class: cls }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    assertSuperAdmin(user);
    const cls = await updateClass(await request.json());
    return Response.json({ class: cls });
  } catch (err) { return handleError(err); }
}
