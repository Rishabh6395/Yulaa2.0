import { getUserFromRequest } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
  const schoolId = primaryRole.school_id!;
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('class_id');
  const status = searchParams.get('status');

  try {
    const homework = await prisma.homework.findMany({
      where: {
        schoolId,
        ...(classId && { classId }),
      },
      include: {
        class: true,
        teacher: { include: { user: true } },
        _count: {
          select: { submissions: true },
        },
      },
      orderBy: { dueDate: 'desc' },
    });

    const rows = await Promise.all(
      homework.map(async (h) => {
        const totalStudents = await prisma.student.count({
          where: { classId: h.classId, status: 'active' },
        });

        return {
          id: h.id,
          subject: h.subject,
          title: h.title,
          description: h.description,
          due_date: h.dueDate,
          created_at: h.createdAt,
          grade: h.class.grade,
          section: h.class.section,
          teacher_name: `${h.teacher.user.firstName} ${h.teacher.user.lastName}`,
          submissions: h._count.submissions,
          total_students: totalStudents,
        };
      })
    );

    return Response.json({ homework: rows });
  } catch (err) {
    console.error('Homework GET error:', err);
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
    const { class_id, subject, title, description, due_date } = body;

    if (!class_id || !subject || !title || !due_date) {
      return Response.json({ error: 'class_id, subject, title, and due_date are required' }, { status: 400 });
    }

    const teacher = await prisma.teacher.findUnique({
      where: { userId_schoolId: { userId: user.id, schoolId } },
    });

    if (!teacher) {
      return Response.json({ error: 'Teacher record not found' }, { status: 403 });
    }

    const homework = await prisma.homework.create({
      data: {
        schoolId,
        classId: class_id,
        teacherId: teacher.id,
        subject,
        title,
        description: description || null,
        dueDate: new Date(due_date),
      },
    });

    return Response.json({ homework }, { status: 201 });
  } catch (err) {
    console.error('Homework POST error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { id, subject, title, description, due_date } = body;

    if (!id) return Response.json({ error: 'id is required' }, { status: 400 });

    const homework = await prisma.homework.update({
      where: { id },
      data: {
        ...(subject && { subject }),
        ...(title && { title }),
        ...(description !== undefined && { description: description || null }),
        ...(due_date && { dueDate: new Date(due_date) }),
      },
    });

    return Response.json({ homework });
  } catch (err: any) {
    if (err.code === 'P2025') {
      return Response.json({ error: 'Homework not found' }, { status: 404 });
    }
    console.error('Homework PATCH error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
