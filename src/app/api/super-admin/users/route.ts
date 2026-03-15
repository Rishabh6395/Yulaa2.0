import { getUserFromRequest } from '@/lib/auth';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

function requireSuperAdmin(user: Awaited<ReturnType<typeof getUserFromRequest>>) {
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const isSuperAdmin = user.roles.some((r) => r.role_code === 'super_admin');
  if (!isSuperAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}

// GET /api/super-admin/users  → list all users with their roles
// GET /api/super-admin/users?roles=1 → list roles only
export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  const err  = requireSuperAdmin(user);
  if (err) return err;

  const { searchParams } = new URL(request.url);

  if (searchParams.get('roles') === '1') {
    const roles = await prisma.role.findMany({ orderBy: { displayName: 'asc' } });
    return Response.json({ roles });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      status: true,
      createdAt: true,
      userRoles: {
        include: {
          role:   true,
          school: { select: { id: true, name: true } },
        },
      },
    },
  });

  return Response.json({ users });
}

// POST /api/super-admin/users  → create user + assign role
export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  const err  = requireSuperAdmin(user);
  if (err) return err;

  const body = await request.json();
  const { firstName, lastName, email, phone, password, roleId, schoolId } = body;

  if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !password || !roleId) {
    return Response.json({ error: 'firstName, lastName, email, password and roleId are required' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (existing) return Response.json({ error: 'A user with this email already exists' }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 12);

  const newUser = await prisma.user.create({
    data: {
      firstName:    firstName.trim(),
      lastName:     lastName.trim(),
      email:        email.trim().toLowerCase(),
      phone:        phone?.trim() || null,
      passwordHash,
      status:       'active',
      userRoles: {
        create: {
          roleId,
          schoolId: schoolId || null,
          isPrimary: true,
        },
      },
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      status: true,
      userRoles: {
        include: { role: true, school: { select: { id: true, name: true } } },
      },
    },
  });

  return Response.json({ user: newUser }, { status: 201 });
}

// PATCH /api/super-admin/users  → add role to existing user OR update user status
export async function PATCH(request: Request) {
  const user = await getUserFromRequest(request);
  const err  = requireSuperAdmin(user);
  if (err) return err;

  const body = await request.json();
  const { userId, roleId, schoolId, removeRoleId, status } = body;

  if (!userId) return Response.json({ error: 'userId is required' }, { status: 400 });

  // Status update
  if (status) {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status },
      select: { id: true, status: true },
    });
    return Response.json({ user: updated });
  }

  // Remove a role
  if (removeRoleId) {
    await prisma.userRole.deleteMany({ where: { userId, roleId: removeRoleId } });
    return Response.json({ success: true });
  }

  // Add a role
  if (!roleId) return Response.json({ error: 'roleId is required' }, { status: 400 });

  const existing = await prisma.userRole.findFirst({ where: { userId, roleId, schoolId: schoolId || null } });
  if (existing) return Response.json({ error: 'User already has this role' }, { status: 409 });

  const userRole = await prisma.userRole.create({
    data: { userId, roleId, schoolId: schoolId || null, isPrimary: false },
    include: { role: true, school: { select: { id: true, name: true } } },
  });

  return Response.json({ userRole }, { status: 201 });
}
