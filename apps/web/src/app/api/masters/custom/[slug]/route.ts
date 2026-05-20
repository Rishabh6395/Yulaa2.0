/**
 * GET   /api/masters/custom/[slug]                → list values for a custom master type
 * POST  /api/masters/custom/[slug]                → add a value
 * PATCH /api/masters/custom/[slug]                → update a value (id in body)
 */

import { CORE_ADMIN_ROLES as ADMIN_ROLES } from '@/lib/roles';
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import { STANDARD_MASTERS_BY_SLUG } from '@/lib/standard-masters';
import prisma from '@/lib/prisma';


function getSchoolId(user: NonNullable<Awaited<ReturnType<typeof getUserFromRequest>>>, override?: string) {
  if (user.roles.some((r) => r.role_code === 'super_admin') && override) return override;
  const schoolId = (user.roles.find((r) => r.is_primary) ?? user.roles[0])?.school_id;
  if (!schoolId) throw new AppError('schoolId is required', 400);
  return schoolId;
}

/**
 * Finds the GenericMasterType for (schoolId, slug).
 * For standard slugs: auto-seeds the type + default values on first access so
 * schools don't need to run seed-standard before dropdowns appear.
 */
async function resolveType(schoolId: string, slug: string) {
  let type = await prisma.genericMasterType.findUnique({ where: { schoolId_slug: { schoolId, slug } } });

  if (!type) {
    const standard = STANDARD_MASTERS_BY_SLUG.get(slug);
    if (!standard) throw new AppError('Master type not found', 404);

    // Auto-seed: create type + defaults atomically so concurrent requests don't race
    type = await prisma.genericMasterType.upsert({
      where:  { schoolId_slug: { schoolId, slug } },
      create: { schoolId, slug, name: standard.name, description: standard.description },
      update: {},
    });

    if (standard.defaults.length > 0) {
      const existingCount = await prisma.genericMasterValue.count({ where: { typeId: type.id } });
      if (existingCount === 0) {
        await prisma.genericMasterValue.createMany({
          data: standard.defaults.map((name, i) => ({ typeId: type!.id, name, sortOrder: i })),
          skipDuplicates: true,
        });
      }
    }
  }

  return type;
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const { searchParams } = new URL(request.url);
    const schoolId   = getSchoolId(user, searchParams.get('schoolId') ?? undefined);
    const activeOnly = searchParams.get('includeInactive') !== 'true';

    const type = await resolveType(schoolId, (await params).slug);
    const values = await prisma.genericMasterValue.findMany({
      where: { typeId: type.id, ...(activeOnly && { isActive: true }) },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return Response.json({ masterType: type, masterValues: values });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some((r) => ADMIN_ROLES.includes(r.role_code))) throw new ForbiddenError('Admin access required');

    const { schoolId: bodySchoolId, name, sortOrder } = await request.json();
    const schoolId = getSchoolId(user, bodySchoolId);
    if (!name?.trim()) throw new AppError('Name is required', 400);

    const type  = await resolveType(schoolId, (await params).slug);
    const value = await prisma.genericMasterValue.create({
      data: { typeId: type.id, name: name.trim(), sortOrder: sortOrder ?? 0 },
    });

    return Response.json({ masterValue: value }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
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
