/**
 * GET    /api/fees/late-fee-config?school_id=X              — list configs
 * POST   /api/fees/late-fee-config                          — upsert late fee config
 * PATCH  /api/fees/late-fee-config?id=X                     — update specific entry
 * DELETE /api/fees/late-fee-config?id=X                     — delete entry
 *
 * lateFeeType: 'fixed' | 'percent'
 * Uniquely keyed by (schoolId, feeCategory, academicYear).
 * feeCategory defaults to 'default'; academicYear defaults to 'all' (applies to all years).
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const ADMIN_ROLES = ['super_admin', 'school_admin', 'principal'];

async function resolveSchoolId(user: any, override?: string | null): Promise<string> {
  const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  if (primary.role_code === 'super_admin' && override) return override;
  if (primary.school_id) return primary.school_id;
  throw new AppError('school_id required');
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const { searchParams } = new URL(request.url);
    const schoolId = await resolveSchoolId(user, searchParams.get('school_id'));

    const configs = await prisma.lateFeeConfig.findMany({
      where: { schoolId },
      orderBy: [{ feeCategory: 'asc' }, { academicYear: 'asc' }],
    });

    return Response.json({ configs });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError('Admin required');

    const body = await request.json();
    const {
      schoolId: bodySchoolId, feeCategory, academicYear,
      graceDays, lateFeeType, lateFeeValue, maxLateFee, isActive,
    } = body;

    const schoolId = await resolveSchoolId(user, bodySchoolId);
    if (!lateFeeType || lateFeeValue === undefined)
      throw new AppError('lateFeeType and lateFeeValue required');
    if (!['fixed', 'percent'].includes(lateFeeType))
      throw new AppError('lateFeeType must be fixed or percent');
    if (lateFeeType === 'percent' && (lateFeeValue < 0 || lateFeeValue > 100))
      throw new AppError('lateFeeValue must be 0–100 for percent type');

    const cat  = feeCategory  ?? 'default';
    const year = academicYear ?? 'all';

    const config = await prisma.lateFeeConfig.upsert({
      where:  { schoolId_feeCategory_academicYear: { schoolId, feeCategory: cat, academicYear: year } },
      create: {
        schoolId, feeCategory: cat, academicYear: year,
        graceDays:    graceDays    ?? 0,
        lateFeeType,
        lateFeeValue,
        maxLateFee:   maxLateFee   ?? null,
        isActive:     isActive     ?? true,
        createdById:  user.id,
      },
      update: {
        graceDays:    graceDays    ?? 0,
        lateFeeType,
        lateFeeValue,
        maxLateFee:   maxLateFee   ?? null,
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    return Response.json({ config }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError('Admin required');

    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new AppError('id required');

    const cfg = await prisma.lateFeeConfig.findUnique({ where: { id } });
    if (!cfg) throw new AppError('Config not found', 404);
    if (primary.school_id && cfg.schoolId !== primary.school_id) throw new ForbiddenError();

    const body = await request.json();
    if (body.lateFeeType && !['fixed', 'percent'].includes(body.lateFeeType))
      throw new AppError('lateFeeType must be fixed or percent');

    const updated = await prisma.lateFeeConfig.update({
      where: { id },
      data: {
        ...(body.graceDays    !== undefined ? { graceDays: body.graceDays }       : {}),
        ...(body.lateFeeType  !== undefined ? { lateFeeType: body.lateFeeType }   : {}),
        ...(body.lateFeeValue !== undefined ? { lateFeeValue: body.lateFeeValue } : {}),
        ...(body.maxLateFee   !== undefined ? { maxLateFee: body.maxLateFee }     : {}),
        ...(body.isActive     !== undefined ? { isActive: body.isActive }         : {}),
      },
    });

    return Response.json({ config: updated });
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!['super_admin', 'school_admin'].includes(primary.role_code)) throw new ForbiddenError();

    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new AppError('id required');

    const cfg = await prisma.lateFeeConfig.findUnique({ where: { id } });
    if (!cfg) throw new AppError('Config not found', 404);
    if (primary.school_id && cfg.schoolId !== primary.school_id) throw new ForbiddenError();

    await prisma.lateFeeConfig.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
