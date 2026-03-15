import { getUserFromRequest } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
  const schoolId = primaryRole.school_id!;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const classId = searchParams.get('class_id');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const skip = (page - 1) * limit;

  try {
    const where: Parameters<typeof prisma.student.findMany>[0]['where'] = {
      schoolId,
      ...(status && { status }),
      ...(classId && { classId }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { admissionNo: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [total, students] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        include: {
          class: true,
          parentStudents: {
            include: {
              parent: {
                include: { user: { select: { firstName: true, lastName: true, phone: true, email: true } } },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const rows = students.map((s) => ({
      id: s.id,
      admission_no: s.admissionNo,
      first_name: s.firstName,
      last_name: s.lastName,
      dob: s.dateOfBirth,
      gender: s.gender,
      admission_status: s.status,
      admission_date: s.createdAt,
      photo_url: s.photoUrl,
      address: s.address,
      grade: s.class?.grade ?? null,
      section: s.class?.section ?? null,
      class_id: s.classId,
      parents: s.parentStudents.map((ps) => ({
        name: `${ps.parent.user.firstName} ${ps.parent.user.lastName}`,
        phone: ps.parent.user.phone,
        email: ps.parent.user.email,
      })),
    }));

    return Response.json({
      students: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Students GET error:', err);
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
    const { admission_no, first_name, last_name, dob, gender, class_id, address, blood_group, medical_notes } = body;

    if (!admission_no || !first_name || !last_name) {
      return Response.json({ error: 'Required fields: admission_no, first_name, last_name' }, { status: 400 });
    }

    const student = await prisma.student.create({
      data: {
        schoolId,
        classId: class_id || null,
        admissionNo: admission_no,
        firstName: first_name,
        lastName: last_name,
        dateOfBirth: dob ? new Date(dob) : null,
        gender: gender || null,
        address: address || null,
        bloodGroup: blood_group || null,
        status: 'pending',
      },
    });

    return Response.json({ student }, { status: 201 });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return Response.json({ error: 'Admission number already exists for this school' }, { status: 409 });
    }
    console.error('Students POST error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { id, admission_status } = body;

    if (!id || !admission_status) {
      return Response.json({ error: 'id and admission_status required' }, { status: 400 });
    }

    const student = await prisma.student.update({
      where: { id },
      data: { status: admission_status },
    });

    return Response.json({ student });
  } catch (err: any) {
    if (err.code === 'P2025') {
      return Response.json({ error: 'Student not found' }, { status: 404 });
    }
    console.error('Students PATCH error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
