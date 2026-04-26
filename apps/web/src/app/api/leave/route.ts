import { getUserFromRequest } from '@/lib/auth';
import { listLeaveRequests, submitLeaveRequest, reviewLeaveStep, withdrawLeave } from '@/modules/leave/leave.service';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const ADMIN_ROLES    = ['super_admin', 'school_admin', 'principal', 'hod'];
const REVIEWER_ROLES = [...ADMIN_ROLES, 'teacher'];

// For self-service (submitting leave), use the employee role if the user has it.
// This lets teachers/principals/school_admins operate under a unified employee identity.
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
    const canSeeAll = REVIEWER_ROLES.includes(primary.role_code);
    const role      = resolveLeaveRole(user);
    // Parents have no school_id in their role — query by userId across all schools
    const schoolId  = role.school_id ?? null;
    return Response.json(
      await listLeaveRequests(schoolId, user.id, role.role_code, canSeeAll),
    );
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const role = resolveLeaveRole(user);
    const body = await request.json();

    // When a parent applies leave for a child, use the child's school — not the parent's role
    let schoolId: string | null = role.school_id ?? null;
    if (body.student_id) {
      const student = await prisma.student.findUnique({
        where:  { id: body.student_id },
        select: { schoolId: true },
      });
      if (!student) throw new AppError('Student not found', 404);
      schoolId = student.schoolId;
    }
    if (!schoolId) throw new AppError('Cannot determine school — please select a child or contact support', 400);

    const leave = await submitLeaveRequest(schoolId, user.id, role.role_code, body);
    return Response.json({ leave }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user    = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const body    = await request.json();

    // Withdraw: allowed for any authenticated user on their own pending leave
    if (body.action === 'withdraw') {
      return Response.json(await withdrawLeave(user.id, body.id));
    }

    // Review uses primary role (admin/teacher capacity, not employee capacity)
    if (!REVIEWER_ROLES.includes(primary.role_code)) throw new ForbiddenError('Not authorised to review leaves');
    const leave = await reviewLeaveStep(user.id, primary.school_id!, primary.role_code, body);
    return Response.json({ leave });
  } catch (err) { return handleError(err); }
}
