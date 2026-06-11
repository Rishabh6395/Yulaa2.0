import { MANAGEMENT_ROLES as ADMIN_ROLES, REVIEWER_ROLES, EMPLOYEE_ROLES } from '@/lib/roles';
import { getUserFromRequest } from '@/lib/auth';
import { listLeaveRequests, submitLeaveRequest, reviewLeaveStep, withdrawLeave, deleteLeave } from '@/modules/leave/leave.service';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import { assertParentOwnsStudent, getStudentSchoolId } from '@/lib/school-utils';

// For self-service (submitting leave), prefer the employee role if the user has one
// in the same school — lets teachers/principals operate under a unified employee identity.
function resolveLeaveRole(user: any) {
  const primary      = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  const employeeRole = user.roles.find((r: any) => r.role_code === 'employee' && r.school_id === primary.school_id);
  return employeeRole ?? primary;
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary   = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const canSeeAll = ADMIN_ROLES.includes(primary.role_code) || primary.role_code === 'hod';
    const role      = resolveLeaveRole(user);
    const { searchParams } = new URL(request.url);

    let schoolId: string | null = role.school_id ?? null;
    let studentId: string | null = null;

    if (!schoolId) {
      // Parent role — must supply a child_id; ownership is verified before use
      studentId = searchParams.get('child_id');
      if (!studentId) return Response.json({ leaves: [], workflows: {} });
      await assertParentOwnsStudent(user.id, studentId);
      schoolId = await getStudentSchoolId(studentId);
    }

    return Response.json(
      await listLeaveRequests(schoolId, user.id, role.role_code, canSeeAll, studentId),
    );
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const role = resolveLeaveRole(user);
    const body = await request.json();

    let schoolId: string | null = role.school_id ?? null;

    if (body.student_id) {
      // Verify parent actually owns the child they are applying for
      if (role.role_code === 'parent') {
        await assertParentOwnsStudent(user.id, body.student_id);
      }
      schoolId = await getStudentSchoolId(body.student_id);
    }

    if (!schoolId) throw new AppError('Cannot determine school — please select a child or contact support', 400);

    const leave = await submitLeaveRequest(schoolId, user.id, role.role_code, body);
    return Response.json({ leave }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError('Only admins can delete leave records');
    if (!primary.school_id) throw new ForbiddenError('No school associated with your account');
    const { id } = await request.json();
    if (!id) throw new AppError('id is required');
    return Response.json(await deleteLeave(primary.school_id, id));
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user    = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const body    = await request.json();

    if (body.action === 'withdraw') {
      // Only roles that can hold leave records can withdraw them — blocks vendor/consultant callers.
      // The service further enforces userId ownership so users can only withdraw their own leaves.
      const WITHDRAW_ROLES = [...EMPLOYEE_ROLES, 'parent', 'student'];
      if (!WITHDRAW_ROLES.includes(primary.role_code)) throw new ForbiddenError('Not authorised to withdraw leave');
      return Response.json(await withdrawLeave(user.id, body.id));
    }

    if (!REVIEWER_ROLES.includes(primary.role_code)) throw new ForbiddenError('Not authorised to review leaves');
    if (!primary.school_id) throw new ForbiddenError('No school associated with your account');

    // Bulk review: { action: 'bulk_approved'|'bulk_rejected', ids: string[], comment?: string }
    if (body.action === 'bulk_approved' || body.action === 'bulk_rejected') {
      if (!Array.isArray(body.ids) || body.ids.length === 0) throw new AppError('ids[] required for bulk action');
      const singleAction = body.action === 'bulk_approved' ? 'approved' : 'rejected';
      const results: { id: string; status: string; error?: string }[] = [];
      for (const id of body.ids as string[]) {
        try {
          const l = await reviewLeaveStep(user.id, primary.school_id, primary.role_code, { id, action: singleAction, comment: body.comment });
          results.push({ id, status: l.status });
        } catch (e: any) {
          results.push({ id, status: 'error', error: e.message ?? 'failed' });
        }
      }
      return Response.json({ results, processed: results.length, errors: results.filter(r => r.status === 'error').length });
    }

    const leave = await reviewLeaveStep(user.id, primary.school_id, primary.role_code, body);
    return Response.json({ leave });
  } catch (err) { return handleError(err); }
}
