import { getUserFromRequest } from '@/lib/auth';
import { findDefaultSchool, findGenderMasters } from '@/modules/super-admin/super-admin.repo';
import { handleError, UnauthorizedError } from '@/utils/errors';
import prisma from '@/lib/prisma';
import { cacheGet, cacheSet, cacheInvalidate, TTL } from '@/lib/redis';

/**
 * GET /api/masters/gender?schoolId=xxx
 * Returns gender masters for the given school.
 * Always includes masters from the Super Admin (default) school.
 * If the school has its own overrides they are merged in.
 */
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const { searchParams } = new URL(request.url);
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const schoolId = searchParams.get('schoolId') ?? primary?.school_id ?? '';

    const cacheKey = `masters:gender:${schoolId}`;
    const cached = await cacheGet<{ genderMasters: unknown[] }>(cacheKey);
    if (cached) return Response.json(cached);

    const defaultSchool = await findDefaultSchool();
    const schoolIds = new Set<string>();
    if (defaultSchool) schoolIds.add(defaultSchool.id);
    if (schoolId) schoolIds.add(schoolId);

    const masters = await prisma.genderMaster.findMany({
      where: { schoolId: { in: [...schoolIds] }, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    const seen = new Map<string, typeof masters[0]>();
    for (const m of masters) {
      if (!seen.has(m.name) || m.schoolId === schoolId) seen.set(m.name, m);
    }

    const payload = { genderMasters: [...seen.values()] };
    await cacheSet(cacheKey, payload, TTL.masters);
    return Response.json(payload);
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!['super_admin', 'school_admin'].includes(primary.role_code)) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }
    const body = await request.json();
    const schoolId = primary.role_code === 'super_admin'
      ? (body.schoolId ?? (await findDefaultSchool())?.id)
      : primary.school_id;
    if (!schoolId) return Response.json({ error: 'schoolId required' }, { status: 400 });

    const master = await prisma.genderMaster.create({
      data: { schoolId, name: body.name.trim(), sortOrder: body.sortOrder ?? 0 },
    });
    // SA changes affect all schools; school changes only affect that school
    await cacheInvalidate(primary.role_code === 'super_admin' ? 'masters:gender:*' : `masters:gender:${schoolId}`);
    return Response.json({ genderMaster: master }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const { id, ...data } = await request.json();
    const master = await prisma.genderMaster.update({ where: { id }, data });
    await cacheInvalidate(primary.role_code === 'super_admin' ? 'masters:gender:*' : `masters:gender:${primary.school_id}`);
    return Response.json({ genderMaster: master });
  } catch (err) { return handleError(err); }
}
