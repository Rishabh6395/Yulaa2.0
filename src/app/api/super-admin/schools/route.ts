import { getUserFromRequest } from '@/lib/auth';
import prisma from '@/lib/prisma';

function requireSuperAdmin(user: Awaited<ReturnType<typeof getUserFromRequest>>) {
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const isSuperAdmin = user.roles.some((r) => r.role_code === 'super_admin');
  if (!isSuperAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  const err  = requireSuperAdmin(user);
  if (err) return err;

  const schools = await prisma.school.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      status: true,
      subscriptionPlan: true,
      createdAt: true,
      _count: { select: { students: true, teachers: true } },
    },
  });

  return Response.json({ schools });
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  const err  = requireSuperAdmin(user);
  if (err) return err;

  const body = await request.json();
  const { name, email, phone, address, subscriptionPlan } = body;

  if (!name?.trim()) {
    return Response.json({ error: 'School name is required' }, { status: 400 });
  }

  const school = await prisma.school.create({
    data: {
      name:             name.trim(),
      email:            email?.trim() || null,
      phone:            phone?.trim() || null,
      address:          address?.trim() || null,
      subscriptionPlan: subscriptionPlan || 'basic',
      status:           'active',
    },
  });

  return Response.json({ school }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await getUserFromRequest(request);
  const err  = requireSuperAdmin(user);
  if (err) return err;

  const body = await request.json();
  const { id, name, email, phone, address, subscriptionPlan, status } = body;

  if (!id) return Response.json({ error: 'School id is required' }, { status: 400 });

  const school = await prisma.school.update({
    where: { id },
    data: {
      ...(name             && { name: name.trim() }),
      ...(email !== undefined && { email: email?.trim() || null }),
      ...(phone !== undefined && { phone: phone?.trim() || null }),
      ...(address !== undefined && { address: address?.trim() || null }),
      ...(subscriptionPlan && { subscriptionPlan }),
      ...(status           && { status }),
    },
  });

  return Response.json({ school });
}
