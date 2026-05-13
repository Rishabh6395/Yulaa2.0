import { AppError } from '@/utils/errors';
import * as repo from './query.repo';

// Roles that raise queries TO school_admin
const SCHOOL_ROLES = ['parent', 'teacher', 'student', 'hod', 'principal', 'employee', 'vendor', 'consultant'];

function genTicketNo(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'TKT-';
  for (let i = 0; i < 7; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export async function listQueries(schoolId: string | null, userId: string, roleCode: string) {
  const items = await repo.findQueries(schoolId, userId, roleCode);
  return {
    queries: items.map((q) => ({
      id:             q.id,
      ticket_no:      q.ticketNo,
      school_id:      q.schoolId,
      school_name:    q.school?.name ?? null,
      raised_by_id:   q.raisedById,
      raised_by_role: q.raisedByRole,
      raised_by_name: `${q.raisedBy.firstName} ${q.raisedBy.lastName}`,
      query_type:     q.queryType,
      priority:       q.priority,
      subject:        q.subject,
      description:    q.description,
      status:         q.status,
      attachments:    (q.attachments ?? []).map(safeParseAttachment),
      created_at:     q.createdAt,
      updated_at:     q.updatedAt,
      replies: q.replies.map((r) => ({
        id:          r.id,
        message:     r.message,
        user_name:   `${r.user.firstName} ${r.user.lastName}`,
        user_id:     r.userId,
        created_at:  r.createdAt,
        attachments: (r.attachments ?? []).map(safeParseAttachment),
      })),
    })),
  };
}

function safeParseAttachment(raw: string) {
  try { return JSON.parse(raw); } catch { return { name: raw, url: raw, type: 'application/octet-stream', size: 0 }; }
}

export async function submitQuery(
  schoolId: string | null, userId: string, roleCode: string, body: Record<string, any>,
) {
  if (roleCode === 'super_admin')
    throw new AppError('Super admins cannot raise queries through this portal. Please contact Yulaa support directly.');
  if (!schoolId)
    throw new AppError('Your account is not linked to a school. Please contact your administrator.');

  const { subject, description, query_type, priority, attachments } = body;
  if (!subject?.trim())
    throw new AppError('Subject is required. Please enter a brief summary of your query.');
  if (!description?.trim())
    throw new AppError('Description is required. Please describe your issue so it can be resolved promptly.');

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
    priority:     ['urgent','high','normal','low'].includes(priority) ? priority : 'normal',
    subject:      subject.trim(),
    description:  description.trim(),
    attachments:  Array.isArray(attachments) ? attachments.map((a: any) => JSON.stringify(a)) : [],
  });
}

export async function addReply(
  userId: string, schoolId: string | null, roleCode: string, body: Record<string, any>,
) {
  const { id, message, attachments } = body;
  if (!id) throw new AppError('Query ID is required.');
  if (!message?.trim() && (!attachments || attachments.length === 0))
    throw new AppError('Please enter a message or attach a file before sending the reply.');

  const query = await repo.findById(id);
  if (!query) throw new AppError('Query not found', 404);

  // Permission: who can reply?
  // 1. The original requester (follow-up)
  // 2. school_admin replying to their school's queries (from any school role)
  // 3. super_admin replying to school_admin queries
  const isRequester   = query.raisedById === userId;
  const isSchoolAdmin = roleCode === 'school_admin' && query.schoolId === schoolId && SCHOOL_ROLES.includes(query.raisedByRole);
  const isSuperAdmin  = roleCode === 'super_admin' && query.raisedByRole === 'school_admin';
  // school_admin can also follow up on their own escalated queries
  const isOwnEscalation = query.raisedById === userId;

  if (!isRequester && !isSchoolAdmin && !isSuperAdmin && !isOwnEscalation) {
    throw new AppError('You do not have permission to reply to this query. Only the original submitter or an admin can respond.', 403);
  }

  const reply = await repo.createReply({
    queryId:     id,
    userId,
    message:     message?.trim() ?? '',
    attachments: Array.isArray(attachments) ? attachments.map((a: any) => JSON.stringify(a)) : [],
  });

  // Move to in_progress when responder (not raiser) first replies
  if (!isRequester && query.status === 'open') {
    await repo.updateStatus(id, 'in_progress');
  }

  return reply;
}

export async function resolveQuery(userId: string, schoolId: string | null, roleCode: string, id: string) {
  const query = await repo.findById(id);
  if (!query) throw new AppError('Query not found', 404);

  // Who can resolve?
  // 1. Original requester
  // 2. school_admin for queries in their school
  // 3. super_admin for school_admin queries
  const canResolve =
    query.raisedById === userId ||
    (roleCode === 'school_admin' && query.schoolId === schoolId) ||
    (roleCode === 'super_admin' && query.raisedByRole === 'school_admin');

  if (!canResolve) throw new AppError('You are not authorised to resolve this query', 403);
  return repo.updateStatus(id, 'resolved');
}

export async function reopenQuery(userId: string, id: string) {
  const query = await repo.findById(id);
  if (!query) throw new AppError('Query not found', 404);
  if (query.raisedById !== userId) throw new AppError('Only the requester can reopen this query', 403);
  if (query.status !== 'resolved') throw new AppError('Only resolved queries can be reopened');
  return repo.updateStatus(id, 'open');
}

// SLA policy management (super_admin only)
export { listSlaPolicies, upsertSlaPolicy } from './query.repo';
