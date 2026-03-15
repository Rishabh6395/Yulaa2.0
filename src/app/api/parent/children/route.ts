import { getUserFromRequest } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const isParent = user.roles.some((r) => r.role_code === 'parent');
  if (!isParent) return Response.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const parent = await prisma.parent.findUnique({ where: { userId: user.id } });
    if (!parent) {
      return Response.json({ error: 'Parent profile not found' }, { status: 404 });
    }

    const links = await prisma.parentStudent.findMany({
      where: { parentId: parent.id },
      include: {
        student: {
          include: {
            school: true,
            class: true,
          },
        },
      },
      orderBy: [
        { isPrimary: 'desc' },
        { student: { firstName: 'asc' } },
      ],
    });

    const children = links.map((ps) => ({
      id: ps.student.id,
      first_name: ps.student.firstName,
      last_name: ps.student.lastName,
      admission_no: ps.student.admissionNo,
      photo_url: ps.student.photoUrl,
      school_id: ps.student.schoolId,
      school_name: ps.student.school.name,
      class_id: ps.student.classId,
      grade: ps.student.class?.grade ?? null,
      section: ps.student.class?.section ?? null,
      relationship: ps.relationship,
      is_primary_child: ps.isPrimary,
    }));

    return Response.json({ children });
  } catch (err) {
    console.error('Parent children error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
