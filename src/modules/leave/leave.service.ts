import { AppError } from '@/utils/errors';
import * as repo from './leave.repo';
import type { LeaveRow } from './leave.types';

export async function listLeaveRequests(schoolId: string, userId: string, isAdmin: boolean): Promise<{ leaves: LeaveRow[] }> {
  const leaves = await repo.findLeaveRequests(schoolId, isAdmin ? undefined : userId);
  return {
    leaves: leaves.map((lr) => ({
      id:               lr.id,
      role_code:        lr.roleCode,
      leave_type:       lr.reason?.startsWith('Leave type: ')
                          ? lr.reason.replace('Leave type: ', '')
                          : 'other',
      start_date:       lr.startDate,
      end_date:         lr.endDate,
      reason:           lr.reason,
      status:           lr.status,
      created_at:       lr.createdAt,
      reviewed_at:      lr.reviewedAt,
      requester_name:   `${lr.user.firstName} ${lr.user.lastName}`,
      student_name:     null,
      approved_by_name: lr.reviewedByUser
        ? `${lr.reviewedByUser.firstName} ${lr.reviewedByUser.lastName}`
        : null,
    })),
  };
}

export async function submitLeaveRequest(schoolId: string, userId: string, roleCode: string, body: Record<string, any>) {
  const { start_date, end_date, reason, leave_type } = body;
  if (!start_date || !end_date) {
    throw new AppError('start_date and end_date are required');
  }
  if (!schoolId) throw new AppError('School association not found for this user');
  return repo.createLeaveRequest({
    schoolId,
    userId,
    roleCode,
    startDate: new Date(start_date),
    endDate:   new Date(end_date),
    reason:    reason || (leave_type ? `Leave type: ${leave_type}` : 'Leave requested'),
  });
}

export async function reviewLeaveRequest(reviewerId: string, body: Record<string, any>) {
  const { id, status } = body;
  if (!id || !status) throw new AppError('id and status are required');
  return repo.reviewLeaveRequest(id, status, reviewerId);
}
