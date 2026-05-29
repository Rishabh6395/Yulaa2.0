import { getUserFromRequest } from '@/lib/auth';
import { listStudents, createStudent, updateStudent } from '@/modules/students/student.service';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';

function assertSuperAdmin(user: any) {
  if (!user) throw new UnauthorizedError();
  const primary = (user.roles as any[]).find((r) => r.is_primary) ?? user.roles[0];
  if (primary.role_code !== 'super_admin') throw new ForbiddenError();
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request);
    assertSuperAdmin(user);
    const { searchParams } = new URL(request.url);
    return Response.json(await listStudents((await params).id, searchParams));
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request);
    assertSuperAdmin(user);
    const student = await createStudent((await params).id, await request.json());
    return Response.json({ student }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request);
    assertSuperAdmin(user);
    const schoolId = (await params).id;
    const student = await updateStudent(schoolId, await request.json());
    return Response.json({ student });
  } catch (err) { return handleError(err); }
}
