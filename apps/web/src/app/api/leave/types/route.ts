import { getUserFromRequest } from '@/lib/auth';
import { getLeaveTypesForRole } from '@/modules/leave/leave.service';
import { handleError, UnauthorizedError } from '@/utils/errors';
import { assertParentOwnsStudent, getStudentSchoolId } from '@/lib/school-utils';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const { searchParams } = new URL(request.url);

    let schoolId: string | null = primaryRole.school_id ?? null;
    const childId = searchParams.get('child_id');

    // For parents: derive leave types from the selected child's school, not the parent's role school
    if (childId && primaryRole.role_code === 'parent') {
      await assertParentOwnsStudent(user.id, childId);
      schoolId = await getStudentSchoolId(childId);
    }

    const { types, configured } = await getLeaveTypesForRole(schoolId, primaryRole.role_code);
    return Response.json({ types, configured });
  } catch (err) { return handleError(err); }
}
