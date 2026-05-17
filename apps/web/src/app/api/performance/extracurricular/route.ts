/**
 * GET    /api/performance/extracurricular  — list entries
 * POST   /api/performance/extracurricular  — create entry (teacher)
 * PATCH  /api/performance/extracurricular?id=X — approve (admin/principal)
 * DELETE /api/performance/extracurricular?id=X — delete unapproved entry
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const { searchParams } = new URL(request.url);
    const schoolId    = primary.school_id ?? searchParams.get('school_id');
    const studentId   = searchParams.get('student_id');
    const cycleId     = searchParams.get('cycle_id');
    const academicYear = searchParams.get('academic_year');

    if (!schoolId) throw new AppError('school_id required');

    const entries = await prisma.extracurricularEntry.findMany({
      where: {
        schoolId,
        ...(studentId    ? { studentId }    : {}),
        ...(cycleId      ? { cycleId }      : {}),
        ...(academicYear ? { academicYear } : {}),
      },
      include: {
        student: { select: { firstName: true, lastName: true, admissionNo: true } },
      },
      orderBy: { date: 'desc' },
      take: 200,
    });

    return Response.json({ entries });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const schoolId = primary.school_id;
    if (!schoolId) throw new AppError('school_id required');

    if (!['teacher', 'school_admin', 'principal', 'hod', 'super_admin'].includes(primary.role_code))
      throw new ForbiddenError('Teacher or admin required');

    const body = await request.json();
    const { studentId, cycleId, academicYear, category, activity, role, achievement, level, date } = body;
    if (!studentId || !academicYear || !category || !activity || !date)
      throw new AppError('studentId, academicYear, category, activity, date required');

    // Auto-compute points from EcoPointsMatrix if level + achievement provided
    let points = body.points ?? 1;
    if (level && achievement) {
      const matrix = await prisma.ecoPointsMatrix.findFirst({
        where: { schoolId, level, achievement },
      });
      if (matrix) points = matrix.points;
    }

    const entry = await prisma.extracurricularEntry.create({
      data: {
        schoolId, studentId,
        cycleId:      cycleId  ?? null,
        academicYear,
        category, activity,
        role:        role        ?? null,
        achievement: achievement ?? null,
        level:       level       ?? null,
        points,
        date:        new Date(date),
        recordedById: user.id,
      },
    });

    return Response.json({ entry }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!['school_admin', 'principal', 'hod', 'super_admin'].includes(primary.role_code))
      throw new ForbiddenError('Admin approval required');

    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new AppError('id required');

    const entry = await prisma.extracurricularEntry.findUnique({ where: { id } });
    if (!entry) throw new AppError('Entry not found', 404);
    if (primary.school_id && entry.schoolId !== primary.school_id) throw new ForbiddenError();

    const updated = await prisma.extracurricularEntry.update({
      where: { id },
      data: { approvedById: user.id, approvedAt: new Date() },
    });

    return Response.json({ entry: updated });
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];

    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new AppError('id required');

    const entry = await prisma.extracurricularEntry.findUnique({ where: { id } });
    if (!entry) throw new AppError('Entry not found', 404);
    if (primary.school_id && entry.schoolId !== primary.school_id) throw new ForbiddenError();
    if (entry.approvedAt && !['school_admin', 'principal', 'super_admin'].includes(primary.role_code))
      throw new ForbiddenError('Cannot delete an approved entry');

    await prisma.extracurricularEntry.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
