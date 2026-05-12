import { PRINCIPAL_ADMIN_ROLES as ALLOWED_ROLES } from '@/lib/roles';
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';


function getPrimary(user: any) { return user.roles.find((r: any) => r.is_primary) ?? user.roles[0]; }
function isSuperAdmin(user: any) { return user.roles.some((r: any) => r.role_code === 'super_admin'); }

function getSchoolId(user: any, override?: string | null): string {
  if (isSuperAdmin(user) && override) return override;
  const primary = getPrimary(user);
  if (!ALLOWED_ROLES.includes(primary.role_code)) throw new ForbiddenError();
  if (!primary.school_id) throw new ForbiddenError();
  return primary.school_id;
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const { searchParams } = new URL(request.url);
    const schoolId = getSchoolId(user, searchParams.get('school_id'));

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
    const body = await request.json();
    const schoolId = getSchoolId(user, body.schoolId);
    const { name, driverName, driverPhone, vehicleNo, capacity, morningDeparture, eveningDeparture, stops } = body;
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
    const { id, name, driverName, driverPhone, vehicleNo, capacity, morningDeparture, eveningDeparture, stops } = await request.json();
    if (!id) throw new AppError('id is required');
    const primary = getPrimary(user);
    const existing = await prisma.transportRoute.findFirst({ where: { id } });
    if (!existing) throw new AppError('Route not found', 404);
    if (!isSuperAdmin(user) && existing.schoolId !== primary.school_id) throw new ForbiddenError();

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
    const primary = getPrimary(user);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) throw new AppError('id is required');

    const existing = await prisma.transportRoute.findFirst({ where: { id } });
    if (!existing) throw new AppError('Route not found', 404);
    if (!isSuperAdmin(user) && existing.schoolId !== primary.school_id) throw new ForbiddenError();

    await prisma.transportRoute.delete({ where: { id } });

    return Response.json({ success: true });
  } catch (err) { return handleError(err); }
}
