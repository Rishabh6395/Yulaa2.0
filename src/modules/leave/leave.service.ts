import { AppError } from '@/utils/errors';
import * as repo from './leave.repo';
import type { LeaveRow, LeaveBalanceRow } from './leave.types';

// Fallback leave types used only when school hasn't configured any
const FALLBACK_PARENT_TYPES  = [
  { code: 'sick', name: 'Sick Leave' },
  { code: 'emergency', name: 'Emergency Leave' },
  { code: 'other', name: 'Other' },
];
const FALLBACK_TEACHER_TYPES = [
  { code: 'sick',   name: 'Sick Leave' },
  { code: 'casual', name: 'Casual Leave' },
  { code: 'other',  name: 'Other' },
];
const FALLBACK_BALANCE: Record<string, number> = { sick: 10, casual: 12, other: 0 };

function daysBetween(start: Date, end: Date) {
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
}

export async function listLeaveRequests(
  schoolId: string, userId: string, roleCode: string, isAdmin: boolean,
): Promise<{ leaves: LeaveRow[]; workflows: { parent: any; teacher: any } }> {
  const [leaves, parentWf, teacherWf] = await Promise.all([
    repo.findLeaveRequests(schoolId, isAdmin ? undefined : userId),
    repo.findLeaveWorkflow(schoolId, 'parent'),
    repo.findLeaveWorkflow(schoolId, 'teacher'),
  ]);

  const mapLeave = (lr: any): LeaveRow => ({
    id:               lr.id,
    role_code:        lr.roleCode,
    leave_type:       lr.leaveType || 'other',
    user_id:          lr.userId,
    start_date:       lr.startDate,
    end_date:         lr.endDate,
    reason:           lr.reason,
    status:           lr.status,
    current_step:     lr.currentStep,
    created_at:       lr.createdAt,
    reviewed_at:      lr.reviewedAt,
    requester_name:   `${lr.user.firstName} ${lr.user.lastName}`,
    student_name:     lr.student ? `${lr.student.firstName} ${lr.student.lastName}` : null,
    approved_by_name: lr.reviewedByUser ? `${lr.reviewedByUser.firstName} ${lr.reviewedByUser.lastName}` : null,
    workflow_steps:   (lr.roleCode === 'parent' ? parentWf?.steps : teacherWf?.steps)?.map((s: any) => ({
      step_order:    s.stepOrder,
      label:         s.label,
      approver_role: s.approverRole,
    })) ?? [],
    actions: lr.actions.map((a: any) => ({
      step_order: a.stepOrder,
      action:     a.action,
      comment:    a.comment,
      actor_name: a.actor ? `${a.actor.firstName} ${a.actor.lastName}` : null,
      created_at: a.createdAt,
    })),
  });

  return {
    leaves: leaves.map(mapLeave),
    workflows: {
      parent:  parentWf  ? { steps: parentWf.steps.map((s: any)  => ({ step_order: s.stepOrder, label: s.label, approver_role: s.approverRole })) } : null,
      teacher: teacherWf ? { steps: teacherWf.steps.map((s: any) => ({ step_order: s.stepOrder, label: s.label, approver_role: s.approverRole })) } : null,
    },
  };
}

export async function submitLeaveRequest(
  schoolId: string, userId: string, roleCode: string, body: Record<string, any>,
) {
  const { start_date, end_date, reason, leave_type, student_id } = body;
  if (!start_date || !end_date) throw new AppError('start_date and end_date are required');
  if (!schoolId) throw new AppError('School association not found');

  const leaveType = leave_type || 'other';

  // Validate leave type is allowed for this role (check DB first, then fallback)
  const dbTypes = await repo.findLeaveTypesByRole(schoolId, roleCode);
  if (dbTypes.length > 0) {
    const allowedCodes = dbTypes.map(t => t.code);
    if (!allowedCodes.includes(leaveType)) {
      throw new AppError(`Invalid leave type. Allowed: ${allowedCodes.join(', ')}`);
    }
  }
  // If no DB types configured, allow anything (school uses defaults)

  return repo.createLeaveRequest({
    schoolId,
    userId,
    studentId: student_id || null,
    roleCode,
    leaveType,
    startDate: new Date(start_date),
    endDate:   new Date(end_date),
    reason:    reason || `${leaveType} leave`,
  });
}

export async function withdrawLeave(userId: string, id: string) {
  if (!id) throw new AppError('id is required');
  const result = await repo.withdrawLeaveRequest(id, userId);
  if (result.count === 0) throw new AppError('Leave not found or cannot be withdrawn (must be pending)');
  return { ok: true };
}

export async function reviewLeaveStep(
  reviewerId: string, schoolId: string, roleCode: string, body: Record<string, any>,
) {
  const { id, action, comment } = body;
  if (!id || !action) throw new AppError('id and action are required');
  if (!['approved', 'rejected'].includes(action)) throw new AppError('action must be approved or rejected');

  // Load leave + workflow to know total steps
  const leaves = await repo.findLeaveRequests(schoolId, undefined);
  const leave  = leaves.find(l => l.id === id);
  if (!leave) throw new AppError('Leave request not found');

  const wf = await repo.findLeaveWorkflow(schoolId, leave.roleCode);
  const totalSteps = wf?.steps.length ?? 1;

  return repo.advanceLeaveStep(id, action as 'approved' | 'rejected', reviewerId, leave.currentStep, totalSteps, comment);
}

export async function getTeacherBalances(
  schoolId: string, userId: string, academicYear: string,
): Promise<{ balances: LeaveBalanceRow[] }> {
  const teacherId = await repo.findTeacherIdByUserId(schoolId, userId);
  if (!teacherId) return { balances: [] };

  const [rows, dbTypes, policies] = await Promise.all([
    repo.findTeacherBalances(schoolId, teacherId, academicYear),
    repo.findLeaveTypesByRole(schoolId, 'teacher'),
    repo.findLeaveBalancePoliciesByRole(schoolId, 'teacher'),
  ]);

  // Use DB-configured leave types; fall back to defaults if none configured
  const typeList = dbTypes.length > 0
    ? dbTypes.map(t => t.code)
    : FALLBACK_TEACHER_TYPES.map(t => t.code);

  const result: LeaveBalanceRow[] = typeList.map(lt => {
    const row    = rows.find(r => r.leaveType === lt);
    const policy = policies.find(p => p.leaveType.code === lt);
    // Priority: uploaded balance > policy default > hardcoded fallback
    const total  = row?.totalDays ?? policy?.daysPerYear ?? FALLBACK_BALANCE[lt] ?? 0;
    const used   = row?.usedDays  ?? 0;
    return { leave_type: lt, total_days: total, used_days: used, remaining: Math.max(0, total - used) };
  });

  // Include any uploaded balances for types not in the master list
  rows.filter(r => !typeList.includes(r.leaveType)).forEach(r => {
    result.push({ leave_type: r.leaveType, total_days: r.totalDays, used_days: r.usedDays, remaining: Math.max(0, r.totalDays - r.usedDays) });
  });

  return { balances: result };
}

// Exported for use by /api/leave/types
export async function getLeaveTypesForRole(
  schoolId: string, roleCode: string,
): Promise<{ code: string; name: string }[]> {
  const dbTypes = await repo.findLeaveTypesByRole(schoolId, roleCode);
  if (dbTypes.length > 0) return dbTypes.map(t => ({ code: t.code, name: t.name }));
  // Fallback when school hasn't configured any types yet
  const fallback = roleCode === 'parent' ? FALLBACK_PARENT_TYPES : FALLBACK_TEACHER_TYPES;
  return fallback;
}
