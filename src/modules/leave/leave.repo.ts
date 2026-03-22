import prisma from '@/lib/prisma';

export async function findLeaveRequests(schoolId: string, userId?: string) {
  return prisma.leaveRequest.findMany({
    where: { schoolId, ...(userId && { userId }) },
    include: {
      user:           { select: { firstName: true, lastName: true } },
      student:        { select: { firstName: true, lastName: true } },
      reviewedByUser: { select: { firstName: true, lastName: true } },
      actions: {
        include: { actor: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}

export async function createLeaveRequest(data: {
  schoolId:   string;
  userId:     string;
  studentId?: string;
  roleCode:   string;
  leaveType:  string;
  startDate:  Date;
  endDate:    Date;
  reason:     string;
}) {
  return prisma.leaveRequest.create({ data });
}

export async function advanceLeaveStep(
  id: string,
  action: 'approved' | 'rejected',
  actorUserId: string,
  stepOrder: number,
  totalSteps: number,
  comment?: string,
) {
  const isLastStep  = stepOrder >= totalSteps - 1;
  const finalStatus = action === 'rejected' ? 'rejected' : isLastStep ? 'approved' : 'pending';
  const nextStep    = action === 'approved' && !isLastStep ? stepOrder + 1 : stepOrder;

  await prisma.leaveAction.create({
    data: { leaveId: id, actorUserId, stepOrder, action, comment },
  });

  return prisma.leaveRequest.update({
    where: { id },
    data: {
      status:      finalStatus,
      currentStep: nextStep,
      ...(finalStatus !== 'pending' && { reviewedBy: actorUserId, reviewedAt: new Date() }),
    },
  });
}

// ── Workflow ──────────────────────────────────────────────────────────────────

export async function findLeaveWorkflow(schoolId: string, type: string) {
  return prisma.leaveWorkflow.findFirst({
    where: { schoolId, type, isActive: true },
    include: { steps: { orderBy: { stepOrder: 'asc' } } },
  });
}

export async function upsertLeaveWorkflow(
  schoolId: string,
  type: string,
  steps: { label: string; approverRole?: string; approverUserId?: string }[],
) {
  const existing = await prisma.leaveWorkflow.findFirst({ where: { schoolId, type } });
  if (existing) {
    await prisma.leaveWorkflowStep.deleteMany({ where: { workflowId: existing.id } });
    await prisma.leaveWorkflowStep.createMany({
      data: steps.map((s, i) => ({
        workflowId:     existing.id,
        stepOrder:      i,
        label:          s.label,
        approverRole:   s.approverRole   || null,
        approverUserId: s.approverUserId || null,
      })),
    });
    return prisma.leaveWorkflow.findFirst({
      where: { id: existing.id },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
  }
  return prisma.leaveWorkflow.create({
    data: {
      schoolId,
      type,
      steps: {
        create: steps.map((s, i) => ({
          stepOrder:      i,
          label:          s.label,
          approverRole:   s.approverRole   || null,
          approverUserId: s.approverUserId || null,
        })),
      },
    },
    include: { steps: { orderBy: { stepOrder: 'asc' } } },
  });
}

// ── Leave Type Master ─────────────────────────────────────────────────────────

export async function findLeaveTypesByRole(schoolId: string, roleCode: string) {
  return prisma.leaveTypeMaster.findMany({
    where: { schoolId, isActive: true, applicableTo: { has: roleCode } },
    orderBy: { name: 'asc' },
  });
}

export async function findLeaveBalancePoliciesByRole(schoolId: string, roleCode: string) {
  return prisma.leaveBalancePolicy.findMany({
    where: { schoolId, roleCode },
    include: { leaveType: true },
  });
}

// ── Teacher Leave Balance ─────────────────────────────────────────────────────

export async function findTeacherBalances(schoolId: string, teacherId: string, academicYear: string) {
  return prisma.teacherLeaveBalance.findMany({
    where: { schoolId, teacherId, academicYear },
  });
}

export async function findTeacherIdByUserId(schoolId: string, userId: string) {
  const t = await prisma.teacher.findFirst({ where: { schoolId, userId } });
  return t?.id ?? null;
}

export async function incrementUsedDays(schoolId: string, teacherId: string, leaveType: string, academicYear: string, days: number) {
  await prisma.teacherLeaveBalance.updateMany({
    where: { schoolId, teacherId, leaveType, academicYear },
    data: { usedDays: { increment: days } },
  });
}

export async function bulkUpsertTeacherBalances(
  rows: { schoolId: string; teacherId: string; leaveType: string; academicYear: string; totalDays: number }[],
) {
  for (const row of rows) {
    await prisma.teacherLeaveBalance.upsert({
      where: { schoolId_teacherId_leaveType_academicYear: { schoolId: row.schoolId, teacherId: row.teacherId, leaveType: row.leaveType, academicYear: row.academicYear } },
      update: { totalDays: row.totalDays },
      create: { ...row, usedDays: 0 },
    });
  }
}
