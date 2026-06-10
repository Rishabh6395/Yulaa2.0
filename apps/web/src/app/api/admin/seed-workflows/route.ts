/**
 * POST /api/admin/seed-workflows
 *
 * Bootstraps all default workflow configurations for a school in a single call.
 * Idempotent — skips any workflow that already exists.
 *
 * Auth: school_admin | principal | super_admin
 * Body: { schoolId?: string }   (super_admin can target any school; others use JWT school)
 *
 * Returns:
 *   { seeded: { admissionWorkflow, leaveWorkflows, genericWorkflows } }
 *   Each value is "created" | "skipped"
 */

import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const ALLOWED_ROLES = ['super_admin', 'school_admin', 'principal'];

async function resolveSchoolId(user: any, bodySchoolId?: string): Promise<string> {
  const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  if (primary.role_code === 'super_admin') {
    if (bodySchoolId) return bodySchoolId;
    throw new AppError('super_admin must provide schoolId in request body', 400);
  }
  if (primary.school_id) return primary.school_id;
  throw new AppError('school_id could not be determined from token', 400);
}

// ── Default stage definitions ─────────────────────────────────────────────────

const ADMISSION_STEPS = [
  {
    stepOrder:      0,
    label:          'Admin Review',
    initiatorRole:  'parent',
    approverRole:   'school_admin',
    isFinal:        false,
    emailEnabled:   true,
    notifyEnabled:  true,
    notifyMessage:  'Your application is under review.',
    allowReassign:  true,
    paymentRequired: false,
    checklistItems: JSON.stringify([
      { label: 'Verify Documents',  type: 'yes_no',  actionRole: 'school_admin' },
      { label: 'Reviewer Remarks',  type: 'remarks', actionRole: 'school_admin' },
    ]),
  },
  {
    stepOrder:      1,
    label:          'Principal Approval',
    initiatorRole:  'school_admin',
    approverRole:   'principal',
    isFinal:        true,
    emailEnabled:   true,
    notifyEnabled:  true,
    notifyMessage:  'Congratulations! Your admission has been approved.',
    allowReassign:  false,
    paymentRequired: false,
    checklistItems: JSON.stringify([
      { label: 'Assign Class & Section', type: 'class_section', actionRole: 'principal' },
    ]),
  },
];

// Leave: 1-step approval per role
const LEAVE_ROLE_CONFIGS: Record<string, string> = {
  teacher:   'principal',
  employee:  'school_admin',
  hod:       'principal',
  principal: 'school_admin',
};

// Generic workflows
const GENERIC_WORKFLOW_STAGES: Record<string, { initiatorRole: string; approverRole: string; emailEnabled: boolean; notifyMessage: string }> = {
  attendance: {
    initiatorRole: 'teacher',
    approverRole:  'principal',
    emailEnabled:  true,
    notifyMessage: 'Your attendance regularization request has been reviewed.',
  },
  fee: {
    initiatorRole: 'parent',
    approverRole:  'school_admin',
    emailEnabled:  true,
    notifyMessage: 'Your fee waiver request has been reviewed.',
  },
  query_parents: {
    initiatorRole: 'parent',
    approverRole:  'teacher',
    emailEnabled:  false,
    notifyMessage: 'Your query has received a response.',
  },
};

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!ALLOWED_ROLES.includes(primary.role_code)) throw new ForbiddenError('Admin role required');

    const body = await request.json().catch(() => ({}));
    const schoolId = await resolveSchoolId(user, body.schoolId);

    const seeded: Record<string, any> = {
      admissionWorkflow: 'skipped',
      leaveWorkflows:    {} as Record<string, string>,
      genericWorkflows:  {} as Record<string, string>,
    };

    // ── 1. Admission Workflow ─────────────────────────────────────────────────
    const existingAdmission = await prisma.admissionWorkflow.findFirst({
      where: { schoolId, isActive: true },
    });

    if (!existingAdmission) {
      await prisma.admissionWorkflow.create({
        data: {
          schoolId,
          name:            'Standard 2-Step Admission',
          isActive:        true,
          sameForAllRoles: true,
          steps: {
            create: ADMISSION_STEPS,
          },
        },
      });
      seeded.admissionWorkflow = 'created';
    }

    // ── 2. Leave Workflows (one per role) ─────────────────────────────────────
    for (const [role, approverRole] of Object.entries(LEAVE_ROLE_CONFIGS)) {
      const existingLeave = await prisma.leaveWorkflow.findFirst({
        where: { schoolId, type: role },
      });

      if (existingLeave) {
        seeded.leaveWorkflows[role] = 'skipped';
      } else {
        await prisma.leaveWorkflow.create({
          data: {
            schoolId,
            type:     role,
            isActive: true,
            steps: {
              create: [{
                stepOrder:      0,
                label:          'Manager Approval',
                initiatorRole:  role,
                approverRole,
                approverUserId: null,
                spocUserId:     null,
                systemTrigger:  null,
                emailEnabled:   true,
                notifyEnabled:  true,
                notifyMessage:  'Your leave request has been reviewed.',
              }],
            },
          },
        });
        seeded.leaveWorkflows[role] = 'created';
      }
    }

    // ── 3. Generic Workflows ──────────────────────────────────────────────────
    for (const [workflowType, stageCfg] of Object.entries(GENERIC_WORKFLOW_STAGES)) {
      const existingGeneric = await prisma.genericWorkflow.findFirst({
        where: { schoolId, workflowType, isActive: true },
      });

      if (existingGeneric) {
        seeded.genericWorkflows[workflowType] = 'skipped';
      } else {
        await prisma.genericWorkflow.create({
          data: {
            schoolId,
            workflowType,
            isActive: true,
            stages: {
              create: [{
                stageOrder:     0,
                stageName:      workflowType === 'attendance' ? 'Regularization Approval'
                              : workflowType === 'fee'        ? 'Fee Waiver Approval'
                              : 'Query Response',
                initiatorRole:  stageCfg.initiatorRole,
                approverRole:   stageCfg.approverRole,
                approverUserId: null,
                spocUserId:     null,
                systemTrigger:  null,
                isFinal:        true,
                emailEnabled:   stageCfg.emailEnabled,
                notifyEnabled:  true,
                notifyMessage:  stageCfg.notifyMessage,
              }],
            },
          },
        });
        seeded.genericWorkflows[workflowType] = 'created';
      }
    }

    const totalCreated = [
      seeded.admissionWorkflow === 'created' ? 1 : 0,
      ...Object.values(seeded.leaveWorkflows as Record<string, string>).map(v => v === 'created' ? 1 : 0),
      ...Object.values(seeded.genericWorkflows as Record<string, string>).map(v => v === 'created' ? 1 : 0),
    ].reduce((a, b) => a + b, 0);

    return Response.json({
      ok:      true,
      schoolId,
      seeded,
      summary: `${totalCreated} workflow(s) created, rest already existed.`,
    });
  } catch (err) { return handleError(err); }
}
