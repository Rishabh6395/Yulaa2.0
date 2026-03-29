/**
 * GET  /api/super-admin/schools/[id]/workflow?type=admission
 * GET  /api/super-admin/schools/[id]/workflow?type=leave&role=teacher
 *   → returns the workflow template + steps (or null if not configured)
 *
 * POST /api/super-admin/schools/[id]/workflow
 *   body: { type: 'admission', name, steps: [{label, approverRole, emailEnabled, notifyEnabled, notifyMessage, isFinal}] }
 *   body: { type: 'leave', role: string, steps: [{label, approverRole, approverUserId, emailEnabled, notifyEnabled, notifyMessage}] }
 *   → replaces workflow for that type/role; creates if none exists
 */

import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const ADMIN_ROLES = ['super_admin', 'school_admin'];

function assertAdmin(user: any) {
  if (!user) throw new UnauthorizedError();
  const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  if (!ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError();
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    assertAdmin(user!);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'admission';
    const role = searchParams.get('role') ?? null;
    const schoolId = params.id;

    if (type === 'admission') {
      const wf = await prisma.admissionWorkflow.findFirst({
        where:   { schoolId, isActive: true },
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
      });
      return Response.json({ workflow: wf ?? null });
    }

    // type === 'leave'
    const leaveRole = role || 'teacher';
    const wf = await prisma.leaveWorkflow.findFirst({
      where:   { schoolId, type: leaveRole },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
    return Response.json({ workflow: wf ?? null });
  } catch (err) { return handleError(err); }
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    assertAdmin(user!);

    const schoolId = params.id;
    const body = await request.json();
    const { type, steps } = body;

    if (!type || !Array.isArray(steps)) throw new AppError('type and steps[] are required', 400);

    if (type === 'admission') {
      const { name = 'Admission Workflow' } = body;

      // Deactivate old workflows
      await prisma.admissionWorkflow.updateMany({
        where: { schoolId },
        data:  { isActive: false },
      });

      // Create new workflow with steps
      const wf = await prisma.admissionWorkflow.create({
        data: {
          schoolId,
          name,
          isActive: true,
          steps: {
            create: steps.map((s: any, i: number) => ({
              stepOrder:     i,
              label:         s.label || `Step ${i + 1}`,
              approverRole:  s.approverRole || 'school_admin',
              emailEnabled:  s.emailEnabled  ?? false,
              notifyEnabled: s.notifyEnabled ?? true,
              notifyMessage: s.notifyMessage ?? null,
              isFinal:       s.isFinal       ?? (i === steps.length - 1),
            })),
          },
        },
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
      });

      return Response.json({ workflow: wf });
    }

    // type === 'leave'
    const { role } = body;
    if (!role) throw new AppError('role is required for leave workflow', 400);

    // Delete existing workflow for this school+role (cascade deletes steps)
    await prisma.leaveWorkflow.deleteMany({ where: { schoolId, type: role } });

    // Create new workflow
    const wf = await prisma.leaveWorkflow.create({
      data: {
        schoolId,
        type:     role,
        isActive: true,
        steps: {
          create: steps.map((s: any, i: number) => ({
            stepOrder:      i,
            label:          s.label || `Step ${i + 1}`,
            approverRole:   s.approverRole   || null,
            approverUserId: s.approverUserId || null,
            emailEnabled:   s.emailEnabled   ?? false,
            notifyEnabled:  s.notifyEnabled  ?? true,
            notifyMessage:  s.notifyMessage  ?? null,
          })),
        },
      },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });

    return Response.json({ workflow: wf });
  } catch (err) { return handleError(err); }
}
