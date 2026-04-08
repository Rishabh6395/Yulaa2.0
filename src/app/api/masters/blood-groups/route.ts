import { getUserFromRequest } from '@/lib/auth';
import { findDefaultSchool } from '@/modules/super-admin/super-admin.repo';
import { handleError, UnauthorizedError } from '@/utils/errors';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const { searchParams } = new URL(request.url);
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const schoolId = searchParams.get('schoolId') ?? primary?.school_id ?? '';

    const defaultSchool = await findDefaultSchool();
    const schoolIds = new Set<string>();
    if (defaultSchool) schoolIds.add(defaultSchool.id);
    if (schoolId) schoolIds.add(schoolId);

    const masters = await prisma.bloodGroupMaster.findMany({
      where: { schoolId: { in: [...schoolIds] }, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    const seen = new Map<string, typeof masters[0]>();
    for (const m of masters) {
      if (!seen.has(m.name) || m.schoolId === schoolId) seen.set(m.name, m);
    }
    return Response.json({ bloodGroupMasters: [...seen.values()] });
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

    const master = await prisma.bloodGroupMaster.create({
      data: { schoolId, name: body.name.trim(), sortOrder: body.sortOrder ?? 0 },
    });
    return Response.json({ bloodGroupMaster: master }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const { id, ...data } = await request.json();
    const master = await prisma.bloodGroupMaster.update({ where: { id }, data });
    return Response.json({ bloodGroupMaster: master });
  } catch (err) { return handleError(err); }
}
