import { getUserFromRequest } from '@/lib/auth';
import { listStudents, createStudent, updateStudent, createAndLinkParent } from '@/modules/students/student.service';
import { handleError, UnauthorizedError } from '@/utils/errors';

async function getUser(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) throw new UnauthorizedError();
  return user;
}

export async function GET(request: Request) {
  try {
    const user        = await getUser(request);
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const { searchParams } = new URL(request.url);
    return Response.json(await listStudents(primaryRole.school_id!, searchParams));
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user        = await getUser(request);
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const student     = await createStudent(primaryRole.school_id!, await request.json());
    return Response.json({ student }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user        = await getUser(request);
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const body        = await request.json();

    if (body.action === 'add_parent') {
      const { studentId, parent_name, parent_phone, parent_email } = body;
      if (!studentId || !parent_name || !parent_phone) {
        return Response.json({ error: 'studentId, parent_name, and parent_phone are required' }, { status: 400 });
      }
      await createAndLinkParent(primaryRole.school_id!, studentId, {
        name:  parent_name,
        phone: parent_phone,
        email: parent_email || null,
      });
      return Response.json({ ok: true });
    }

    const student = await updateStudent(body);
    return Response.json({ student });
  } catch (err) { return handleError(err); }
}
