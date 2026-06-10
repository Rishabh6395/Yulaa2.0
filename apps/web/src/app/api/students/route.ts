import { PRINCIPAL_ADMIN_ROLES } from '@/lib/roles';
import { getUserFromRequest } from '@/lib/auth';
import { listStudents, createStudent, updateStudent, createAndLinkParent } from '@/modules/students/student.service';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import { isTeacherAssignedToClass, getTeacherClassIds } from '@/lib/school-utils';

const STUDENT_READ_ROLES = ['super_admin', 'school_admin', 'principal', 'hod', 'teacher'];

async function getUser(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) throw new UnauthorizedError();
  return user;
}

export async function GET(request: Request) {
  try {
    const user        = await getUser(request);
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const { role_code: role, school_id: schoolId } = primaryRole;

    if (!STUDENT_READ_ROLES.includes(role)) throw new ForbiddenError();

    const { searchParams } = new URL(request.url);

    // super_admin has no school_id in their role — they pass ?schoolId= in the query.
    const effectiveSchoolId = schoolId ?? searchParams.get('schoolId');
    if (!effectiveSchoolId) throw new ForbiddenError('No school associated with your account');

    // Teachers are scoped to their assigned classes only (G-010).
    // They cannot enumerate the full school roster.
    if (role === 'teacher') {
      const requestedClassId = searchParams.get('class_id');

      if (requestedClassId) {
        // Verify teacher is actually assigned to the requested class.
        const assigned = await isTeacherAssignedToClass(user.id, effectiveSchoolId, requestedClassId);
        if (!assigned) throw new ForbiddenError('You are not assigned to this class');
      } else {
        // No class_id requested — return students from ALL the teacher's assigned classes.
        const classIds = await getTeacherClassIds(user.id, effectiveSchoolId);
        if (classIds.length === 0) {
          return Response.json({ students: [], total: 0, page: 1, limit: 20, totalPages: 0 });
        }
        // Pick the first assigned class as default; the client should pass class_id explicitly.
        searchParams.set('class_id', classIds[0]);
      }
    }

    return Response.json(await listStudents(effectiveSchoolId, searchParams));
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user        = await getUser(request);
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!PRINCIPAL_ADMIN_ROLES.includes(primaryRole.role_code)) throw new ForbiddenError('Admin access required');
    const student     = await createStudent(primaryRole.school_id!, await request.json());
    return Response.json({ student }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user        = await getUser(request);
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!PRINCIPAL_ADMIN_ROLES.includes(primaryRole.role_code)) throw new ForbiddenError('Admin access required');
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

    const student = await updateStudent(primaryRole.school_id!, body);
    return Response.json({ student });
  } catch (err) { return handleError(err); }
}
