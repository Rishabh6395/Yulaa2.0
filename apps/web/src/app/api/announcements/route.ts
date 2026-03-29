import { getUserFromRequest } from '@/lib/auth';
import { listAnnouncements, createAnnouncement } from '@/modules/announcements/announcement.service';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

async function resolveSchoolId(primaryRole: any, fallbackId?: string | null): Promise<string> {
  // Prefer explicit override, then role's school, then default school
  if (fallbackId) return fallbackId;
  if (primaryRole.school_id) return primaryRole.school_id;
  // super_admin has no school_id — fall back to the marked default school
  const def = await prisma.school.findFirst({ where: { isDefault: true }, select: { id: true } });
  if (def) return def.id;
  // Last resort: first school in system
  const first = await prisma.school.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } });
  if (first) return first.id;
  throw new AppError('No school found. Please register a school first.');
}

export async function GET(request: Request) {
  try {
    const user        = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const { searchParams } = new URL(request.url);
    const schoolId = await resolveSchoolId(primaryRole, searchParams.get('schoolId'));
    return Response.json(await listAnnouncements(schoolId));
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user        = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!['super_admin', 'school_admin'].includes(primaryRole.role_code)) throw new ForbiddenError('Admin access required');
    const body     = await request.json();
    const schoolId = await resolveSchoolId(primaryRole, body.schoolId);
    const announcement = await createAnnouncement(schoolId, user.id, body);
    return Response.json({ announcement }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request) {
  try {
    const user        = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!['super_admin', 'school_admin'].includes(primaryRole.role_code)) throw new ForbiddenError();
    const { id } = await request.json();
    if (!id) throw new AppError('id required');
    await prisma.announcement.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
