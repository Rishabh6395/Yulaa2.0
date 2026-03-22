import { AppError } from '@/utils/errors';
import * as repo from './leave.repo';
import type { LeaveRow, LeaveBalanceRow } from './leave.types';

// Default leave types per role group
const PARENT_LEAVE_TYPES  = ['sick', 'emergency', 'other'];
const TEACHER_LEAVE_TYPES = ['sick', 'casual', 'other'];

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

  // Validate leave type is allowed for this role
  if (roleCode === 'parent'  && !PARENT_LEAVE_TYPES.includes(leaveType)  && leaveType !== 'other') {
    throw new AppError('Invalid leave type for parent');
  }
  if (roleCode === 'teacher' && !TEACHER_LEAVE_TYPES.includes(leaveType) && leaveType !== 'other') {
    throw new AppError('Invalid leave type for teacher');
  }

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

  const rows = await repo.findTeacherBalances(schoolId, teacherId, academicYear);

  // Fill in defaults for standard types if not set
  const defaults: Record<string, number> = { sick: 10, casual: 12, other: 0 };
  const result: LeaveBalanceRow[] = TEACHER_LEAVE_TYPES.map(lt => {
    const row = rows.find(r => r.leaveType === lt);
    const total = row?.totalDays ?? defaults[lt] ?? 0;
    const used  = row?.usedDays  ?? 0;
    return { leave_type: lt, total_days: total, used_days: used, remaining: Math.max(0, total - used) };
  });

  // Also include any custom types
  rows.filter(r => !TEACHER_LEAVE_TYPES.includes(r.leaveType)).forEach(r => {
    result.push({ leave_type: r.leaveType, total_days: r.totalDays, used_days: r.usedDays, remaining: Math.max(0, r.totalDays - r.usedDays) });
  });

  return { balances: result };
}
