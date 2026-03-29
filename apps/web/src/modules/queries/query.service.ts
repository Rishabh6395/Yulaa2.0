import { AppError } from '@/utils/errors';
import * as repo from './query.repo';

function genTicketNo(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'TKT-';
  for (let i = 0; i < 7; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export async function listQueries(
  schoolId: string, userId: string, roleCode: string,
) {
  const items = await repo.findQueries(schoolId, userId, roleCode);
  return {
    queries: items.map((q) => ({
      id:             q.id,
      ticket_no:      q.ticketNo,
      school_id:      q.schoolId,
      raised_by_id:   q.raisedById,
      raised_by_role: q.raisedByRole,
      raised_by_name: `${q.raisedBy.firstName} ${q.raisedBy.lastName}`,
      query_type:     q.queryType,
      subject:        q.subject,
      description:    q.description,
      status:         q.status,
      attachments:    q.attachments,
      created_at:     q.createdAt,
      updated_at:     q.updatedAt,
      replies: q.replies.map((r) => ({
        id:         r.id,
        message:    r.message,
        user_name:  `${r.user.firstName} ${r.user.lastName}`,
        user_id:    r.userId,
        created_at: r.createdAt,
      })),
    })),
  };
}

export async function submitQuery(
  schoolId: string, userId: string, roleCode: string, body: Record<string, any>,
) {
  const { subject, description, query_type, attachments } = body;
  if (!subject?.trim())      throw new AppError('subject is required');
  if (!description?.trim())  throw new AppError('description is required');
  if (!['parent', 'school_admin'].includes(roleCode))
    throw new AppError('Only parents and school admins can raise queries');

  // Generate unique ticket number (retry on collision)
  let ticketNo = '';
  for (let i = 0; i < 5; i++) {
    const t = genTicketNo();
    const exists = await repo.findByTicket(t);
    if (!exists) { ticketNo = t; break; }
  }
  if (!ticketNo) throw new AppError('Failed to generate ticket number, please retry');

  return repo.createQuery({
    ticketNo,
    schoolId,
    raisedById:   userId,
    raisedByRole: roleCode,
    queryType:    query_type || null,
    subject:      subject.trim(),
    description:  description.trim(),
    attachments:  Array.isArray(attachments) ? attachments : [],
  });
}

export async function addReply(
  userId: string, roleCode: string, body: Record<string, any>,
) {
  const { id, message } = body;
  if (!id)            throw new AppError('id is required');
  if (!message?.trim()) throw new AppError('message is required');

  const query = await repo.findById(id);
  if (!query) throw new AppError('Query not found', 404);

  // Who can reply?
  // parent/school_admin who raised it can also reply (follow-up)
  // school_admin can reply to parent queries
  // super_admin can reply to school_admin queries
  const canReply =
    query.raisedById === userId ||
    (query.raisedByRole === 'parent'       && roleCode === 'school_admin') ||
    (query.raisedByRole === 'school_admin' && roleCode === 'super_admin');
  if (!canReply) throw new AppError('You are not authorised to reply to this query', 403);

  const reply = await repo.createReply({ queryId: id, userId, message: message.trim() });

  // Move to in_progress when responder (not raiser) first replies
  if (query.raisedById !== userId && query.status === 'open') {
    await repo.updateStatus(id, 'in_progress');
  }

  return reply;
}

export async function resolveQuery(userId: string, id: string) {
  const query = await repo.findById(id);
  if (!query) throw new AppError('Query not found', 404);
  if (query.raisedById !== userId) throw new AppError('Only the requester can resolve this query', 403);
  return repo.updateStatus(id, 'resolved');
}

export async function reopenQuery(userId: string, id: string) {
  const query = await repo.findById(id);
  if (!query) throw new AppError('Query not found', 404);
  if (query.raisedById !== userId) throw new AppError('Only the requester can reopen this query', 403);
  if (query.status !== 'resolved') throw new AppError('Only resolved queries can be reopened');
  return repo.updateStatus(id, 'open');
}
