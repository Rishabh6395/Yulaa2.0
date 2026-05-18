/**
 * Yearbook API — school-scoped media memories per academic year & class.
 * GET    - list entries (filter by academicYear, classId, mediaType)
 * POST   - upload a new entry (teacher/admin only)
 * DELETE - remove an entry (uploader or admin)
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const MANAGE_ROLES = ['school_admin', 'principal', 'hod', 'teacher'];

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const { school_id: schoolId } = primary;

    const { searchParams } = new URL(request.url);
    const academicYear = searchParams.get('academicYear') ?? undefined;
    const classId      = searchParams.get('classId') ?? undefined;
    const mediaType    = searchParams.get('mediaType') ?? undefined;

    const entries = await prisma.yearbookEntry.findMany({
      where: {
        schoolId,
        ...(academicYear ? { academicYear } : {}),
        ...(classId      ? { classId }      : {}),
        ...(mediaType    ? { mediaType }     : {}),
      },
      include: {
        class:    { select: { name: true, grade: true, section: true } },
        uploader: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ academicYear: 'desc' }, { createdAt: 'desc' }],
    });

    // Collect distinct academic years for filter UI
    const years = [...new Set(entries.map(e => e.academicYear))].sort().reverse();

    return Response.json({ entries, years });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const { role_code: role, school_id: schoolId } = primary;

    if (!MANAGE_ROLES.includes(role)) throw new ForbiddenError();

    const body = await request.json();
    const { academicYear, classId, title, caption, mediaType, fileUrl, fileName, fileSize, mimeType } = body;

    if (!academicYear) throw new AppError('academicYear is required');
    if (!title)        throw new AppError('title is required');
    if (!mediaType)    throw new AppError('mediaType is required (photo, video, document)');
    if (!fileUrl)      throw new AppError('fileUrl is required');
    if (!fileName)     throw new AppError('fileName is required');

    // Verify class belongs to this school if provided
    if (classId) {
      const cls = await prisma.class.findFirst({ where: { id: classId, schoolId } });
      if (!cls) throw new AppError('Class not found in this school');
    }

    const entry = await prisma.yearbookEntry.create({
      data: {
        schoolId,
        academicYear,
        classId:  classId ?? null,
        title,
        caption:  caption ?? null,
        mediaType,
        fileUrl,
        fileName,
        fileSize: fileSize ?? null,
        mimeType: mimeType ?? null,
        uploadedBy: user.id,
      },
      include: {
        class:    { select: { name: true, grade: true, section: true } },
        uploader: { select: { firstName: true, lastName: true } },
      },
    });

    return Response.json({ entry }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const { role_code: role, school_id: schoolId } = primary;

    const body = await request.json();
    const { id } = body;
    if (!id) throw new AppError('id is required');

    const existing = await prisma.yearbookEntry.findFirst({ where: { id, schoolId } });
    if (!existing) throw new AppError('Entry not found');

    const isAdmin = ['school_admin', 'principal'].includes(role);
    const isOwner = existing.uploadedBy === user.id;
    if (!isAdmin && !isOwner) throw new ForbiddenError();

    await prisma.yearbookEntry.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
