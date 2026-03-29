import { getUserFromRequest } from '@/lib/auth';
import { listTeachers, createTeacher, toggleTeacherStatus } from '@/modules/teachers/teacher.service';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';

export async function GET(request: Request) {
  try {
    const user        = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    return Response.json({ teachers: await listTeachers(primaryRole.school_id!) });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user        = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!['super_admin', 'school_admin'].includes(primaryRole.role_code)) throw new ForbiddenError('Admin access required');
    const teacher     = await createTeacher(primaryRole.school_id!, await request.json());
    return Response.json({ teacher }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user        = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!['super_admin', 'school_admin'].includes(primaryRole.role_code)) throw new ForbiddenError('Admin access required');
    const { id, status } = await request.json();
    const teacher = await toggleTeacherStatus(id, status);
    return Response.json({ teacher });
  } catch (err) { return handleError(err); }
}
