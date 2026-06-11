/**
 * GET    /api/notifications/inbox              — list user's in-app notifications
 * PATCH  /api/notifications/inbox              — mark read: { id } or { all: true }
 * DELETE /api/notifications/inbox?id=X         — delete a notification
 *
 * Query params:
 *   unread_only=true   — only unread items
 *   limit=N            — page size (default 20, max 100)
 *   page=N             — page number (default 1)
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread_only') === 'true';
    const limit      = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);
    const page       = Math.max(parseInt(searchParams.get('page')  ?? '1'), 1);
    const where      = { userId: user.id, ...(unreadOnly ? { isRead: false } : {}) };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.inAppNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip:    (page - 1) * limit,
        take:    limit,
      }),
      prisma.inAppNotification.count({ where }),
      prisma.inAppNotification.count({ where: { userId: user.id, isRead: false } }),
    ]);

    return Response.json({ notifications, total, unreadCount, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const body = await request.json();

    if (body.all) {
      const { count } = await prisma.inAppNotification.updateMany({
        where: { userId: user.id, isRead: false },
        data:  { isRead: true, readAt: new Date() },
      });
      return Response.json({ marked: count });
    }

    if (body.id) {
      const notif = await prisma.inAppNotification.findUnique({ where: { id: body.id } });
      if (!notif || notif.userId !== user.id) throw new AppError('Notification not found', 404);
      const updated = await prisma.inAppNotification.update({
        where: { id: body.id },
        data:  { isRead: true, readAt: new Date() },
      });
      return Response.json({ notification: updated });
    }

    throw new AppError('Provide id or all: true');
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new AppError('id required');
    const notif = await prisma.inAppNotification.findUnique({ where: { id } });
    if (!notif || notif.userId !== user.id) throw new AppError('Notification not found', 404);
    await prisma.inAppNotification.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
