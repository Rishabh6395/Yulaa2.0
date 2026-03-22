import { getUserFromRequest } from '@/lib/auth';
import { listTeachers, createTeacher, toggleTeacherStatus } from '@/modules/teachers/teacher.service';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';

function assertSuperAdmin(user: any) {
  if (!user) throw new UnauthorizedError();
  if (!user.roles.some((r: any) => r.role_code === 'super_admin')) throw new ForbiddenError();
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    assertSuperAdmin(user);
    return Response.json({ teachers: await listTeachers(params.id) });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    assertSuperAdmin(user);
    const teacher = await createTeacher(params.id, await request.json());
    return Response.json({ teacher }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    assertSuperAdmin(user);
    const { id, status } = await request.json();
    const teacher = await toggleTeacherStatus(id, status);
    return Response.json({ teacher });
  } catch (err) { return handleError(err); }
}
