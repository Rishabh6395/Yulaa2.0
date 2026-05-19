/**
 * Performance At-Risk Configuration
 * GET    – list configs for the caller's scope (super_admin = all; school_admin = own school)
 * POST   – create a new rule (grade-specific or school-wide default)
 * PATCH  – update an existing rule by id
 * DELETE – delete a rule by id
 *
 * Rule resolution order (most specific wins):
 *   1. School + grade match
 *   2. School-wide default (grade = null)
 *   3. Global default (schoolId = null, grade = null)
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, NotFoundError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const SYSTEM_DEFAULTS = {
  minMarksPct:        40,
  minAttendancePct:   75,
  minHomeworkPct:     60,
  weightMarks:        40,
  weightAttendance:   35,
  weightHomework:     25,
  highRiskThreshold:  60,
  mediumRiskThreshold: 30,
};

function assertAdminOrSuperAdmin(user: any) {
  const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  if (!['super_admin', 'school_admin', 'principal'].includes(primary.role_code)) throw new ForbiddenError();
  return primary;
}

function getSchoolId(user: any, override?: string | null): string | null {
  const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  if (primary.role_code === 'super_admin') return override ?? null;
  return primary.school_id ?? null;
}

function validateThresholds(body: any) {
  const checks: [string, number, number][] = [
    ['minMarksPct',        body.minMarksPct,        0, 100],
    ['minAttendancePct',   body.minAttendancePct,   0, 100],
    ['minHomeworkPct',     body.minHomeworkPct,     0, 100],
    ['weightMarks',        body.weightMarks,        1, 100],
    ['weightAttendance',   body.weightAttendance,   1, 100],
    ['weightHomework',     body.weightHomework,     1, 100],
    ['highRiskThreshold',  body.highRiskThreshold,  1, 100],
    ['mediumRiskThreshold',body.mediumRiskThreshold,0,  99],
  ] as any;

  for (const [field, val, min, max] of checks as unknown as [string, unknown, number, number][]) {
    if (val !== undefined && val !== null) {
      if (typeof val !== 'number' || val < min || val > max) {
        throw new AppError(`${field} must be a number between ${min} and ${max}`);
      }
    }
  }

  if (body.weightMarks !== undefined && body.weightAttendance !== undefined && body.weightHomework !== undefined) {
    const total = body.weightMarks + body.weightAttendance + body.weightHomework;
    if (total !== 100) throw new AppError(`Weights must sum to 100. Got ${total}`);
  }

  if (body.highRiskThreshold !== undefined && body.mediumRiskThreshold !== undefined) {
    if (body.mediumRiskThreshold >= body.highRiskThreshold) {
      throw new AppError('mediumRiskThreshold must be less than highRiskThreshold');
    }
  }
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    assertAdminOrSuperAdmin(user);

    const { searchParams } = new URL(request.url);
    const schoolId = getSchoolId(user, searchParams.get('schoolId'));
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const isSuperAdmin = primary.role_code === 'super_admin';

    let configs;
    if (isSuperAdmin && !schoolId) {
      // Super admin with no filter: return all configs including global
      configs = await prisma.performanceRiskConfig.findMany({
        orderBy: [{ schoolId: 'asc' }, { grade: 'asc' }],
        include: { school: { select: { id: true, name: true } } },
      });
    } else {
      // School-scoped: return school configs + global fallback
      configs = await prisma.performanceRiskConfig.findMany({
        where: {
          OR: [
            { schoolId: schoolId ?? undefined },
            { schoolId: null },
          ],
        },
        orderBy: [{ schoolId: 'asc' }, { grade: 'asc' }],
        include: { school: { select: { id: true, name: true } } },
      });
    }

    return Response.json({ configs, systemDefaults: SYSTEM_DEFAULTS });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = assertAdminOrSuperAdmin(user);
    const isSuperAdmin = primary.role_code === 'super_admin';

    const body = await request.json();
    const {
      schoolId: bodySchoolId, grade,
      minMarksPct, minAttendancePct, minHomeworkPct,
      weightMarks, weightAttendance, weightHomework,
      highRiskThreshold, mediumRiskThreshold,
    } = body;

    // school_admin can only configure their own school
    let targetSchoolId: string | null;
    if (isSuperAdmin) {
      targetSchoolId = bodySchoolId ?? null;
    } else {
      targetSchoolId = primary.school_id;
      if (!targetSchoolId) throw new AppError('No school associated with your account');
    }

    validateThresholds(body);

    // Prevent duplicate (schoolId + grade) — upsert instead
    const existing = await prisma.performanceRiskConfig.findUnique({
      where: { schoolId_grade: { schoolId: targetSchoolId ?? '', grade: grade ?? null } },
    });
    if (existing) throw new AppError('A rule for this school + grade already exists. Use PATCH to update it.', 409);

    const config = await prisma.performanceRiskConfig.create({
      data: {
        schoolId:            targetSchoolId,
        grade:               grade ?? null,
        minMarksPct:         minMarksPct         ?? SYSTEM_DEFAULTS.minMarksPct,
        minAttendancePct:    minAttendancePct    ?? SYSTEM_DEFAULTS.minAttendancePct,
        minHomeworkPct:      minHomeworkPct      ?? SYSTEM_DEFAULTS.minHomeworkPct,
        weightMarks:         weightMarks         ?? SYSTEM_DEFAULTS.weightMarks,
        weightAttendance:    weightAttendance    ?? SYSTEM_DEFAULTS.weightAttendance,
        weightHomework:      weightHomework      ?? SYSTEM_DEFAULTS.weightHomework,
        highRiskThreshold:   highRiskThreshold   ?? SYSTEM_DEFAULTS.highRiskThreshold,
        mediumRiskThreshold: mediumRiskThreshold ?? SYSTEM_DEFAULTS.mediumRiskThreshold,
        createdById:         user.id,
      },
    });

    return Response.json({ config }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = assertAdminOrSuperAdmin(user);
    const isSuperAdmin = primary.role_code === 'super_admin';

    const body = await request.json();
    const { id, ...fields } = body;
    if (!id) throw new AppError('id is required');

    const existing = await prisma.performanceRiskConfig.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Risk config');

    // school_admin can only modify configs for their own school
    if (!isSuperAdmin && existing.schoolId !== primary.school_id) throw new ForbiddenError();

    validateThresholds(fields);

    const updated = await prisma.performanceRiskConfig.update({
      where: { id },
      data: {
        ...(fields.minMarksPct         !== undefined && { minMarksPct:         fields.minMarksPct }),
        ...(fields.minAttendancePct    !== undefined && { minAttendancePct:    fields.minAttendancePct }),
        ...(fields.minHomeworkPct      !== undefined && { minHomeworkPct:      fields.minHomeworkPct }),
        ...(fields.weightMarks         !== undefined && { weightMarks:         fields.weightMarks }),
        ...(fields.weightAttendance    !== undefined && { weightAttendance:    fields.weightAttendance }),
        ...(fields.weightHomework      !== undefined && { weightHomework:      fields.weightHomework }),
        ...(fields.highRiskThreshold   !== undefined && { highRiskThreshold:   fields.highRiskThreshold }),
        ...(fields.mediumRiskThreshold !== undefined && { mediumRiskThreshold: fields.mediumRiskThreshold }),
        ...(fields.grade               !== undefined && { grade:               fields.grade }),
      },
    });

    return Response.json({ config: updated });
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = assertAdminOrSuperAdmin(user);
    const isSuperAdmin = primary.role_code === 'super_admin';

    const { id } = await request.json();
    if (!id) throw new AppError('id is required');

    const existing = await prisma.performanceRiskConfig.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Risk config');

    if (!isSuperAdmin && existing.schoolId !== primary.school_id) throw new ForbiddenError();

    await prisma.performanceRiskConfig.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
