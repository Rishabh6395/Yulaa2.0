import { AppError } from '@/utils/errors';
import * as repo from './leave.repo';
import type { LeaveRow } from './leave.types';

export async function listLeaveRequests(schoolId: string, userId: string, isAdmin: boolean): Promise<{ leaves: LeaveRow[] }> {
  const leaves = await repo.findLeaveRequests(schoolId, isAdmin ? undefined : userId);
  return {
    leaves: leaves.map((lr) => ({
      id:               lr.id,
      role_code:        lr.roleCode,
      start_date:       lr.startDate,
      end_date:         lr.endDate,
      reason:           lr.reason,
      status:           lr.status,
      created_at:       lr.createdAt,
      reviewed_at:      lr.reviewedAt,
      requester_name:   `${lr.user.firstName} ${lr.user.lastName}`,
      approved_by_name: lr.reviewedByUser
        ? `${lr.reviewedByUser.firstName} ${lr.reviewedByUser.lastName}`
        : null,
    })),
  };
}

export async function submitLeaveRequest(schoolId: string, userId: string, roleCode: string, body: Record<string, any>) {
  const { start_date, end_date, reason } = body;
  if (!start_date || !end_date || !reason) {
    throw new AppError('start_date, end_date, and reason are required');
  }
  return repo.createLeaveRequest({
    schoolId,
    userId,
    roleCode,
    startDate: new Date(start_date),
    endDate:   new Date(end_date),
    reason,
  });
}

export async function reviewLeaveRequest(reviewerId: string, body: Record<string, any>) {
  const { id, status } = body;
  if (!id || !status) throw new AppError('id and status are required');
  return repo.reviewLeaveRequest(id, status, reviewerId);
}
