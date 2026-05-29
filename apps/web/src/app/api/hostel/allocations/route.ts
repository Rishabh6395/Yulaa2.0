/**
 * GET    /api/hostel/allocations?school_id=X&room_id=X&student_id=X   — list allocations
 * POST   /api/hostel/allocations                                       — allocate student to room
 * PATCH  /api/hostel/allocations?id=X                                 — vacate / transfer
 * DELETE /api/hostel/allocations?id=X                                 — remove allocation
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
    const schoolId  = await resolveSchoolId(user, searchParams.get('school_id'));
    const roomId    = searchParams.get('room_id');
    const studentId = searchParams.get('student_id');
    const status    = searchParams.get('status') ?? 'active';

    const allocations = await prisma.hostelAllocation.findMany({
      where: {
        schoolId, status,
        ...(roomId    ? { roomId }    : {}),
        ...(studentId ? { studentId } : {}),
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, admissionNo: true } },
        room:    { select: { roomNo: true, roomType: true, block: { select: { name: true } } } },
      },
      orderBy: { joinDate: 'desc' },
    });

    return Response.json({ allocations });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!['super_admin', 'school_admin', 'principal'].includes(primary.role_code)) throw new ForbiddenError();

    const body = await request.json();
    const { schoolId: sid, studentId, roomId, bedNo, academicYear, joinDate, mealPlan } = body;
    const schoolId = await resolveSchoolId(user, sid);
    if (!studentId || !roomId || !academicYear) throw new AppError('studentId, roomId, academicYear required');

    // All checks + create inside a single transaction to prevent concurrent double-allocation
    const allocation = await prisma.$transaction(async (tx) => {
      const existing = await tx.hostelAllocation.findFirst({ where: { studentId, academicYear, status: 'active' } });
      if (existing) throw new AppError('Student already has an active hostel allocation this year', 409);

      const room = await tx.hostelRoom.findFirst({ where: { id: roomId, schoolId } });
      if (!room) throw new AppError('Room not found', 404);
      const occupied = await tx.hostelAllocation.count({ where: { roomId, status: 'active' } });
      if (occupied >= room.capacity) throw new AppError('Room is at full capacity', 409);

      return tx.hostelAllocation.create({
        data: {
          schoolId, studentId, roomId,
          bedNo:        bedNo        ?? null,
          academicYear,
          joinDate:     joinDate ? new Date(joinDate) : new Date(),
          mealPlan:     mealPlan     ?? null,
          status:       'active',
          createdById:  user.id,
        },
      });
    });

    return Response.json({ allocation }, { status: 201 });
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
    const allocation = await prisma.hostelAllocation.findUnique({ where: { id } });
    if (!allocation) throw new AppError('Allocation not found', 404);
    if (primary.school_id && allocation.schoolId !== primary.school_id) throw new ForbiddenError();

    const body = await request.json();
    const { action } = body;

    if (action === 'vacate') {
      const updated = await prisma.hostelAllocation.update({
        where: { id },
        data:  { status: 'vacated', leaveDate: body.leaveDate ? new Date(body.leaveDate) : new Date() },
      });
      return Response.json({ allocation: updated });
    }

    if (action === 'transfer') {
      if (!body.newRoomId) throw new AppError('newRoomId required for transfer');
      const newRoom = await prisma.hostelRoom.findUnique({ where: { id: body.newRoomId } });
      if (!newRoom) throw new AppError('New room not found', 404);
      const occupied = await prisma.hostelAllocation.count({ where: { roomId: body.newRoomId, status: 'active' } });
      if (occupied >= newRoom.capacity) throw new AppError('New room is at full capacity', 409);

      const [updated] = await prisma.$transaction([
        prisma.hostelAllocation.update({ where: { id }, data: { roomId: body.newRoomId, status: 'transferred' } }),
        prisma.hostelAllocation.create({
          data: {
            schoolId: allocation.schoolId,
            studentId: allocation.studentId,
            roomId: body.newRoomId,
            academicYear: allocation.academicYear,
            joinDate: new Date(),
            mealPlan: body.mealPlan ?? allocation.mealPlan,
            status: 'active',
            createdById: user.id,
          },
        }),
      ]);
      return Response.json({ allocation: updated });
    }

    // Direct field update
    const updated = await prisma.hostelAllocation.update({
      where: { id },
      data: {
        ...(body.mealPlan !== undefined ? { mealPlan: body.mealPlan } : {}),
        ...(body.bedNo    !== undefined ? { bedNo: body.bedNo }       : {}),
      },
    });
    return Response.json({ allocation: updated });
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
    const allocation = await prisma.hostelAllocation.findUnique({ where: { id } });
    if (!allocation) throw new AppError('Allocation not found', 404);
    if (primary.school_id && allocation.schoolId !== primary.school_id) throw new ForbiddenError();

    await prisma.hostelAllocation.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
