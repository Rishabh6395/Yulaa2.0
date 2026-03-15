import { getUserFromRequest } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
  const schoolId = primaryRole.school_id!;

  try {
    const classes = await prisma.class.findMany({
      where: { schoolId },
      include: {
        classTeacher: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        _count: {
          select: {
            students: { where: { status: 'active' } },
          },
        },
      },
      orderBy: [{ grade: 'asc' }, { section: 'asc' }],
    });

    const rows = classes.map((c) => ({
      id: c.id,
      grade: c.grade,
      section: c.section,
      capacity: c.maxStudents,
      academic_year: c.academicYear,
      teacher_name: c.classTeacher
        ? `${c.classTeacher.user.firstName} ${c.classTeacher.user.lastName}`
        : null,
      student_count: c._count.students,
    }));

    return Response.json({ classes: rows });
  } catch (err) {
    console.error('Classes GET error:', err);
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
    const { grade, section, class_teacher_id, academic_year, max_students, name } = body;

    if (!grade || !section) {
      return Response.json({ error: 'grade and section are required' }, { status: 400 });
    }

    const cls = await prisma.class.create({
      data: {
        schoolId,
        name: name || `${grade}-${section}`,
        grade,
        section,
        classTeacherId: class_teacher_id || null,
        academicYear: academic_year || '2025-2026',
        maxStudents: max_students || 40,
      },
    });

    return Response.json({ class: cls }, { status: 201 });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return Response.json({ error: 'Class already exists for this grade/section/year' }, { status: 409 });
    }
    console.error('Classes POST error:', err);
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
    const body = await request.json();
    const { id, grade, section, class_teacher_id, academic_year, max_students, name } = body;

    if (!id) return Response.json({ error: 'id is required' }, { status: 400 });

    const cls = await prisma.class.update({
      where: { id },
      data: {
        ...(grade && { grade }),
        ...(section && { section }),
        ...(name && { name }),
        ...(class_teacher_id !== undefined && { classTeacherId: class_teacher_id || null }),
        ...(academic_year && { academicYear: academic_year }),
        ...(max_students && { maxStudents: max_students }),
      },
    });

    return Response.json({ class: cls });
  } catch (err: any) {
    if (err.code === 'P2025') {
      return Response.json({ error: 'Class not found' }, { status: 404 });
    }
    console.error('Classes PATCH error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
