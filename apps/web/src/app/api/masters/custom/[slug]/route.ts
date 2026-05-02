/**
 * GET   /api/masters/custom/[slug]                → list values for a custom master type
 * POST  /api/masters/custom/[slug]                → add a value
 * PATCH /api/masters/custom/[slug]                → update a value (id in body)
 */

import { CORE_ADMIN_ROLES as ADMIN_ROLES } from '@/lib/roles';
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';


function getSchoolId(user: NonNullable<Awaited<ReturnType<typeof getUserFromRequest>>>, override?: string) {
  if (user.roles.some((r) => r.role_code === 'super_admin') && override) return override;
  const schoolId = (user.roles.find((r) => r.is_primary) ?? user.roles[0])?.school_id;
  if (!schoolId) throw new AppError('schoolId is required', 400);
  return schoolId;
}

async function resolveType(schoolId: string, slug: string) {
  const type = await prisma.genericMasterType.findUnique({ where: { schoolId_slug: { schoolId, slug } } });
  if (!type) throw new AppError('Master type not found', 404);
  return type;
}

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const { searchParams } = new URL(request.url);
    const schoolId   = getSchoolId(user, searchParams.get('schoolId') ?? undefined);
    const activeOnly = searchParams.get('includeInactive') !== 'true';

    const type = await resolveType(schoolId, params.slug);
    const values = await prisma.genericMasterValue.findMany({
      where: { typeId: type.id, ...(activeOnly && { isActive: true }) },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return Response.json({ masterType: type, masterValues: values });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some((r) => ADMIN_ROLES.includes(r.role_code))) throw new ForbiddenError('Admin access required');

    const { schoolId: bodySchoolId, name, sortOrder } = await request.json();
    const schoolId = getSchoolId(user, bodySchoolId);
    if (!name?.trim()) throw new AppError('Name is required', 400);

    const type  = await resolveType(schoolId, params.slug);
    const value = await prisma.genericMasterValue.create({
      data: { typeId: type.id, name: name.trim(), sortOrder: sortOrder ?? 0 },
    });

    return Response.json({ masterValue: value }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request, { params }: { params: { slug: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some((r) => ADMIN_ROLES.includes(r.role_code))) throw new ForbiddenError('Admin access required');

    const { id, name, isActive, sortOrder } = await request.json();
    if (!id) throw new AppError('id is required', 400);

    const value = await prisma.genericMasterValue.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return Response.json({ masterValue: value });
  } catch (err) { return handleError(err); }
}
