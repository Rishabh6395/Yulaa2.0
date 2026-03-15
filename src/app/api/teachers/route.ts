import bcrypt from 'bcryptjs';
import { getUserFromRequest } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
  const schoolId = primaryRole.school_id!;

  try {
    const teachers = await prisma.teacher.findMany({
      where: { schoolId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [{ user: { firstName: 'asc' } }, { user: { lastName: 'asc' } }],
    });

    const rows = teachers.map((t) => ({
      id: t.id,
      employee_id: t.employeeId,
      qualification: t.qualification,
      joining_date: t.joiningDate,
      status: t.status,
      first_name: t.user.firstName,
      last_name: t.user.lastName,
      email: t.user.email,
      phone: t.user.phone,
      avatar_url: t.user.avatarUrl,
    }));

    return Response.json({ teachers: rows });
  } catch (err) {
    console.error('Teachers GET error:', err);
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
    const {
      email,
      password,
      first_name,
      last_name,
      phone,
      employee_id,
      qualification,
      joining_date,
    } = body;

    if (!email || !password || !first_name || !last_name) {
      return Response.json(
        { error: 'email, password, first_name, and last_name are required' },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Find teacher role
    const teacherRole = await prisma.role.findUnique({ where: { code: 'teacher' } });
    if (!teacherRole) {
      return Response.json({ error: 'Teacher role not found' }, { status: 500 });
    }

    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        firstName: first_name,
        lastName: last_name,
        phone: phone || null,
        userRoles: {
          create: {
            roleId: teacherRole.id,
            schoolId,
            isPrimary: true,
          },
        },
        teachers: {
          create: {
            schoolId,
            employeeId: employee_id || null,
            qualification: qualification || null,
            joiningDate: joining_date ? new Date(joining_date) : null,
          },
        },
      },
      include: {
        teachers: true,
      },
    });

    return Response.json({ teacher: newUser.teachers[0] }, { status: 201 });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return Response.json({ error: 'Email already in use' }, { status: 409 });
    }
    console.error('Teachers POST error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
