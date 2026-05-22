/**
 * POST /api/tasks/reassign
 * Body: { assignedToId, fromUserId?, note? }
 *
 * Bulk-reassigns all pending admission tasks from the current user
 * (or from `fromUserId` if the actor is super_admin) to `assignedToId`.
 *
 * Allowed actors: principal, teacher, hod, super_admin.
 * super_admin can reassign from any user (pass `fromUserId`).
 * Other roles can only reassign their own tasks (fromUserId is ignored).
 *
 * GET /api/tasks/reassign?applicationId=...
 * Returns reassignment history for an application (or all if no applicationId).
 */

import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const REASSIGN_ROLES = ['principal', 'teacher', 'hod', 'super_admin', 'school_admin'];

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const primary  = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const roleCode = primary.role_code as string;
    const schoolId = primary.school_id as string | null;

    if (!REASSIGN_ROLES.includes(roleCode)) throw new ForbiddenError('Your role cannot reassign tasks');

    const { assignedToId, fromUserId, note } = await request.json();
    if (!assignedToId) throw new AppError('assignedToId is required', 400);

    // Determine whose tasks to reassign
    let sourceUserId: string;
    if (roleCode === 'super_admin' && fromUserId) {
      sourceUserId = fromUserId;
    } else {
      sourceUserId = user.id;
    }

    // Verify the target user belongs to the same school (or any school for super_admin)
    if (roleCode !== 'super_admin') {
      if (!schoolId) throw new ForbiddenError('No school associated with your account');
      const targetBelongs = await prisma.userRole.findFirst({
        where: { userId: assignedToId, schoolId },
      });
      if (!targetBelongs) throw new AppError('Target user does not belong to your school', 400);
    }

    // Find all pending admission applications where sourceUserId is assigned to the current step
    // via AdmissionStepAssignment OR is the step's approverRole match.
    // We create new assignments to override the current one.

    // Get all active (under_review / submitted) applications in the relevant school(s)
    const whereClause: any = { status: { in: ['submitted', 'under_review'] } };
    if (roleCode !== 'super_admin') whereClause.schoolId = schoolId!;

    const apps = await prisma.admissionApplication.findMany({
      where:   whereClause,
      include: { workflow: { include: { steps: { orderBy: { stepOrder: 'asc' } } } } },
    });

    // Filter to applications where the sourceUserId is currently responsible:
    // either they have an active step assignment, or their role matches the current step's approverRole
    const userRoleCodes = (sourceUserId === user.id ? [roleCode] : await prisma.userRole.findMany({
      where:  { userId: sourceUserId },
      select: { role: { select: { code: true } } },
    }).then(rs => rs.map(r => r.role.code)));

    const toReassign = apps.filter(app => {
      const step = app.workflow?.steps.find(s => s.stepOrder === app.currentStep);
      if (!step) return false;
      return userRoleCodes.includes(step.approverRole);
    });

    if (toReassign.length === 0) {
      return Response.json({ message: 'No pending tasks found to reassign', count: 0 });
    }

    // Create bulk reassignment records
    const assignments = await Promise.all(
      toReassign.map(app =>
        prisma.admissionStepAssignment.create({
          data: {
            applicationId: app.id,
            stepOrder:     app.currentStep,
            assignedToId,
            assignedById:  user.id,
            note:          note ?? `Bulk reassignment by ${roleCode}`,
          },
        })
      )
    );

    return Response.json({ count: assignments.length, message: `${assignments.length} task(s) reassigned successfully` }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const primary  = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const roleCode = primary.role_code as string;
    const schoolId = primary.school_id as string | null;

    if (!REASSIGN_ROLES.includes(roleCode)) throw new ForbiddenError();

    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('applicationId');

    const where: any = applicationId ? { applicationId } : {};

    // Scope to school for non-super-admins
    if (roleCode !== 'super_admin' && schoolId) {
      where.application = { schoolId };
    }

    const assignments = await prisma.admissionStepAssignment.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignedBy: { select: { id: true, firstName: true, lastName: true } },
        application: { select: { parentName: true, schoolId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take:    200,
    });

    return Response.json({ assignments });
  } catch (err) { return handleError(err); }
}
