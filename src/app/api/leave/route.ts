import { getUserFromRequest } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
  const schoolId = primaryRole.school_id!;
  const isAdmin = ['super_admin', 'school_admin'].includes(primaryRole.role_code);

  try {
    const leaves = await prisma.leaveRequest.findMany({
      where: {
        schoolId,
        ...(!isAdmin && { userId: user.id }),
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
        reviewedByUser: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const rows = leaves.map((lr) => ({
      id: lr.id,
      role_code: lr.roleCode,
      start_date: lr.startDate,
      end_date: lr.endDate,
      reason: lr.reason,
      status: lr.status,
      created_at: lr.createdAt,
      reviewed_at: lr.reviewedAt,
      requester_name: `${lr.user.firstName} ${lr.user.lastName}`,
      approved_by_name: lr.reviewedByUser
        ? `${lr.reviewedByUser.firstName} ${lr.reviewedByUser.lastName}`
        : null,
    }));

    return Response.json({ leaves: rows });
  } catch (err) {
    console.error('Leave GET error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
  const schoolId = primaryRole.school_id!;

  try {
    const body = await request.json();
    const { start_date, end_date, reason } = body;

    if (!start_date || !end_date || !reason) {
      return Response.json({ error: 'start_date, end_date, and reason are required' }, { status: 400 });
    }

    const leave = await prisma.leaveRequest.create({
      data: {
        schoolId,
        userId: user.id,
        roleCode: primaryRole.role_code,
        startDate: new Date(start_date),
        endDate: new Date(end_date),
        reason,
      },
    });

    return Response.json({ leave }, { status: 201 });
  } catch (err) {
    console.error('Leave POST error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
  const isAdmin = ['super_admin', 'school_admin'].includes(primaryRole.role_code);
  if (!isAdmin) return Response.json({ error: 'Admin access required' }, { status: 403 });

  try {
    const { id, status } = await request.json();

    if (!id || !status) {
      return Response.json({ error: 'id and status required' }, { status: 400 });
    }

    const leave = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        reviewedBy: user.id,
        reviewedAt: new Date(),
      },
    });

    return Response.json({ leave });
  } catch (err: any) {
    if (err.code === 'P2025') {
      return Response.json({ error: 'Leave request not found' }, { status: 404 });
    }
    console.error('Leave PATCH error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
