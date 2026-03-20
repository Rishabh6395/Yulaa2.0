import { getUserFromRequest } from '@/lib/auth';
import { listAnnouncements, createAnnouncement } from '@/modules/announcements/announcement.service';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';

export async function GET(request: Request) {
  try {
    const user        = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    return Response.json(await listAnnouncements(primaryRole.school_id!));
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user        = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!['super_admin', 'school_admin'].includes(primaryRole.role_code)) throw new ForbiddenError('Admin access required');
    const announcement = await createAnnouncement(primaryRole.school_id!, user.id, await request.json());
    return Response.json({ announcement }, { status: 201 });
  } catch (err) { return handleError(err); }
}
