/**
 * School admin — manage consultants linked to their school.
 * GET    - list consultants for this school (internal + external if enabled)
 * POST   - create an internal consultant for this school (is_external always false)
 * PATCH  - update contract end date or status
 * (External consultant creation is handled by super admin at /api/super-admin/consultants)
 */
import { randomBytes } from 'crypto';
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, NotFoundError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

function assertAdmin(user: Awaited<ReturnType<typeof getUserFromRequest>>) {
  if (!user) throw new UnauthorizedError();
  const role = user.roles.find((r) => r.is_primary) ?? user.roles[0];
  if (!['school_admin', 'principal'].includes(role.role_code)) throw new ForbiddenError();
  return role;
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    const role = assertAdmin(user);
    const schoolId = role.school_id!;

    const { searchParams } = new URL(request.url);
    const isExternal = searchParams.get('is_external');

    const contracts = await prisma.consultantContract.findMany({
      where: {
        schoolId,
        ...(isExternal !== null ? { consultant: { isExternal: isExternal === 'true' } } : {}),
      },
      include: {
        consultant: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true, phone: true } },
            ratings: { select: { rating: true } },
          },
        },
      },
      orderBy: { endDate: 'desc' },
    });

    const today = new Date();
    const rows = contracts.map((c) => {
      const avgRating = c.consultant.ratings.length > 0
        ? c.consultant.ratings.reduce((s, r) => s + r.rating, 0) / c.consultant.ratings.length
        : null;
      return {
        contract_id: c.id,
        contract_no: c.contractNo,
        start_date: c.startDate,
        end_date: c.endDate,
        status: c.status,
        days_remaining: Math.ceil((c.endDate.getTime() - today.getTime()) / 86400000),
        consultant: {
          id: c.consultantId,
          name: `${c.consultant.user.firstName} ${c.consultant.user.lastName}`,
          email: c.consultant.user.email,
          phone: c.consultant.user.phone,
          specialization: c.consultant.specialization,
          session_fee: c.consultant.sessionFee ? Number(c.consultant.sessionFee) : null,
          is_external: c.consultant.isExternal,
          is_active: c.consultant.isActive,
          avg_rating: avgRating ? Math.round(avgRating * 10) / 10 : null,
        },
      };
    });

    return Response.json({ consultants: rows, total: rows.length });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    const role = assertAdmin(user);
    const schoolId = role.school_id!;

    const body = await request.json();
    const { first_name, last_name, email, phone, password, specialization, bio, qualifications, experience_years, session_fee, contract_start, contract_end, contract_value } = body;

    if (!first_name?.trim()) throw new AppError('First name is required.');
    if (!last_name?.trim())  throw new AppError('Last name is required.');
    if (!email?.trim())      throw new AppError('Email address is required.');
    if (!contract_end)       throw new AppError('Contract end date is required.');

    const emailNorm = email.toLowerCase().trim();
    let existingUser = await prisma.user.findUnique({ where: { email: emailNorm } });
    let consultantProfile = existingUser
      ? await prisma.consultant.findUnique({ where: { userId: existingUser.id } })
      : null;

    if (!existingUser) {
      const consultantRole = await prisma.role.findUnique({ where: { code: 'consultant' } });
      if (!consultantRole) throw new AppError('Consultant role is not configured in the system. Please contact your Yulaa administrator.');

      const hash = await bcrypt.hash(password || randomBytes(12).toString('hex'), 12);
      existingUser = await prisma.user.create({
        data: {
          email: emailNorm,
          passwordHash: hash,
          firstName: first_name.trim(),
          lastName: last_name.trim(),
          phone: phone ?? null,
          userRoles: { create: { roleId: consultantRole.id, schoolId, isPrimary: true } },
        },
      });
    }

    if (!consultantProfile) {
      consultantProfile = await prisma.consultant.create({
        data: {
          userId:           existingUser.id,
          specialization:   specialization ?? null,
          bio:              bio ?? null,
          qualifications:   qualifications ?? null,
          experienceYears:  experience_years ?? null,
          sessionFee:       session_fee ?? null,
          isExternal:       false,
          allowedSchoolIds: [schoolId],
        },
      });
    } else if (consultantProfile.isExternal) {
      throw new AppError('This email belongs to an external consultant. Only internal consultants can be created here. Contact your Yulaa super admin for external consultant management.');
    } else if (!consultantProfile.allowedSchoolIds.includes(schoolId)) {
      consultantProfile = await prisma.consultant.update({
        where: { id: consultantProfile.id },
        data: { allowedSchoolIds: [...consultantProfile.allowedSchoolIds, schoolId] },
      });
    }

    // Prevent creating a duplicate active contract for the same consultant + school
    const existingActiveContract = await prisma.consultantContract.findFirst({
      where: { consultantId: consultantProfile.id, schoolId, status: 'active' },
    });
    if (existingActiveContract) {
      throw new AppError('An active contract already exists for this consultant at your school. Update the existing contract instead.');
    }

    const contractNo = `CON-${schoolId.slice(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const contract = await prisma.consultantContract.create({
      data: {
        consultantId:  consultantProfile.id,
        schoolId,
        contractNo,
        startDate:     contract_start ? new Date(contract_start) : new Date(),
        endDate:       new Date(contract_end),
        contractValue: contract_value ?? null,
        status:        'active',
      },
    });

    return Response.json({ consultant: consultantProfile, contract }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    const role = assertAdmin(user);
    const schoolId = role.school_id!;

    const body = await request.json();
    const { contract_id, contract_end, status } = body;
    if (!contract_id) throw new AppError('contract_id is required');

    const contract = await prisma.consultantContract.findFirst({ where: { id: contract_id, schoolId } });
    if (!contract) throw new NotFoundError('Contract');

    const updated = await prisma.consultantContract.update({
      where: { id: contract_id },
      data: {
        ...(contract_end && { endDate: new Date(contract_end) }),
        ...(status && { status }),
      },
    });

    return Response.json({ contract: updated });
  } catch (err) { return handleError(err); }
}
