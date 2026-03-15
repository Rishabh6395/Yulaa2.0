import { getUserFromRequest } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
  const schoolId = primaryRole.school_id!;

  try {
    const queries = await prisma.studentQuery.findMany({
      where: { schoolId },
      include: {
        student: { select: { firstName: true, lastName: true } },
        parent: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        respondedByUser: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const rows = queries.map((q) => ({
      id: q.id,
      subject: q.subject,
      message: q.message,
      status: q.status,
      response: q.response,
      responded_at: q.respondedAt,
      created_at: q.createdAt,
      student_name: q.student
        ? `${q.student.firstName} ${q.student.lastName}`
        : null,
      raised_by_name: q.parent
        ? `${q.parent.user.firstName} ${q.parent.user.lastName}`
        : null,
      assigned_to_name: q.respondedByUser
        ? `${q.respondedByUser.firstName} ${q.respondedByUser.lastName}`
        : null,
    }));

    return Response.json({ queries: rows });
  } catch (err) {
    console.error('Queries GET error:', err);
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
    const { subject, message, student_id } = body;

    if (!subject || !message) {
      return Response.json({ error: 'subject and message are required' }, { status: 400 });
    }

    // Get parent record if exists
    const parent = await prisma.parent.findUnique({ where: { userId: user.id } });

    const query = await prisma.studentQuery.create({
      data: {
        schoolId,
        studentId: student_id || null,
        parentId: parent?.id || null,
        subject,
        message,
      },
    });

    return Response.json({ query }, { status: 201 });
  } catch (err) {
    console.error('Queries POST error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
  const isAdminOrTeacher = ['super_admin', 'school_admin', 'teacher'].includes(primaryRole.role_code);
  if (!isAdminOrTeacher) {
    return Response.json({ error: 'Admin or teacher access required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, response, status } = body;

    if (!id) return Response.json({ error: 'id is required' }, { status: 400 });

    const query = await prisma.studentQuery.update({
      where: { id },
      data: {
        ...(response !== undefined && { response }),
        ...(status && { status }),
        respondedBy: user.id,
        respondedAt: new Date(),
      },
    });

    return Response.json({ query });
  } catch (err: any) {
    if (err.code === 'P2025') {
      return Response.json({ error: 'Query not found' }, { status: 404 });
    }
    console.error('Queries PATCH error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
