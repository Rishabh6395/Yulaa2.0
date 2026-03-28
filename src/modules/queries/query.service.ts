import { AppError } from '@/utils/errors';
import * as repo from './query.repo';
import type { QueryRow } from './query.types';

export { QueryRow };

const QUERY_REVIEWER_ROLES = ['super_admin', 'school_admin', 'principal', 'hod', 'teacher'];

export async function listQueries(
  schoolId: string, userId: string, roleCode: string,
): Promise<{ queries: QueryRow[] }> {
  // Reviewers (admins + teachers) see all queries; others see only their own
  let parentId: string | undefined | null;
  if (!QUERY_REVIEWER_ROLES.includes(roleCode)) {
    const parent = await repo.findParentByUser(userId);
    parentId = parent?.id ?? null; // null → user has no parent record → show nothing
  }

  const items = await repo.findQueries(schoolId, parentId ?? undefined);
  return {
    queries: items.map((q) => ({
      id:               q.id,
      subject:          q.subject,
      message:          q.message,
      status:           q.status,
      response:         q.response,
      responded_at:     q.respondedAt,
      created_at:       q.createdAt,
      student_name:     q.student
        ? `${q.student.firstName} ${q.student.lastName}`
        : null,
      raised_by_name:   q.parent
        ? `${q.parent.user.firstName} ${q.parent.user.lastName}`
        : null,
      assigned_to_name: q.respondedByUser
        ? `${q.respondedByUser.firstName} ${q.respondedByUser.lastName}`
        : null,
    })),
  };
}

export async function submitQuery(schoolId: string, userId: string, body: Record<string, any>) {
  const { subject, message, student_id } = body;
  if (!subject || !message) throw new AppError('subject and message are required');

  const parent = await repo.findParentByUser(userId);
  return repo.createQuery({
    schoolId,
    studentId: student_id || null,
    parentId:  parent?.id  || null,
    subject,
    message,
  });
}

export async function respondToQuery(respondedBy: string, body: Record<string, any>) {
  const { id, response, status } = body;
  if (!id) throw new AppError('id is required');

  return repo.respondToQuery(id, respondedBy, {
    ...(response !== undefined && { response }),
    ...(status                 && { status }),
  });
}

export async function confirmResolveQuery(body: Record<string, any>) {
  const { id } = body;
  if (!id) throw new AppError('id is required');
  return repo.confirmResolveQuery(id);
}

export async function reopenQuery(body: Record<string, any>) {
  const { id, reopen_comment } = body;
  if (!id) throw new AppError('id is required');
  return repo.reopenQuery(id, reopen_comment);
}
