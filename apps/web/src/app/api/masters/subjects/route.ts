/**
 * GET  /api/masters/subjects          → list subject catalog for a school (optionally filtered by gradeLevel)
 * POST /api/masters/subjects          → add a subject
 * PATCH /api/masters/subjects         → update a subject
 */

import { CORE_ADMIN_ROLES as ADMIN_ROLES } from '@/lib/roles';
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

function getSchoolId(user: NonNullable<Awaited<ReturnType<typeof getUserFromRequest>>>, override?: string) {
  if (user.roles.some((r) => r.role_code === 'super_admin') && override) return override;
  const schoolId = (user.roles.find((r) => r.is_primary) ?? user.roles[0])?.school_id;
  if (!schoolId) throw new AppError('schoolId is required — open Masters from a school configuration page', 400);
  return schoolId;
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const { searchParams } = new URL(request.url);
    const schoolId   = getSchoolId(user, searchParams.get('schoolId') ?? undefined);
    const gradeLevel = searchParams.get('gradeLevel') ?? undefined;
    const activeOnly = searchParams.get('includeInactive') !== 'true';

    const subjects = await prisma.subjectCatalog.findMany({
      where: {
        schoolId,
        ...(gradeLevel && { gradeLevel }),
      },
      orderBy: [{ gradeLevel: 'asc' }, { subject: 'asc' }],
    });

    return Response.json({ subjects });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some((r) => ADMIN_ROLES.includes(r.role_code))) throw new ForbiddenError('Admin access required');

    const { schoolId: bodySchoolId, subject, gradeLevel, code, isCore, maxMarks, passMarks } = await request.json();
    const schoolId = getSchoolId(user, bodySchoolId);

    if (!subject?.trim()) throw new AppError('Subject name is required', 400);
    if (!gradeLevel?.trim()) throw new AppError('Grade level is required', 400);

    const existing = await prisma.subjectCatalog.findUnique({
      where: { schoolId_gradeLevel_subject: { schoolId, gradeLevel, subject: subject.trim() } },
    });
    if (existing) throw new AppError(`Subject "${subject}" already exists for this grade`, 409);

    const userId = user.id;
    const record = await prisma.subjectCatalog.create({
      data: {
        schoolId,
        subject:    subject.trim(),
        gradeLevel: gradeLevel.trim(),
        code:       code?.trim() || null,
        isCore:     isCore !== false,
        maxMarks:   maxMarks ?? 100,
        passMarks:  passMarks ?? 33,
        createdById: userId,
      },
    });

    return Response.json({ subject: record }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some((r) => ADMIN_ROLES.includes(r.role_code))) throw new ForbiddenError('Admin access required');

    const { id, subject, gradeLevel, code, isCore, maxMarks, passMarks } = await request.json();
    if (!id) throw new AppError('id is required', 400);

    const record = await prisma.subjectCatalog.update({
      where: { id },
      data: {
        ...(subject    !== undefined && { subject: subject.trim() }),
        ...(gradeLevel !== undefined && { gradeLevel: gradeLevel.trim() }),
        ...(code       !== undefined && { code: code?.trim() || null }),
        ...(isCore     !== undefined && { isCore }),
        ...(maxMarks   !== undefined && { maxMarks }),
        ...(passMarks  !== undefined && { passMarks }),
      },
    });

    return Response.json({ subject: record });
  } catch (err) { return handleError(err); }
}
