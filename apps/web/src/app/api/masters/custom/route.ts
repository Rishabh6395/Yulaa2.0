/**
 * GET  /api/masters/custom          → list all custom master types for this school
 * POST /api/masters/custom          → create a new custom master type
 */

import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const ADMIN_ROLES = ['super_admin', 'school_admin'];

function getSchoolId(user: NonNullable<Awaited<ReturnType<typeof getUserFromRequest>>>, override?: string) {
  if (user.roles.some((r) => r.role_code === 'super_admin') && override) return override;
  const schoolId = (user.roles.find((r) => r.is_primary) ?? user.roles[0])?.school_id;
  if (!schoolId) throw new AppError('schoolId is required', 400);
  return schoolId;
}

function toSlug(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const { searchParams } = new URL(request.url);
    const schoolId = getSchoolId(user, searchParams.get('schoolId') ?? undefined);

    const types = await prisma.genericMasterType.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { values: { where: { isActive: true } } } } },
    });

    return Response.json({ masterTypes: types });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some((r) => ADMIN_ROLES.includes(r.role_code))) throw new ForbiddenError('Admin access required');

    const { schoolId: bodySchoolId, name, description, formId, fieldSlot } = await request.json();
    const schoolId = getSchoolId(user, bodySchoolId);

    if (!name?.trim()) throw new AppError('Name is required', 400);

    const slug = toSlug(name);
    if (!slug) throw new AppError('Name must contain at least one alphanumeric character', 400);

    // Check for slug conflict
    const existing = await prisma.genericMasterType.findUnique({ where: { schoolId_slug: { schoolId, slug } } });
    if (existing) throw new AppError(`A master type named "${name}" already exists`, 409);

    const masterType = await prisma.genericMasterType.create({
      data: { schoolId, name: name.trim(), slug, description: description?.trim() || null, formId: formId || null, fieldSlot: fieldSlot || null },
    });

    return Response.json({ masterType }, { status: 201 });
  } catch (err) { return handleError(err); }
}
