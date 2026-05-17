/**
 * GET    /api/super-admin/subject-catalog?school_id=X&grade_level=X  — list subjects
 * POST   /api/super-admin/subject-catalog                             — add subject
 * PATCH  /api/super-admin/subject-catalog?id=X                       — update subject
 * DELETE /api/super-admin/subject-catalog?id=X                       — remove subject
 *
 * Super admin defines which subjects exist for each grade in a school.
 * Used by: timetable generator, exam creation, diary entries, report cards.
 * School admin/teacher can read (to populate dropdowns).
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const WRITE_ROLES = ['super_admin'];
const READ_ROLES  = ['super_admin', 'school_admin', 'principal', 'hod', 'teacher'];

function resolveSchoolId(user: any, override?: string | null): string {
  const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  if (primary.role_code === 'super_admin' && override) return override;
  if (primary.school_id) return primary.school_id;
  throw new AppError('school_id required');
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!READ_ROLES.includes(primary.role_code)) throw new ForbiddenError();

    const { searchParams } = new URL(request.url);
    const schoolId   = resolveSchoolId(user, searchParams.get('school_id'));
    const gradeLevel = searchParams.get('grade_level') ?? undefined;
    const isCore     = searchParams.get('is_core');

    const subjects = await prisma.subjectCatalog.findMany({
      where: {
        schoolId,
        ...(gradeLevel ? { gradeLevel } : {}),
        ...(isCore !== null ? { isCore: isCore === 'true' } : {}),
      },
      orderBy: [{ gradeLevel: 'asc' }, { isCore: 'desc' }, { subject: 'asc' }],
    });

    return Response.json({ subjects });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!WRITE_ROLES.includes(primary.role_code)) throw new ForbiddenError('Super admin only');

    const body = await request.json();
    const { schoolId: sid, gradeLevel = 'all', subject, code, isCore = true, maxMarks = 100, passMarks = 33 } = body;
    const schoolId = resolveSchoolId(user, sid);

    if (!subject) throw new AppError('subject required');
    if (maxMarks < 1 || passMarks < 0 || passMarks > maxMarks)
      throw new AppError('Invalid maxMarks or passMarks');

    const entry = await prisma.subjectCatalog.upsert({
      where:  { schoolId_gradeLevel_subject: { schoolId, gradeLevel, subject } },
      create: { schoolId, gradeLevel, subject, code: code ?? null, isCore, maxMarks, passMarks, createdById: user.id },
      update: { code: code ?? null, isCore, maxMarks, passMarks },
    });

    return Response.json({ subject: entry }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!WRITE_ROLES.includes(primary.role_code)) throw new ForbiddenError('Super admin only');

    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new AppError('id required');
    const existing = await prisma.subjectCatalog.findUnique({ where: { id } });
    if (!existing) throw new AppError('Subject not found', 404);

    const body = await request.json();
    const updated = await prisma.subjectCatalog.update({
      where: { id },
      data: {
        ...(body.subject    !== undefined && { subject:    body.subject }),
        ...(body.code       !== undefined && { code:       body.code }),
        ...(body.isCore     !== undefined && { isCore:     body.isCore }),
        ...(body.maxMarks   !== undefined && { maxMarks:   body.maxMarks }),
        ...(body.passMarks  !== undefined && { passMarks:  body.passMarks }),
        ...(body.gradeLevel !== undefined && { gradeLevel: body.gradeLevel }),
      },
    });
    return Response.json({ subject: updated });
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!WRITE_ROLES.includes(primary.role_code)) throw new ForbiddenError('Super admin only');

    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new AppError('id required');
    const existing = await prisma.subjectCatalog.findUnique({ where: { id } });
    if (!existing) throw new AppError('Subject not found', 404);

    await prisma.subjectCatalog.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
