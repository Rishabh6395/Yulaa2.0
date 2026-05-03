import { AppError, ForbiddenError } from '@/utils/errors';
import { EMPLOYEE_ROLES } from '@/lib/roles';
import * as repo from './leave.repo';
import type { LeaveRow, LeaveBalanceRow } from './leave.types';
import prisma from '@/lib/prisma';
import { WEEKOFF_EPOCH_DATES, getAcademicYearsForRange, currentAcademicYearLabel } from '@/lib/school-utils';

// ── Academic year helper (April–March, India) ─────────────────────────────────

function currentAcademicYear(): { yearStart: Date; yearEnd: Date; label: string } {
  const now = new Date();
  const aprilStart = now.getMonth() >= 3
    ? new Date(now.getFullYear(), 3, 1)
    : new Date(now.getFullYear() - 1, 3, 1);
  const marchEnd = new Date(aprilStart.getFullYear() + 1, 2, 31);
  const y1 = aprilStart.getFullYear();
  const y2 = marchEnd.getFullYear();
  return { yearStart: aprilStart, yearEnd: marchEnd, label: currentAcademicYearLabel() };
}

// Fallback leave types shown only when school hasn't configured any yet.
// configured: false is returned alongside so admin UI can show a setup warning.
const FALLBACK_PARENT_TYPES  = [
  { code: 'sick',      name: 'Sick Leave' },
  { code: 'emergency', name: 'Emergency Leave' },
  { code: 'other',     name: 'Other' },
];
const FALLBACK_TEACHER_TYPES = [
  { code: 'sick',   name: 'Sick Leave' },
  { code: 'casual', name: 'Casual Leave' },
  { code: 'other',  name: 'Other' },
];

function daysBetween(start: Date, end: Date) {
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
}

// ── Weekoff/Holiday helpers ───────────────────────────────────────────────────

/** Load the school's weekoff day numbers from Leave Configuration DB entries. */
async function getSchoolWeekoffs(schoolId: string): Promise<number[]> {
  const entries = await prisma.holidayCalendar.findMany({
    where:  { schoolId, academicYear: '_weekoff_' },
    select: { date: true },
  });
  if (entries.length === 0) return [0, 6];
  return entries
    .map(w => WEEKOFF_EPOCH_DATES.indexOf(new Date(w.date).toISOString().split('T')[0]))
    .filter(d => d >= 0);
}

/** Load student weekoff days (from class timetable, fallback to leave-config). */
async function getStudentWeekoffs(schoolId: string, studentId: string): Promise<number[]> {
  const student = await prisma.student.findUnique({
    where: { id: studentId }, select: { classId: true },
  });
  if (student?.classId) {
    const tt = await prisma.timetable.findFirst({
      where: { schoolId, classId: student.classId, isActive: true },
      include: { slots: { select: { dayOfWeek: true } } },
    });
    if (tt && tt.slots.length > 0) {
      const scheduled = [...new Set(tt.slots.map(s => s.dayOfWeek))];
      return [0,1,2,3,4,5,6].filter(d => !scheduled.includes(d));
    }
  }
  return getSchoolWeekoffs(schoolId);
}

/** Load holidays that fall within a specific date range. */
async function getHolidayDatesInRange(schoolId: string, start: Date, end: Date): Promise<Set<string>> {
  const academicYears = getAcademicYearsForRange(start, end);
  const holidays = await prisma.holidayCalendar.findMany({
    where: { schoolId, academicYear: { in: academicYears }, date: { gte: start, lte: end } },
    select: { date: true },
  });
  return new Set(holidays.map(h => new Date(h.date).toISOString().split('T')[0]));
}

/** Count effective leave days (excluding weekoffs + holidays). */
async function countEffectiveDays(
  schoolId: string, start: Date, end: Date, weekoffs: number[],
): Promise<number> {
  const holidaySet = await getHolidayDatesInRange(schoolId, start, end);
  let count = 0;
  const cur = new Date(start); cur.setUTCHours(0,0,0,0);
  const endD = new Date(end);  endD.setUTCHours(0,0,0,0);
  while (cur <= endD) {
    const dow = cur.getUTCDay();
    const ds  = cur.toISOString().split('T')[0];
    if (!weekoffs.includes(dow) && !holidaySet.has(ds)) count++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}

export async function listLeaveRequests(
  schoolId: string | null, userId: string, roleCode: string, isAdmin: boolean,
  studentId?: string | null,
): Promise<{ leaves: LeaveRow[]; workflows: { parent: any; teacher: any } }> {
  const isTeacher = roleCode === 'teacher';
  const leaves = await repo.findLeaveRequests(
    schoolId,
    isAdmin    ? undefined : userId,
    isTeacher,              // teachers get own + parent/student leaves
    studentId ?? null,      // parents: restrict to selected child only
  );

  // schoolId is already known for all callers after route-level derivation
  const wfSchoolId: string | null = schoolId;
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

  // Reject if every day in the range is a weekoff or holiday
  const weekoffsForUser = student_id
    ? await getStudentWeekoffs(schoolId, student_id)
    : await getSchoolWeekoffs(schoolId);
  const effectiveDays = await countEffectiveDays(schoolId, sd, ed, weekoffsForUser);
  if (effectiveDays === 0) {
    throw new AppError('All selected dates fall on weekoffs or holidays. Please choose working days.');
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

export async function deleteLeave(schoolId: string, id: string) {
  if (!id) throw new AppError('id is required');
  const result = await repo.deleteLeaveRequest(id, schoolId);
  if (result.count === 0) throw new AppError('Leave not found or not in your school', 404);
  return { ok: true };
}

export async function withdrawLeave(userId: string, id: string) {
  if (!id) throw new AppError('id is required');
  // Load the leave before withdrawing so we can rollback attendance if it was approved
  const leave = await prisma.leaveRequest.findFirst({
    where: { id, userId },
    select: { status: true, studentId: true, startDate: true, endDate: true },
  });
  if (!leave) throw new AppError('Leave not found or cannot be withdrawn (must be pending or approved)');

  const result = await repo.withdrawLeaveRequest(id, userId);
  if (result.count === 0) throw new AppError('Leave not found or cannot be withdrawn (must be pending or approved)');

  // If this leave was approved and had auto-synced attendance, roll it back
  if (leave.status === 'approved' && leave.studentId) {
    await repo.rollbackLeaveAttendance(leave.studentId, leave.startDate, leave.endDate);
  }

  return { ok: true };
}

export async function reviewLeaveStep(
  reviewerId: string, schoolId: string, roleCode: string, body: Record<string, any>,
) {
  const { id, action, comment } = body;
  if (!id || !action) throw new AppError('id and action are required');
  if (!['approved', 'rejected'].includes(action)) throw new AppError('action must be approved or rejected');

  // Load leave directly (efficient single-row lookup)
  const leave = await repo.findLeaveById(id, schoolId);
  if (!leave) throw new AppError('Leave request not found');
  if (leave.status !== 'pending') throw new AppError(`Leave is already ${leave.status}`);

  // Load workflow and validate reviewer is authorised for the current step
  const wf = await repo.findLeaveWorkflow(schoolId, leave.roleCode);
  const totalSteps = wf?.steps.length ?? 1;

  if (wf && wf.steps.length > 0) {
    const step = wf.steps[leave.currentStep];
    if (step) {
      const roleMatch   = !step.approverRole   || step.approverRole   === roleCode;
      const userMatch   = !step.approverUserId || step.approverUserId === reviewerId;
      // Step requires EITHER a matching role OR a specific user; both must be satisfied if both are set
      const stepRoleOk  = step.approverRole   ? step.approverRole   === roleCode   : true;
      const stepUserOk  = step.approverUserId ? step.approverUserId === reviewerId : true;
      if (!stepRoleOk || !stepUserOk) {
        throw new ForbiddenError('You are not authorised to review this step');
      }
    }
  }

  const result = await repo.advanceLeaveStep(id, action as 'approved' | 'rejected', reviewerId, leave.currentStep, totalSteps, comment);

  // Deduct from TeacherLeaveBalance when an employee leave is finally approved
  if (action === 'approved' && result.status === 'approved' && EMPLOYEE_ROLES.includes(leave.roleCode) && !leave.studentId) {
    const weekoffs = await getSchoolWeekoffs(schoolId);
    const days = await countEffectiveDays(schoolId, leave.startDate, leave.endDate, weekoffs);
    if (days > 0) {
      const teacherId = await repo.findTeacherIdByUserId(schoolId, leave.userId);
      if (teacherId) {
        const { label: academicYear } = currentAcademicYear();
        await repo.incrementUsedDays(schoolId, teacherId, leave.leaveType, academicYear, days);
      }
    }
  }

  // Auto-sync attendance calendar when a student leave is finally approved
  if (action === 'approved' && result.status === 'approved' && leave.studentId) {
    const classId = await repo.findStudentClassId(leave.studentId);
    if (classId) {
      const weekoffs = await getStudentWeekoffs(schoolId, leave.studentId);
      const dates = await getEffectiveDatesInRange(schoolId, leave.startDate, leave.endDate, weekoffs);
      if (dates.length > 0) {
        await repo.syncLeaveToAttendance(schoolId, leave.studentId, classId, dates, reviewerId);
      }
    }
  }

  return result;
}

/** Returns effective dates in the leave range (excluding weekoffs + holidays). */
async function getEffectiveDatesInRange(
  schoolId: string, startDate: Date, endDate: Date, weekoffs: number[],
): Promise<Date[]> {
  const holidaySet = await getHolidayDatesInRange(schoolId, startDate, endDate);
  const dates: Date[] = [];
  const cur = new Date(startDate); cur.setUTCHours(0, 0, 0, 0);
  const end = new Date(endDate);   end.setUTCHours(0, 0, 0, 0);
  while (cur <= end) {
    const dow = cur.getUTCDay();
    const ds  = cur.toISOString().split('T')[0];
    if (!weekoffs.includes(dow) && !holidaySet.has(ds)) {
      dates.push(new Date(cur));
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

export async function getTeacherBalances(
  schoolId: string, userId: string, academicYear: string,
): Promise<{ balances: LeaveBalanceRow[]; configured: boolean }> {
  const teacherId = await repo.findTeacherIdByUserId(schoolId, userId);
  if (!teacherId) return { balances: [], configured: false };

  const [rows, dbTypes, policies] = await Promise.all([
    repo.findTeacherBalances(schoolId, teacherId, academicYear),
    repo.findLeaveTypesByRole(schoolId, 'teacher'),
    repo.findLeaveBalancePoliciesByRole(schoolId, 'teacher'),
  ]);

  const configured = dbTypes.length > 0 || policies.length > 0;

  // Use DB-configured leave types; fall back to generic defaults if none configured
  const typeList = dbTypes.length > 0
    ? dbTypes.map(t => t.code)
    : FALLBACK_TEACHER_TYPES.map(t => t.code);

  const result: LeaveBalanceRow[] = typeList.map(lt => {
    const row    = rows.find(r => r.leaveType === lt);
    const policy = policies.find(p => p.leaveType.code === lt);
    // Priority: uploaded balance > policy default > 0 (no arbitrary hardcoded values)
    const total  = row?.totalDays ?? policy?.daysPerYear ?? 0;
    const used   = row?.usedDays  ?? 0;
    return { leave_type: lt, total_days: total, used_days: used, remaining: Math.max(0, total - used) };
  });

  // Include any uploaded balances for types not in the master list
  rows.filter(r => !typeList.includes(r.leaveType)).forEach(r => {
    result.push({ leave_type: r.leaveType, total_days: r.totalDays, used_days: r.usedDays, remaining: Math.max(0, r.totalDays - r.usedDays) });
  });

  return { balances: result, configured };
}

// ── Student leave balance (dynamic — counts approved leave days per student) ───

export async function getStudentLeaveBalance(
  schoolId: string | null, studentId: string,
): Promise<{ total_days: number; used_days: number; remaining: number; configured: boolean }> {
  // Parents have no schoolId in their role — derive it from the student record
  const resolvedSchoolId = schoolId ?? await repo.findStudentSchoolId(studentId);
  if (!resolvedSchoolId) return { total_days: 0, used_days: 0, remaining: 0, configured: false };

  const { yearStart, yearEnd } = currentAcademicYear();
  const [usedDays, policies] = await Promise.all([
    repo.findStudentApprovedLeaveDays(resolvedSchoolId, studentId, yearStart, yearEnd),
    repo.findLeaveBalancePoliciesByRole(resolvedSchoolId, 'parent'),
  ]);
  const configured = policies.length > 0;
  const totalDays  = configured ? policies.reduce((s, p) => s + p.daysPerYear, 0) : 0;
  return { total_days: totalDays, used_days: usedDays, remaining: Math.max(0, totalDays - usedDays), configured };
}

// Exported for use by /api/leave/types.
// Returns configured: false when using fallbacks so the admin UI can show a setup prompt.
export async function getLeaveTypesForRole(
  schoolId: string | null, roleCode: string,
): Promise<{ types: { code: string; name: string }[]; configured: boolean }> {
  const fallback = roleCode === 'parent' ? FALLBACK_PARENT_TYPES : FALLBACK_TEACHER_TYPES;
  if (!schoolId) return { types: fallback, configured: false };
  const dbTypes = await repo.findLeaveTypesByRole(schoolId, roleCode);
  if (dbTypes.length > 0) return { types: dbTypes.map(t => ({ code: t.code, name: t.name })), configured: true };
  return { types: fallback, configured: false };
}
