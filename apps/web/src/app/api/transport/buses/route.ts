import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const ADMIN_ROLES = ['super_admin', 'school_admin', 'principal'];

function getSchoolId(user: any, override?: string | null): string {
  if (user.roles.some((r: any) => r.role_code === 'super_admin') && override) return override;
  const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  if (!primary.school_id) throw new ForbiddenError();
  return primary.school_id;
}

function assertAdmin(user: any) {
  if (!user.roles.some((r: any) => ADMIN_ROLES.includes(r.role_code))) throw new ForbiddenError();
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const { searchParams } = new URL(request.url);
    const schoolId = getSchoolId(user, searchParams.get('school_id'));

    const buses = await prisma.transportBus.findMany({
      where: { schoolId, isActive: true },
      orderBy: { busNumber: 'asc' },
    });
    return Response.json({ buses });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    assertAdmin(user);
    const body = await request.json();
    const schoolId = getSchoolId(user, body.schoolId);
    if (!body.busNumber?.trim()) throw new AppError('Bus number is required');

    const bus = await prisma.transportBus.create({
      data: {
        schoolId,
        busNumber:   body.busNumber.trim(),
        capacity:    body.capacity    ? Number(body.capacity) : null,
        gpsEnabled:  body.gpsEnabled  ?? false,
        gpsDeviceId: body.gpsDeviceId || null,
      },
    });
    return Response.json({ bus }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    assertAdmin(user);
    const body = await request.json();
    const { id, busNumber, capacity, gpsEnabled, gpsDeviceId, isActive } = body;
    if (!id) throw new AppError('id is required');

    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const isSuperAdmin = user.roles.some((r: any) => r.role_code === 'super_admin');
    const existing = await prisma.transportBus.findUnique({ where: { id } });
    if (!existing) throw new AppError('Bus not found', 404);
    if (!isSuperAdmin && existing.schoolId !== primary.school_id) throw new ForbiddenError();

    const bus = await prisma.transportBus.update({
      where: { id },
      data: {
        ...(busNumber   !== undefined && { busNumber: busNumber.trim() }),
        ...(capacity    !== undefined && { capacity: capacity ? Number(capacity) : null }),
        ...(gpsEnabled  !== undefined && { gpsEnabled }),
        ...(gpsDeviceId !== undefined && { gpsDeviceId: gpsDeviceId || null }),
        ...(isActive    !== undefined && { isActive }),
      },
    });
    return Response.json({ bus });
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    assertAdmin(user);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) throw new AppError('id is required');

    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const isSuperAdmin = user.roles.some((r: any) => r.role_code === 'super_admin');
    const existing = await prisma.transportBus.findUnique({ where: { id } });
    if (!existing) throw new AppError('Bus not found', 404);
    if (!isSuperAdmin && existing.schoolId !== primary.school_id) throw new ForbiddenError();

    await prisma.transportBus.update({ where: { id }, data: { isActive: false } });
    return Response.json({ success: true });
  } catch (err) { return handleError(err); }
}
