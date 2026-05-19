/**
 * PATCH /api/notifications/[id] — mark a notification as read
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, NotFoundError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const isRead = body.isRead !== false; // default true

    const notif = await prisma.notification.findUnique({ where: { id }, select: { id: true, userId: true } });
    if (!notif) throw new NotFoundError('Notification');
    if (notif.userId !== user.id) throw new ForbiddenError('Access denied');

    const updated = await prisma.notification.update({ where: { id }, data: { isRead } });
    return Response.json({ notification: updated });
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const { id } = await params;
    const notif = await prisma.notification.findUnique({ where: { id }, select: { id: true, userId: true } });
    if (!notif) throw new NotFoundError('Notification');
    if (notif.userId !== user.id) throw new ForbiddenError('Access denied');

    await prisma.notification.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
