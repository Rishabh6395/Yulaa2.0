import { getUserFromRequest } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
  const schoolId = primaryRole.school_id!;

  try {
    const announcements = await prisma.announcement.findMany({
      where: { schoolId },
      include: {
        createdByUser: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const rows = announcements.map((a) => ({
      id: a.id,
      title: a.title,
      message: a.content,
      target_roles: a.targetRoles,
      priority: a.priority,
      status: a.status,
      expires_at: a.expiresAt,
      published_at: a.createdAt,
      created_by_name: a.createdByUser
        ? `${a.createdByUser.firstName} ${a.createdByUser.lastName}`
        : null,
    }));

    return Response.json({ announcements: rows });
  } catch (err) {
    console.error('Announcements GET error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
  const isAdmin = ['super_admin', 'school_admin'].includes(primaryRole.role_code);
  if (!isAdmin) return Response.json({ error: 'Admin access required' }, { status: 403 });

  const schoolId = primaryRole.school_id!;

  try {
    const body = await request.json();
    const { title, message, content, type, audience, target_roles, expires_at, priority } = body;

    const announcementContent = content || message;
    if (!title || !announcementContent) {
      return Response.json({ error: 'title and message are required' }, { status: 400 });
    }

    const roles: string[] = target_roles || (audience ? [audience] : ['all']);

    const announcement = await prisma.announcement.create({
      data: {
        schoolId,
        title,
        content: announcementContent,
        targetRoles: roles,
        priority: priority || 'normal',
        expiresAt: expires_at ? new Date(expires_at) : null,
        createdBy: user.id,
      },
    });

    return Response.json({ announcement }, { status: 201 });
  } catch (err) {
    console.error('Announcements POST error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
