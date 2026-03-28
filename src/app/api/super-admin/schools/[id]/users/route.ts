import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

function assertSuperAdmin(user: any) {
  if (!user) throw new UnauthorizedError();
  if (!user.roles.some((r: any) => r.role_code === 'super_admin')) throw new ForbiddenError();
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    assertSuperAdmin(user);
    const schoolId = params.id;

    const [users, roles] = await Promise.all([
      prisma.user.findMany({
        where: { userRoles: { some: { schoolId } } },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, firstName: true, lastName: true,
          phone: true, status: true, createdAt: true,
          userRoles: {
            where: { schoolId },
            include: { role: true },
          },
        },
      }),
      prisma.role.findMany({ orderBy: { displayName: 'asc' } }),
    ]);

    return Response.json({ users, roles });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    assertSuperAdmin(user);
    const { firstName, lastName, email, phone, password, roleId } = await request.json();
    if (!firstName || !lastName || !email || !password || !roleId) {
      return Response.json({ error: 'firstName, lastName, email, password and roleId are required' }, { status: 400 });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const newUser = await prisma.user.create({
      data: {
        firstName: firstName.trim(), lastName: lastName.trim(),
        email: email.trim().toLowerCase(), phone: phone || null,
        passwordHash, status: 'active',
        userRoles: { create: { roleId, schoolId: params.id, isPrimary: true } },
      },
      select: { id: true, email: true, firstName: true, lastName: true, status: true, userRoles: { include: { role: true } } },
    });

    // Sync: if the role is 'teacher', ensure a Teacher profile record exists
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (role?.code === 'teacher') {
      const exists = await prisma.teacher.findFirst({ where: { userId: newUser.id, schoolId: params.id } });
      if (!exists) await prisma.teacher.create({ data: { userId: newUser.id, schoolId: params.id } });
    }

    return Response.json({ user: newUser }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    assertSuperAdmin(user);
    const { userId, status, action, roleId } = await request.json();

    if (action === 'addRole' && userId && roleId) {
      const ur = await prisma.userRole.create({ data: { userId, roleId, schoolId: params.id, isPrimary: false }, include: { role: true } });
      // Sync: if adding teacher role, ensure Teacher profile record exists
      if (ur.role.code === 'teacher') {
        const exists = await prisma.teacher.findFirst({ where: { userId, schoolId: params.id } });
        if (!exists) await prisma.teacher.create({ data: { userId, schoolId: params.id } });
      }
      return Response.json({ userRole: ur });
    }
    if (action === 'removeRole' && userId && roleId) {
      await prisma.userRole.deleteMany({ where: { userId, roleId, schoolId: params.id } });
      return Response.json({ success: true });
    }
    if (userId && status) {
      const u = await prisma.user.update({ where: { id: userId }, data: { status }, select: { id: true, status: true } });
      return Response.json({ user: u });
    }
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) { return handleError(err); }
}
