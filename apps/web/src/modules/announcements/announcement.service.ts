import { AppError } from '@/utils/errors';
import * as repo from './announcement.repo';
import type { AnnouncementRow } from './announcement.types';

export async function listAnnouncements(schoolId: string): Promise<{ announcements: AnnouncementRow[] }> {
  const items = await repo.findAnnouncements(schoolId);
  return {
    announcements: items.map((a) => ({
      id:               a.id,
      title:            a.title,
      message:          a.content,
      target_roles:     a.targetRoles,
      target_class_ids: a.targetClassIds,
      priority:         a.priority,
      status:           a.status,
      expires_at:       a.expiresAt,
      published_at:     a.createdAt,
      created_by_name:  a.createdByUser
        ? `${a.createdByUser.firstName} ${a.createdByUser.lastName}`
        : null,
    })),
  };
}

export async function createAnnouncement(schoolId: string, createdBy: string, body: Record<string, any>) {
  const { title, message, content, target_roles, audience, class_ids, expires_at, priority } = body;
  const announcementContent = content || message;
  if (!title || !announcementContent) throw new AppError('title and message are required');

  const targetRoles = target_roles || (audience && audience !== 'class' ? [audience] : ['student', 'parent', 'teacher']);
  const targetClassIds: string[] = Array.isArray(class_ids) ? class_ids : [];

  return repo.createAnnouncement({
    schoolId,
    title,
    content:       announcementContent,
    targetRoles,
    targetClassIds,
    priority:      priority || 'normal',
    expiresAt:     expires_at ? new Date(expires_at) : null,
    createdBy,
  });
}
