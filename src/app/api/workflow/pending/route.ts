/**
 * GET /api/workflow/pending
 * Returns items pending the current user's action in admission and leave workflows.
 * Used to render dashboard approval cards.
 */

import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError } from '@/utils/errors';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const primary  = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const roleCode = primary.role_code as string;
    const schoolId = primary.school_id as string | null;

    if (!schoolId) return Response.json({ admissions: [], leaves: [] });

    // ── Pending admissions where this role is the current step's approver ──────
    const wf = await prisma.admissionWorkflow.findFirst({
      where:   { schoolId, isActive: true },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });

    let admissions: any[] = [];
    if (wf) {
      // Get all under_review / submitted applications
      const apps = await prisma.admissionApplication.findMany({
        where:   { schoolId, status: { in: ['submitted', 'under_review'] } },
        include: { children: true },
        orderBy: { submittedAt: 'desc' },
      });

      admissions = apps
        .filter(app => {
          const step = wf.steps.find(s => s.stepOrder === app.currentStep);
          return step?.approverRole === roleCode;
        })
        .map(app => ({
          id:           app.id,
          type:         'admission',
          title:        'Admission Approval Pending',
          subtitle:     `${app.parentName} · ${app.children.length} child${app.children.length !== 1 ? 'ren' : ''}`,
          detail:       app.children.map((c: any) => `${c.firstName} ${c.lastName} → ${c.classApplying}`).join(', '),
          status:       app.status,
          currentStep:  app.currentStep,
          totalSteps:   wf.steps.length,
          stepLabel:    wf.steps.find(s => s.stepOrder === app.currentStep)?.label ?? '',
          submittedAt:  app.submittedAt,
          parentPhone:  app.parentPhone,
          parentEmail:  app.parentEmail,
        }));
    }

    // ── Pending leave requests where this role is the current step's approver ──
    const leaveWf = await prisma.leaveWorkflow.findFirst({
      where:   { schoolId, type: roleCode },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });

    // Also check workflows where this role is any approver (for intermediate steps)
    const allLeaveWfs = await prisma.leaveWorkflow.findMany({
      where:   { schoolId },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });

    const pendingLeaveRequests = await prisma.leaveRequest.findMany({
      where:   { schoolId, status: 'pending' },
      include: { user: true, student: true },
      orderBy: { createdAt: 'desc' },
    });

    const leaves = pendingLeaveRequests
      .filter(lr => {
        // Find the workflow for this leave's role
        const lrWf = allLeaveWfs.find(w => w.type === lr.roleCode);
        if (!lrWf) {
          // No workflow configured: any admin/teacher can approve
          return ['school_admin', 'principal', 'hod', 'teacher'].includes(roleCode);
        }
        const step = lrWf.steps.find(s => s.stepOrder === lr.currentStep);
        return step?.approverRole === roleCode;
      })
      .map(lr => ({
        id:          lr.id,
        type:        'leave',
        title:       'Leave Approval Pending',
        subtitle:    `${lr.user.firstName} ${lr.user.lastName} · ${lr.leaveType}`,
        detail:      `${new Date(lr.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${new Date(lr.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · ${lr.reason}`,
        status:      lr.status,
        currentStep: lr.currentStep,
        roleCode:    lr.roleCode,
        studentName: lr.student ? `${lr.student.firstName} ${lr.student.lastName}` : null,
        createdAt:   lr.createdAt,
      }));

    return Response.json({ admissions, leaves });
  } catch (err) { return handleError(err); }
}
