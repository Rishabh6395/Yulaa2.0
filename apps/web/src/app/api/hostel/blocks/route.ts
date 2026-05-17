/**
 * GET    /api/hostel/blocks?school_id=X   — list hostel blocks
 * POST   /api/hostel/blocks               — create block
 * PATCH  /api/hostel/blocks?id=X          — update block
 * DELETE /api/hostel/blocks?id=X          — delete (if empty)
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

    const blocks = await prisma.hostelBlock.findMany({
      where: { schoolId },
      include: { _count: { select: { rooms: true } } },
      orderBy: { name: 'asc' },
    });

    return Response.json({ blocks });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!['super_admin', 'school_admin', 'principal'].includes(primary.role_code))
      throw new ForbiddenError('Admin role required');

    const body = await request.json();
    const { schoolId: sid, name, gender, wardenId, capacity } = body;
    const schoolId = await resolveSchoolId(user, sid);
    if (!name || !gender) throw new AppError('name and gender required');
    if (!['boys', 'girls', 'mixed'].includes(gender)) throw new AppError('gender must be boys | girls | mixed');

    const block = await prisma.hostelBlock.create({
      data: { schoolId, name, gender, wardenId: wardenId ?? null, capacity: capacity ?? 0 },
    });

    return Response.json({ block }, { status: 201 });
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
    const block = await prisma.hostelBlock.findUnique({ where: { id } });
    if (!block) throw new AppError('Block not found', 404);
    if (primary.school_id && block.schoolId !== primary.school_id) throw new ForbiddenError();

    const body = await request.json();
    const updated = await prisma.hostelBlock.update({
      where: { id },
      data: {
        ...(body.name     !== undefined ? { name: body.name }         : {}),
        ...(body.gender   !== undefined ? { gender: body.gender }     : {}),
        ...(body.wardenId !== undefined ? { wardenId: body.wardenId } : {}),
        ...(body.capacity !== undefined ? { capacity: body.capacity } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    });

    return Response.json({ block: updated });
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
    const block = await prisma.hostelBlock.findUnique({ where: { id }, include: { _count: { select: { rooms: true } } } });
    if (!block) throw new AppError('Block not found', 404);
    if (primary.school_id && block.schoolId !== primary.school_id) throw new ForbiddenError();
    if (block._count.rooms > 0) throw new AppError('Cannot delete block with rooms', 409);

    await prisma.hostelBlock.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
