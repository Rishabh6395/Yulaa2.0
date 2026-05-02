import { PRINCIPAL_ADMIN_ROLES as ALLOWED_ROLES } from '@/lib/roles';
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';


function requireAdmin(roleCode: string) {
  if (!ALLOWED_ROLES.includes(roleCode)) throw new ForbiddenError();
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    requireAdmin(primary.role_code);
    const schoolId = primary.school_id!;

    const routes = await prisma.transportRoute.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'asc' },
    });

    return Response.json({ routes });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    requireAdmin(primary.role_code);
    const schoolId = primary.school_id!;

    const { name, driverName, driverPhone, vehicleNo, capacity, morningDeparture, eveningDeparture, stops } = await request.json();
    if (!name?.trim()) throw new AppError('Route name is required');

    const route = await prisma.transportRoute.create({
      data: {
        schoolId,
        name: name.trim(),
        driverName:       driverName       || null,
        driverPhone:      driverPhone      || null,
        vehicleNo:        vehicleNo        || null,
        capacity:         capacity         ? Number(capacity) : null,
        morningDeparture: morningDeparture || null,
        eveningDeparture: eveningDeparture || null,
        stops:            stops            ?? null,
      },
    });

    return Response.json({ route }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    requireAdmin(primary.role_code);
    const schoolId = primary.school_id!;

    const { id, name, driverName, driverPhone, vehicleNo, capacity, morningDeparture, eveningDeparture, stops } = await request.json();
    if (!id) throw new AppError('id is required');

    const existing = await prisma.transportRoute.findFirst({ where: { id, schoolId } });
    if (!existing) throw new AppError('Route not found', 404);

    const route = await prisma.transportRoute.update({
      where: { id },
      data: {
        ...(name             !== undefined && { name: name.trim() }),
        ...(driverName       !== undefined && { driverName: driverName || null }),
        ...(driverPhone      !== undefined && { driverPhone: driverPhone || null }),
        ...(vehicleNo        !== undefined && { vehicleNo: vehicleNo || null }),
        ...(capacity         !== undefined && { capacity: capacity ? Number(capacity) : null }),
        ...(morningDeparture !== undefined && { morningDeparture: morningDeparture || null }),
        ...(eveningDeparture !== undefined && { eveningDeparture: eveningDeparture || null }),
        ...(stops            !== undefined && { stops: stops ?? null }),
      },
    });

    return Response.json({ route });
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    requireAdmin(primary.role_code);
    const schoolId = primary.school_id!;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) throw new AppError('id is required');

    const existing = await prisma.transportRoute.findFirst({ where: { id, schoolId } });
    if (!existing) throw new AppError('Route not found', 404);

    await prisma.transportRoute.delete({ where: { id } });

    return Response.json({ success: true });
  } catch (err) { return handleError(err); }
}
