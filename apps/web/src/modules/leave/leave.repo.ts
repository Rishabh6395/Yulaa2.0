import prisma from '@/lib/prisma';

export async function findLeaveRequests(
  schoolId: string | null,
  userId?: string,
  includeParentLeaves = false,
) {
  if (!schoolId && !userId) return [];

  // Teachers: own leaves + all parent/student leaves (for review) — no other teachers' data
  const where = includeParentLeaves && schoolId && userId
    ? { schoolId, OR: [{ userId }, { roleCode: 'parent' }] }
    : { ...(schoolId ? { schoolId } : {}), ...(userId ? { userId } : {}) };

  return prisma.leaveRequest.findMany({
    where,
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
    take: 200,
  });
}

// Returns any existing pending/approved leave whose dates overlap with the requested range
export async function findOverlappingLeave(
  schoolId: string,
  userId: string,
  studentId: string | null,
  startDate: Date,
  endDate: Date,
) {
  const base = { schoolId, status: { in: ['pending', 'approved'] as string[] }, startDate: { lte: endDate }, endDate: { gte: startDate } };
  const where = studentId
    ? { ...base, studentId }
    : { ...base, userId, studentId: null };
  return prisma.leaveRequest.findFirst({
    where,
    select: { id: true, leaveType: true, startDate: true, endDate: true, status: true },
  });
}

export async function deleteLeaveRequest(id: string, schoolId: string) {
  // Hard-delete: cascades to LeaveAction children via DB relation
  // schoolId is mandatory so admins can only delete records from their own school
  const result = await prisma.leaveRequest.deleteMany({
    where: { id, schoolId },
  });
  return result;
}

export async function withdrawLeaveRequest(id: string, userId: string) {
  return prisma.leaveRequest.updateMany({
    where: { id, userId, status: { in: ['pending', 'approved'] } },
    data:  { status: 'withdrawn', currentStep: 0 },
  });
}

export async function findStudentSchoolId(studentId: string): Promise<string | null> {
  const s = await prisma.student.findFirst({ where: { id: studentId }, select: { schoolId: true } });
  return s?.schoolId ?? null;
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
  // 'employee' role matches leave types tagged with 'employee'.
  // Specific roles (teacher/principal/school_admin) also match 'employee'-tagged types
  // since those users now carry the employee role for self-service.
  const EMPLOYEE_ROLE_CODES = ['teacher', 'principal', 'school_admin', 'hod', 'employee'];
  const lookupCodes = EMPLOYEE_ROLE_CODES.includes(roleCode)
    ? [roleCode, 'employee']
    : [roleCode];

  // Fetch leave types that either:
  // 1. Have the role in their applicableTo array, OR
  // 2. Have an empty applicableTo (meaning they apply to ALL roles)
  const [roleSpecific, universal] = await Promise.all([
    // Types specifically tagged for these roles
    Promise.all(
      lookupCodes.map(code =>
        prisma.leaveTypeMaster.findMany({
          where: { schoolId, isActive: true, applicableTo: { has: code } },
          orderBy: { name: 'asc' },
        })
      )
    ),
    // Types with empty applicableTo — applicable to everyone
    prisma.leaveTypeMaster.findMany({
      where: { schoolId, isActive: true, applicableTo: { equals: [] } },
      orderBy: { name: 'asc' },
    }),
  ]);

  // Deduplicate by id
  const seen = new Set<string>();
  return [...roleSpecific.flat(), ...universal].filter(lt => seen.has(lt.id) ? false : (seen.add(lt.id), true));
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

// ── Leave → Attendance auto-sync helpers ─────────────────────────────────────

const LEAVE_SUBJECTS: Record<string, string> = {
  eng: 'absent', hindi: 'absent', maths: 'absent',
  sc: 'absent',  ss: 'absent',    skt: 'absent',
  dr: 'absent',  it: 'absent',
};

export async function findStudentClassId(studentId: string): Promise<string | null> {
  const s = await prisma.student.findFirst({ where: { id: studentId }, select: { classId: true } });
  return s?.classId ?? null;
}

export async function syncLeaveToAttendance(
  schoolId: string, studentId: string, classId: string, dates: Date[], markedBy: string,
) {
  return Promise.all(
    dates.map(date =>
      prisma.attendance.upsert({
        where:  { studentId_date: { studentId, date } },
        create: { schoolId, studentId, classId, date, status: 'excused', markedBy, updatedBy: markedBy, remarks: '__leave__', subjectAttendance: LEAVE_SUBJECTS },
        update: { status: 'excused', updatedBy: markedBy, remarks: '__leave__', subjectAttendance: LEAVE_SUBJECTS },
      })
    )
  );
}

export async function findStudentApprovedLeaveDays(
  schoolId: string, studentId: string, yearStart: Date, yearEnd: Date,
): Promise<number> {
  const leaves = await prisma.leaveRequest.findMany({
    where: { schoolId, studentId, status: 'approved', startDate: { gte: yearStart, lte: yearEnd } },
    select: { startDate: true, endDate: true },
  });
  return leaves.reduce((sum, l) => {
    return sum + Math.max(1, Math.round((l.endDate.getTime() - l.startDate.getTime()) / 86400000) + 1);
  }, 0);
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
