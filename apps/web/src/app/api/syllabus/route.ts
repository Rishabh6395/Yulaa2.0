import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const ADMIN_ROLES = ['super_admin', 'school_admin', 'principal', 'hod'];

async function getSchoolId(user: any, bodySchoolId?: string): Promise<string> {
  const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  if (bodySchoolId) return bodySchoolId;
  if (primary.school_id) return primary.school_id;
  const def = await prisma.school.findFirst({ where: { isDefault: true }, select: { id: true } });
  if (def) return def.id;
  throw new AppError('No school found');
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const { searchParams } = new URL(request.url);
    const schoolId = await getSchoolId(user, searchParams.get('schoolId') ?? undefined);
    const academicYear = searchParams.get('academicYear') || undefined;
    const classId = searchParams.get('classId') || undefined;
    const subject = searchParams.get('subject') || undefined;

    // Teacher sees only their own syllabi
    const teacherFilter = primary.role_code === 'teacher' ? { teacherId: user.id } : {};

    const items = await prisma.syllabusItem.findMany({
      where: {
        schoolId,
        ...(academicYear ? { academicYear } : {}),
        ...(classId ? { classId } : {}),
        ...(subject ? { subject } : {}),
        ...teacherFilter,
      },
      orderBy: [{ classId: 'asc' }, { subject: 'asc' }, { orderNo: 'asc' }],
    });

    return Response.json({ items });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const canManage = [...ADMIN_ROLES, 'teacher'].includes(primary.role_code);
    if (!canManage) throw new ForbiddenError();

    const body = await request.json();
    const { action } = body;
    const schoolId = await getSchoolId(user, body.schoolId);

    // Bulk upsert chapters/topics
    if (action === 'bulk_upsert') {
      const { items } = body; // [{classId, subject, chapter, topic, orderNo, academicYear}]
      if (!Array.isArray(items) || items.length === 0) throw new AppError('items array required');
      const created = await prisma.$transaction(
        items.map((it: any) =>
          prisma.syllabusItem.create({
            data: {
              schoolId,
              classId: it.classId,
              subject: it.subject,
              chapter: it.chapter,
              topic: it.topic || null,
              orderNo: it.orderNo ?? 0,
              academicYear: it.academicYear || '',
              status: 'pending',
              teacherId: it.teacherId || null,
            },
          })
        )
      );
      return Response.json({ created: created.length }, { status: 201 });
    }

    // Create single item
    const { classId, subject, chapter, topic, orderNo, academicYear, teacherId } = body;
    if (!classId || !subject || !chapter) throw new AppError('classId, subject, chapter required');
    const item = await prisma.syllabusItem.create({
      data: {
        schoolId,
        classId,
        subject,
        chapter,
        topic: topic || null,
        orderNo: orderNo ?? 0,
        academicYear: academicYear || '',
        status: 'pending',
        teacherId: primary.role_code === 'teacher' ? user.id : (teacherId || null),
      },
    });
    return Response.json({ item }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const canManage = [...ADMIN_ROLES, 'teacher'].includes(primary.role_code);
    if (!canManage) throw new ForbiddenError();

    const body = await request.json();
    const { id, status, chapter, topic, orderNo } = body;
    if (!id) throw new AppError('id required');

    const existing = await prisma.syllabusItem.findUnique({ where: { id } });
    if (!existing) throw new AppError('Item not found');
    // Teacher can only update their own items
    if (primary.role_code === 'teacher' && existing.teacherId !== user.id) throw new ForbiddenError();

    const updated = await prisma.syllabusItem.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(chapter && { chapter }),
        ...(topic !== undefined && { topic }),
        ...(orderNo !== undefined && { orderNo }),
      },
    });
    return Response.json({ item: updated });
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError();
    const { id } = await request.json();
    if (!id) throw new AppError('id required');
    await prisma.syllabusItem.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
