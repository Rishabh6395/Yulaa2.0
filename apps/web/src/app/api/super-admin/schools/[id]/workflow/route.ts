/**
 * GET  /api/super-admin/schools/[id]/workflow?type=admission
 * GET  /api/super-admin/schools/[id]/workflow?type=leave&role=teacher
 * GET  /api/super-admin/schools/[id]/workflow?type=attendance|fee|query_parents|query_school_admin
 *   → returns the workflow + stages (null if not yet configured)
 *
 * POST /api/super-admin/schools/[id]/workflow
 *   body for admission : { type: 'admission', name, stages: [{stageName, initiatorRole, approverRole, systemTrigger, emailEnabled, notifyEnabled, notifyMessage, isFinal}] }
 *   body for leave     : { type: 'leave', role, stages: [...] }
 *   body for generic   : { type: 'attendance'|'fee'|'query_parents'|'query_school_admin', stages: [...] }
 */

import { CORE_ADMIN_ROLES as ADMIN_ROLES } from '@/lib/roles';
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const GENERIC_TYPES = ['attendance', 'fee', 'query_parents', 'query_school_admin'];

function assertAdmin(user: any) {
  if (!user) throw new UnauthorizedError();
  const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  if (!ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError();
}

// Normalize a stage array to a consistent shape for the frontend
function normalizeStages(stages: any[]) {
  return stages.map(s => ({
    stageName:      s.stageName     ?? s.label ?? '',
    initiatorRole:  s.initiatorRole ?? '',
    approverRole:   s.approverRole  ?? '',
    approverUserId: s.approverUserId ?? '',
    systemTrigger:  s.systemTrigger ?? '',
    isFinal:        s.isFinal        ?? false,
    emailEnabled:   s.emailEnabled   ?? false,
    notifyEnabled:  s.notifyEnabled  ?? true,
    notifyMessage:  s.notifyMessage  ?? '',
  }));
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    assertAdmin(user!);

    const { searchParams } = new URL(request.url);
    const type     = searchParams.get('type') || 'admission';
    const role     = searchParams.get('role') ?? null;
    const schoolId = params.id;

    // ── Admission (existing model) ──
    if (type === 'admission') {
      const wf = await prisma.admissionWorkflow.findFirst({
        where:   { schoolId, isActive: true },
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
      });
      if (!wf) return Response.json({ workflow: null });
      return Response.json({
        workflow: {
          id:     wf.id,
          stages: normalizeStages(wf.steps.map(s => ({
            stageName:      s.label,
            initiatorRole:  (s as any).initiatorRole ?? '',
            approverRole:   s.approverRole,
            systemTrigger:  (s as any).systemTrigger ?? '',
            isFinal:        s.isFinal,
            emailEnabled:   s.emailEnabled,
            notifyEnabled:  s.notifyEnabled,
            notifyMessage:  s.notifyMessage ?? '',
          }))),
        },
      });
    }

    // ── Leave (existing model) ──
    if (type === 'leave') {
      const leaveRole = role || 'teacher';
      const wf = await prisma.leaveWorkflow.findFirst({
        where:   { schoolId, type: leaveRole },
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
      });
      if (!wf) return Response.json({ workflow: null });
      return Response.json({
        workflow: {
          id:     wf.id,
          stages: normalizeStages(wf.steps.map(s => ({
            stageName:      s.label,
            initiatorRole:  (s as any).initiatorRole ?? '',
            approverRole:   s.approverRole  ?? '',
            approverUserId: s.approverUserId ?? '',
            systemTrigger:  (s as any).systemTrigger ?? '',
            isFinal:        false,
            emailEnabled:   s.emailEnabled,
            notifyEnabled:  s.notifyEnabled,
            notifyMessage:  s.notifyMessage ?? '',
          }))),
        },
      });
    }

    // ── Generic types ──
    if (GENERIC_TYPES.includes(type)) {
      const wf = await prisma.genericWorkflow.findFirst({
        where:   { schoolId, workflowType: type, isActive: true },
        include: { stages: { orderBy: { stageOrder: 'asc' } } },
      });
      if (!wf) return Response.json({ workflow: null });
      return Response.json({
        workflow: {
          id:     wf.id,
          stages: normalizeStages(wf.stages.map(s => ({
            stageName:      s.stageName,
            initiatorRole:  s.initiatorRole ?? '',
            approverRole:   s.approverRole  ?? '',
            approverUserId: s.approverUserId ?? '',
            systemTrigger:  s.systemTrigger  ?? '',
            isFinal:        s.isFinal,
            emailEnabled:   s.emailEnabled,
            notifyEnabled:  s.notifyEnabled,
            notifyMessage:  s.notifyMessage ?? '',
          }))),
        },
      });
    }

    throw new AppError(`Unknown workflow type: ${type}`, 400);
  } catch (err) { return handleError(err); }
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    assertAdmin(user!);

    const schoolId = params.id;
    const body   = await request.json();
    const { type, stages } = body;

    if (!type || !Array.isArray(stages)) throw new AppError('type and stages[] are required', 400);

    // ── Admission ──
    if (type === 'admission') {
      const { name = 'Admission Workflow' } = body;
      await prisma.admissionWorkflow.updateMany({ where: { schoolId }, data: { isActive: false } });

      const wf = await prisma.admissionWorkflow.create({
        data: {
          schoolId,
          name,
          isActive: true,
          steps: {
            create: stages.map((s: any, i: number) => ({
              stepOrder:     i,
              label:         s.stageName    || `Stage ${i + 1}`,
              initiatorRole: s.initiatorRole || null,
              approverRole:  s.approverRole  || 'school_admin',
              systemTrigger: s.systemTrigger || null,
              emailEnabled:  s.emailEnabled  ?? false,
              notifyEnabled: s.notifyEnabled ?? true,
              notifyMessage: s.notifyMessage ?? null,
              isFinal:       s.isFinal       ?? (i === stages.length - 1),
            })),
          },
        },
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
      });
      return Response.json({ workflow: wf });
    }

    // ── Leave ──
    if (type === 'leave') {
      const { role } = body;
      if (!role) throw new AppError('role is required for leave workflow', 400);

      await prisma.leaveWorkflow.deleteMany({ where: { schoolId, type: role } });

      const wf = await prisma.leaveWorkflow.create({
        data: {
          schoolId,
          type: role,
          isActive: true,
          steps: {
            create: stages.map((s: any, i: number) => ({
              stepOrder:      i,
              label:          s.stageName     || `Stage ${i + 1}`,
              initiatorRole:  s.initiatorRole  || null,
              approverRole:   s.approverRole   || null,
              approverUserId: s.approverUserId || null,
              systemTrigger:  s.systemTrigger  || null,
              emailEnabled:   s.emailEnabled   ?? false,
              notifyEnabled:  s.notifyEnabled  ?? true,
              notifyMessage:  s.notifyMessage  ?? null,
            })),
          },
        },
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
      });
      return Response.json({ workflow: wf });
    }

    // ── Generic (attendance, fee, query_parents, query_school_admin) ──
    if (GENERIC_TYPES.includes(type)) {
      // Deactivate + delete old workflow for this school+type
      await prisma.genericWorkflow.deleteMany({ where: { schoolId, workflowType: type } });

      const wf = await prisma.genericWorkflow.create({
        data: {
          schoolId,
          workflowType: type,
          isActive: true,
          stages: {
            create: stages.map((s: any, i: number) => ({
              stageOrder:     i,
              stageName:      s.stageName     || `Stage ${i + 1}`,
              initiatorRole:  s.initiatorRole  || null,
              approverRole:   s.approverRole   || null,
              approverUserId: s.approverUserId || null,
              systemTrigger:  s.systemTrigger  || null,
              isFinal:        s.isFinal        ?? (i === stages.length - 1),
              emailEnabled:   s.emailEnabled   ?? false,
              notifyEnabled:  s.notifyEnabled  ?? true,
              notifyMessage:  s.notifyMessage  ?? null,
            })),
          },
        },
        include: { stages: { orderBy: { stageOrder: 'asc' } } },
      });
      return Response.json({ workflow: wf });
    }

    throw new AppError(`Unknown workflow type: ${type}`, 400);
  } catch (err) { return handleError(err); }
}
