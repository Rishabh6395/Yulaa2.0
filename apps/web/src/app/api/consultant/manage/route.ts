/**
 * School admin — manage consultants linked to their school.
 * GET    - list consultants for this school (internal + external if enabled)
 * POST   - create/link a consultant to this school (creates User + Consultant + Contract)
 * PATCH  - update contract end date, or toggle active status
 */
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
    const {
      first_name, last_name, email, phone, password,
      specialization, bio, qualifications, experience_years,
      session_fee, is_external,
      contract_start, contract_end, contract_value,
    } = body;

    if (!first_name || !last_name || !email || !contract_end) {
      throw new AppError('first_name, last_name, email, and contract_end are required');
    }

    // Check if an external consultant is requested and allowed
    if (is_external) {
      const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { allowExternalConsultant: true } });
      if (!school?.allowExternalConsultant) {
        throw new ForbiddenError('External consultants are not enabled for this school. Contact the super admin.');
      }
    }

    // Check if user already exists
    let existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    let consultantProfile = existingUser
      ? await prisma.consultant.findUnique({ where: { userId: existingUser.id } })
      : null;

    if (!existingUser) {
      const consultantRole = await prisma.role.findUnique({ where: { code: 'consultant' } });
      if (!consultantRole) throw new AppError('Consultant role not configured in the system');

      const hash = await bcrypt.hash(password || 'Yulaa@2024', 12);
      existingUser = await prisma.user.create({
        data: {
          email: email.toLowerCase().trim(),
          passwordHash: hash,
          firstName: first_name,
          lastName: last_name,
          phone: phone ?? null,
          userRoles: {
            create: { roleId: consultantRole.id, schoolId, isPrimary: true },
          },
        },
      });
    }

    if (!consultantProfile) {
      consultantProfile = await prisma.consultant.create({
        data: {
          userId: existingUser.id,
          specialization: specialization ?? null,
          bio: bio ?? null,
          qualifications: qualifications ?? null,
          experienceYears: experience_years ?? null,
          sessionFee: session_fee ?? null,
          isExternal: Boolean(is_external),
          allowedSchoolIds: [schoolId],
        },
      });
    } else if (!consultantProfile.allowedSchoolIds.includes(schoolId)) {
      // Link existing consultant to this school
      consultantProfile = await prisma.consultant.update({
        where: { id: consultantProfile.id },
        data: { allowedSchoolIds: [...consultantProfile.allowedSchoolIds, schoolId] },
      });
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
