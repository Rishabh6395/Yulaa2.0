import { AppError } from '@/utils/errors';
import * as repo from './leave.repo';
import type { LeaveRow, LeaveBalanceRow } from './leave.types';
import prisma from '@/lib/prisma';

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

// ── Week-off / holiday helpers ─────────────────────────────────────────────────

const WEEKOFF_DATES = [
  '1970-01-04', '1970-01-05', '1970-01-06', '1970-01-07',
  '1970-01-08', '1970-01-09', '1970-01-10',
];

async function getSchoolCalendarInfo(schoolId: string): Promise<{
  weekoffDays: number[];
  holidayDates: Set<string>;
}> {
  const [weekoffEntries, holidays] = await Promise.all([
    prisma.holidayCalendar.findMany({
      where: { schoolId, academicYear: '__weekoff__' },
      select: { date: true },
    }),
    // Load holidays for ±2 academic years to handle cross-year leaves
    prisma.holidayCalendar.findMany({
      where: { schoolId, academicYear: { not: '__weekoff__' } },
      select: { date: true },
    }),
  ]);

  const weekoffDays = weekoffEntries
    .map(w => {
      const d = new Date(w.date).toISOString().split('T')[0];
      return WEEKOFF_DATES.indexOf(d);
    })
    .filter(d => d >= 0);

  const holidayDates = new Set(
    holidays.map(h => new Date(h.date).toISOString().split('T')[0]),
  );

  return { weekoffDays, holidayDates };
}

/**
 * Returns an array of effective working dates in a leave range,
 * excluding school week-off days and public holidays.
 */
function getEffectiveLeaveDates(
  startDate: Date,
  endDate: Date,
  weekoffDays: number[],
  holidayDates: Set<string>,
): Date[] {
  const dates: Date[] = [];
  const cur = new Date(startDate);
  cur.setUTCHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setUTCHours(0, 0, 0, 0);
  while (cur <= end) {
    const dow     = cur.getDay();
    const dateStr = cur.toISOString().split('T')[0];
    if (!weekoffDays.includes(dow) && !holidayDates.has(dateStr)) {
      dates.push(new Date(cur));
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

// ── List ───────────────────────────────────────────────────────────────────────

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
    student_class:    lr.student?.class ? `${lr.student.class.grade}${lr.student.class.section ? '-' + lr.student.class.section : ''}` : null,
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

// ── Submit ─────────────────────────────────────────────────────────────────────

export async function submitLeaveRequest(
  schoolId: string, userId: string, roleCode: string, body: Record<string, any>,
) {
  const { start_date, end_date, reason, leave_type, student_id } = body;
  if (!start_date || !end_date) throw new AppError('start_date and end_date are required');
  if (!schoolId) throw new AppError('School association not found');

  const leaveType = leave_type || 'other';

  const sd = new Date(start_date); sd.setUTCHours(0, 0, 0, 0);
  const ed = new Date(end_date);   ed.setUTCHours(0, 0, 0, 0);

  if (sd > ed) throw new AppError('End date must be on or after start date');

  // ── Week-off / holiday validation ──────────────────────────────────────────
  const { weekoffDays, holidayDates } = await getSchoolCalendarInfo(schoolId);

  // Block if the ENTIRE requested range falls on week-offs / holidays
  const effectiveDates = getEffectiveLeaveDates(sd, ed, weekoffDays, holidayDates);
  if (effectiveDates.length === 0) {
    throw new AppError('The selected dates fall entirely on week-off or holiday days. Leave cannot be applied on those days.');
  }

  // Check if start / end themselves are week-offs or holidays (warn as error — front-end should prevent this too)
  const sdStr = sd.toISOString().split('T')[0];
  const edStr = ed.toISOString().split('T')[0];
  if (weekoffDays.includes(sd.getDay()) || holidayDates.has(sdStr)) {
    throw new AppError('Start date is a week-off or holiday. Please choose a working day.');
  }
  if (weekoffDays.includes(ed.getDay()) || holidayDates.has(edStr)) {
    throw new AppError('End date is a week-off or holiday. Please choose a working day.');
  }

  // Block if any pending or approved leave overlaps with the requested dates
  const overlap = await repo.findOverlappingLeave(schoolId, userId, student_id || null, sd, ed);
  if (overlap) {
    const who   = student_id ? 'This student already has' : 'You already have';
    const label = overlap.status === 'approved' ? 'an approved' : 'a pending';
    throw new AppError(`${who} ${label} leave for these dates. Please choose different dates.`);
  }

  // Validate leave type is allowed for this role
  const dbTypes = await repo.findLeaveTypesByRole(schoolId, roleCode);
  if (dbTypes.length > 0) {
    const allowedCodes = dbTypes.map(t => t.code);
    if (!allowedCodes.includes(leaveType)) {
      throw new AppError(`Invalid leave type. Allowed: ${allowedCodes.join(', ')}`);
    }
  }

  // Effective day count (excludes week-offs and holidays)
  const effectiveDays = effectiveDates.length;

  return repo.createLeaveRequest({
    schoolId,
    userId,
    studentId:    student_id || null,
    roleCode,
    leaveType,
    startDate:    sd,
    endDate:      ed,
    reason:       reason || `${leaveType} leave`,
    effectiveDays,
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
  const { id, action, comment, reassign_to } = body;
  if (!id || !action) throw new AppError('id and action are required');
  if (!['approved', 'rejected', 'reassign'].includes(action)) {
    throw new AppError('action must be approved, rejected, or reassign');
  }

  const leaves = await repo.findLeaveRequests(schoolId, undefined);
  const leave  = leaves.find(l => l.id === id);
  if (!leave) throw new AppError('Leave request not found');

  // Reassign: update the current step's approver
  if (action === 'reassign') {
    if (!reassign_to) throw new AppError('reassign_to (user_id) is required for reassign action');
    const wf = await repo.findLeaveWorkflow(schoolId, leave.roleCode);
    if (!wf) throw new AppError('No workflow configured for this leave type');
    const step = wf.steps.find((s: any) => s.stepOrder === leave.currentStep);
    if (!step) throw new AppError('Current workflow step not found');
    await prisma.leaveWorkflowStep.update({
      where: { id: step.id },
      data: { approverUserId: reassign_to },
    });
    return { ok: true, message: 'Leave task reassigned' };
  }

  const wf = await repo.findLeaveWorkflow(schoolId, leave.roleCode);
  const totalSteps = wf?.steps.length ?? 1;

  const result = await repo.advanceLeaveStep(id, action as 'approved' | 'rejected', reviewerId, leave.currentStep, totalSteps, comment);

  // Deduct from TeacherLeaveBalance when an employee leave is finally approved
  const EMPLOYEE_ROLES_BAL = ['teacher', 'school_admin', 'principal', 'hod'];
  if (action === 'approved' && result.status === 'approved' && EMPLOYEE_ROLES_BAL.includes(leave.roleCode) && !leave.studentId) {
    // Use effectiveDays if available; fall back to calendar days
    const days = (leave as any).effectiveDays
      ? (leave as any).effectiveDays
      : daysBetween(leave.startDate, leave.endDate);
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
      // Use effective dates (exclude week-offs/holidays) for attendance sync
      const { weekoffDays, holidayDates } = await getSchoolCalendarInfo(schoolId);
      const dates = getEffectiveLeaveDates(leave.startDate, leave.endDate, weekoffDays, holidayDates);
      if (dates.length > 0) {
        await repo.syncLeaveToAttendance(schoolId, leave.studentId, classId, dates, reviewerId);
      }
    }
  }

  return result;
}

// ── Teacher balances ───────────────────────────────────────────────────────────

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

  const typeList = dbTypes.length > 0
    ? dbTypes.map(t => t.code)
    : FALLBACK_TEACHER_TYPES.map(t => t.code);

  const result: LeaveBalanceRow[] = typeList.map(lt => {
    const row    = rows.find(r => r.leaveType === lt);
    const policy = policies.find(p => p.leaveType.code === lt);
    const total  = row?.totalDays ?? policy?.daysPerYear ?? FALLBACK_BALANCE[lt] ?? 0;
    const used   = row?.usedDays  ?? 0;
    return { leave_type: lt, total_days: total, used_days: used, remaining: Math.max(0, total - used) };
  });

  rows.filter(r => !typeList.includes(r.leaveType)).forEach(r => {
    result.push({ leave_type: r.leaveType, total_days: r.totalDays, used_days: r.usedDays, remaining: Math.max(0, r.totalDays - r.usedDays) });
  });

  return { balances: result };
}

// ── Student leave balance ──────────────────────────────────────────────────────

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
    : 30;
  return { total_days: totalDays, used_days: usedDays, remaining: Math.max(0, totalDays - usedDays) };
}

// ── Leave types ────────────────────────────────────────────────────────────────

export async function getLeaveTypesForRole(
  schoolId: string, roleCode: string,
): Promise<{ code: string; name: string }[]> {
  const dbTypes = await repo.findLeaveTypesByRole(schoolId, roleCode);
  if (dbTypes.length > 0) return dbTypes.map(t => ({ code: t.code, name: t.name }));
  const fallback = roleCode === 'parent' ? FALLBACK_PARENT_TYPES : FALLBACK_TEACHER_TYPES;
  return fallback;
}

/**
 * Returns effective day count for a leave range (calendar days minus week-offs and holidays).
 * Used by the frontend to show accurate day count before submitting.
 */
export async function calculateEffectiveDays(
  schoolId: string, startDate: string, endDate: string,
): Promise<{ effective_days: number; excluded_days: number; excluded_dates: string[] }> {
  const sd = new Date(startDate); sd.setUTCHours(0, 0, 0, 0);
  const ed = new Date(endDate);   ed.setUTCHours(0, 0, 0, 0);
  if (sd > ed) return { effective_days: 0, excluded_days: 0, excluded_dates: [] };

  const { weekoffDays, holidayDates } = await getSchoolCalendarInfo(schoolId);
  const effective = getEffectiveLeaveDates(sd, ed, weekoffDays, holidayDates);

  // Build excluded list
  const all: string[] = [];
  const cur = new Date(sd);
  while (cur <= ed) {
    all.push(cur.toISOString().split('T')[0]);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  const effectiveSet = new Set(effective.map(d => d.toISOString().split('T')[0]));
  const excluded = all.filter(d => !effectiveSet.has(d));

  return { effective_days: effective.length, excluded_days: excluded.length, excluded_dates: excluded };
}
