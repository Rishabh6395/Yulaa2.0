/**
 * GET    /api/hostel/rooms?school_id=X&block_id=X   — list rooms
 * POST   /api/hostel/rooms                          — create room
 * PATCH  /api/hostel/rooms?id=X                     — update room
 * DELETE /api/hostel/rooms?id=X                     — delete (if unoccupied)
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

async function resolveSchoolId(user: any, override?: string | null): Promise<string> {
  const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  if (primary.role_code === 'super_admin' && override) return override;
  if (primary.school_id) return primary.school_id;
  throw new AppError('school_id required');
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const { searchParams } = new URL(request.url);
    const schoolId = await resolveSchoolId(user, searchParams.get('school_id'));
    const blockId  = searchParams.get('block_id');
    const vacant   = searchParams.get('vacant') === 'true';

    const rooms = await prisma.hostelRoom.findMany({
      where: {
        schoolId,
        isActive: true,
        ...(blockId ? { blockId } : {}),
      },
      include: {
        block: { select: { name: true, gender: true } },
        _count: { select: { allocations: { where: { status: 'active' } } } },
      },
      orderBy: [{ block: { name: 'asc' } }, { roomNo: 'asc' }],
    });

    const filtered = vacant
      ? rooms.filter(r => r._count.allocations < r.capacity)
      : rooms;

    return Response.json({ rooms: filtered });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!['super_admin', 'school_admin', 'principal'].includes(primary.role_code)) throw new ForbiddenError();

    const body = await request.json();
    const { schoolId: sid, blockId, roomNo, roomType, capacity, floor, amenities } = body;
    const schoolId = await resolveSchoolId(user, sid);
    if (!blockId || !roomNo) throw new AppError('blockId and roomNo required');

    const room = await prisma.hostelRoom.create({
      data: {
        schoolId, blockId, roomNo,
        roomType:  roomType  ?? 'shared',
        capacity:  capacity  ?? 4,
        floor:     floor     ?? null,
        amenities: amenities ?? null,
      },
    });

    return Response.json({ room }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!['super_admin', 'school_admin', 'principal'].includes(primary.role_code)) throw new ForbiddenError();

    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new AppError('id required');
    const room = await prisma.hostelRoom.findUnique({ where: { id } });
    if (!room) throw new AppError('Room not found', 404);
    if (primary.school_id && room.schoolId !== primary.school_id) throw new ForbiddenError();

    const body = await request.json();
    const updated = await prisma.hostelRoom.update({
      where: { id },
      data: {
        ...(body.roomNo    !== undefined ? { roomNo: body.roomNo }       : {}),
        ...(body.roomType  !== undefined ? { roomType: body.roomType }   : {}),
        ...(body.capacity  !== undefined ? { capacity: body.capacity }   : {}),
        ...(body.floor     !== undefined ? { floor: body.floor }         : {}),
        ...(body.amenities !== undefined ? { amenities: body.amenities } : {}),
        ...(body.isActive  !== undefined ? { isActive: body.isActive }   : {}),
      },
    });

    return Response.json({ room: updated });
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!['super_admin', 'school_admin'].includes(primary.role_code)) throw new ForbiddenError();

    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new AppError('id required');
    const room = await prisma.hostelRoom.findUnique({ where: { id } });
    if (!room) throw new AppError('Room not found', 404);
    if (primary.school_id && room.schoolId !== primary.school_id) throw new ForbiddenError();

    const occupied = await prisma.hostelAllocation.count({ where: { roomId: id, status: 'active' } });
    if (occupied > 0) throw new AppError('Cannot delete occupied room', 409);

    await prisma.hostelRoom.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
