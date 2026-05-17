/**
 * GET    /api/super-admin/grading-scheme?school_id=X&grade_level=X  — list schemes
 * POST   /api/super-admin/grading-scheme                             — create/upsert band
 * PATCH  /api/super-admin/grading-scheme?id=X                       — update single band
 * DELETE /api/super-admin/grading-scheme?id=X                       — delete band
 *
 * Super admin sets grade boundaries per school per grade-level.
 * School admin/principal can read their own school's scheme.
 *
 * Default scheme (if none configured): 90+=A+, 80-89=A, 70-79=B+, 60-69=B, 50-59=C, 33-49=D, 0-32=F
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const SUPER_ADMIN_ROLES = ['super_admin'];
const READ_ROLES = ['super_admin', 'school_admin', 'principal', 'hod'];

const DEFAULT_SCHEME = [
  { label: 'A+', minPct: 90, maxPct: 100, gpaPoints: 10.0, remark: 'Outstanding' },
  { label: 'A',  minPct: 80, maxPct: 89,  gpaPoints: 9.0,  remark: 'Excellent' },
  { label: 'B+', minPct: 70, maxPct: 79,  gpaPoints: 8.0,  remark: 'Very Good' },
  { label: 'B',  minPct: 60, maxPct: 69,  gpaPoints: 7.0,  remark: 'Good' },
  { label: 'C',  minPct: 50, maxPct: 59,  gpaPoints: 6.0,  remark: 'Average' },
  { label: 'D',  minPct: 33, maxPct: 49,  gpaPoints: 5.0,  remark: 'Pass' },
  { label: 'F',  minPct: 0,  maxPct: 32,  gpaPoints: 0.0,  remark: 'Fail' },
];

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

    const schemes = await prisma.gradingScheme.findMany({
      where: { schoolId, ...(gradeLevel ? { gradeLevel } : {}) },
      orderBy: [{ gradeLevel: 'asc' }, { minPct: 'desc' }],
    });

    return Response.json({ schemes, defaultScheme: schemes.length === 0 ? DEFAULT_SCHEME : null });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!SUPER_ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError('Super admin only');

    const body = await request.json();
    const { schoolId: sid, gradeLevel = 'all', label, minPct, maxPct, gpaPoints = 0, remark } = body;
    const schoolId = resolveSchoolId(user, sid);

    if (!label || minPct === undefined || maxPct === undefined)
      throw new AppError('label, minPct, maxPct required');
    if (minPct < 0 || maxPct > 100 || minPct > maxPct)
      throw new AppError('Invalid percentage range');

    const scheme = await prisma.gradingScheme.upsert({
      where:  { schoolId_gradeLevel_label: { schoolId, gradeLevel, label } },
      create: { schoolId, gradeLevel, label, minPct, maxPct, gpaPoints, remark: remark ?? null, createdById: user.id },
      update: { minPct, maxPct, gpaPoints, remark: remark ?? null },
    });

    return Response.json({ scheme }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!SUPER_ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError('Super admin only');

    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new AppError('id required');
    const existing = await prisma.gradingScheme.findUnique({ where: { id } });
    if (!existing) throw new AppError('Grading scheme not found', 404);

    const body = await request.json();
    const updated = await prisma.gradingScheme.update({
      where: { id },
      data: {
        ...(body.label      !== undefined && { label:      body.label }),
        ...(body.minPct     !== undefined && { minPct:     body.minPct }),
        ...(body.maxPct     !== undefined && { maxPct:     body.maxPct }),
        ...(body.gpaPoints  !== undefined && { gpaPoints:  body.gpaPoints }),
        ...(body.remark     !== undefined && { remark:     body.remark }),
        ...(body.gradeLevel !== undefined && { gradeLevel: body.gradeLevel }),
      },
    });
    return Response.json({ scheme: updated });
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!SUPER_ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError('Super admin only');

    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new AppError('id required');
    const existing = await prisma.gradingScheme.findUnique({ where: { id } });
    if (!existing) throw new AppError('Grading scheme not found', 404);

    await prisma.gradingScheme.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
