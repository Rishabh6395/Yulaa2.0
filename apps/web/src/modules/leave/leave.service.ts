import { AppError } from '@/utils/errors';
import { EMPLOYEE_ROLES } from '@/lib/roles';
import * as repo from './leave.repo';
import type { LeaveRow, LeaveBalanceRow } from './leave.types';

// ── Academic year helper (April–March, India) ─────────────────────────────────

function currentAcademicYear(): { yearStart: Date; yearEnd: Date; label: string } {
  const now = new Date();
  const aprilStart = now.getMonth() >= 3
    ? new Date(now.getFullYear(), 3, 1)
    : new Date(now.getFullYear() - 1, 3, 1);
  const marchEnd = new Date(aprilStart.getFullYear() + 1, 2, 31);
  const y1 = aprilStart.getFullYear();
  const y2 = marchEnd.getFullYear();
  return { yearStart: aprilStart, yearEnd: marchEnd, label: `${y1}-${String(y2).slice(2)}` };
}

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
  schoolId: string | null, userId: string, roleCode: string, isAdmin: boolean,
): Promise<{ leaves: LeaveRow[]; workflows: { parent: any; teacher: any } }> {
  const leaves = await repo.findLeaveRequests(schoolId, isAdmin ? undefined : userId);

  // For parents (schoolId is null), derive a school from the first leave so we can
  // fetch the relevant workflow for display — parents only apply to one school at a time.
  const wfSchoolId: string | null = schoolId ?? (leaves[0] as any)?.schoolId ?? null;
  const [parentWf, teacherWf] = wfSchoolId
    ? await Promise.all([
        repo.findLeaveWorkflow(wfSchoolId, 'parent'),
        repo.findLeaveWorkflow(wfSchoolId, 'teacher'),
      ])
    : [null, null];

  const mapLeave = (lr: any): LeaveRow => ({
    id:               lr.id,
    role_code:        lr.roleCode,
    leave_type:       lr.leaveType || 'other',
    user_id:          lr.userId,
    student_id:       lr.studentId ?? null,
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

  // Block if any pending or approved leave overlaps with the requested dates
  const sd = new Date(start_date); sd.setUTCHours(0, 0, 0, 0);
  const ed = new Date(end_date);   ed.setUTCHours(0, 0, 0, 0);
  const overlap = await repo.findOverlappingLeave(
    schoolId, userId, student_id || null, sd, ed,
  );
  if (overlap) {
    const who   = student_id ? 'This student already has' : 'You already have';
    const label = overlap.status === 'approved' ? 'an approved' : 'a pending';
    throw new AppError(`${who} ${label} leave for these dates. Please choose different dates.`);
  }

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
    startDate: sd,
    endDate:   ed,
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

  const result = await repo.advanceLeaveStep(id, action as 'approved' | 'rejected', reviewerId, leave.currentStep, totalSteps, comment);

  // Deduct from TeacherLeaveBalance when an employee leave is finally approved
  if (action === 'approved' && result.status === 'approved' && EMPLOYEE_ROLES.includes(leave.roleCode) && !leave.studentId) {
    const days = daysBetween(leave.startDate, leave.endDate);
    const teacherId = await repo.findTeacherIdByUserId(schoolId, leave.userId);
    if (teacherId) {
      const { label: academicYear } = currentAcademicYear();
      await repo.incrementUsedDays(schoolId, teacherId, leave.leaveType, academicYear, days);
    }
  }

  // Auto-sync attendance calendar when a student leave is finally approved
  if (action === 'approved' && result.status === 'approved' && leave.studentId) {
    const classId = await repo.findStudentClassId(leave.studentId);
    if (classId) {
      const dates = getWeekdayDatesInRange(leave.startDate, leave.endDate);
      if (dates.length > 0) {
        await repo.syncLeaveToAttendance(schoolId, leave.studentId, classId, dates, reviewerId);
      }
    }
  }

  return result;
}

// Returns weekday dates (Mon–Fri) in the leave range
function getWeekdayDatesInRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const cur = new Date(startDate);
  cur.setUTCHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setUTCHours(0, 0, 0, 0);
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) dates.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
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

// ── Student leave balance (dynamic — counts approved leave days per student) ───

export async function getStudentLeaveBalance(
  schoolId: string, studentId: string,
): Promise<{ total_days: number; used_days: number; remaining: number }> {
  const { yearStart, yearEnd } = currentAcademicYear();
  const [usedDays, policies] = await Promise.all([
    repo.findStudentApprovedLeaveDays(schoolId, studentId, yearStart, yearEnd),
    repo.findLeaveBalancePoliciesByRole(schoolId, 'parent'),
  ]);
  const totalDays = policies.length > 0
    ? policies.reduce((s, p) => s + p.daysPerYear, 0)
    : 30; // default 30 days/year when school hasn't configured policy
  return { total_days: totalDays, used_days: usedDays, remaining: Math.max(0, totalDays - usedDays) };
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
