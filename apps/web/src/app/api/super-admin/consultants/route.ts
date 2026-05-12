import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, NotFoundError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

function assertSuperAdmin(user: Awaited<ReturnType<typeof getUserFromRequest>>) {
  if (!user) throw new UnauthorizedError();
  if (!user.roles.some((r) => r.role_code === 'super_admin')) throw new ForbiddenError();
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    assertSuperAdmin(user);

    const { searchParams } = new URL(request.url);
    const isExternal = searchParams.get('is_external');
    const areaScope  = searchParams.get('area_scope');
    const isActive   = searchParams.get('is_active');

    const consultants = await prisma.consultant.findMany({
      where: {
        ...(isExternal !== null && { isExternal: isExternal === 'true' }),
        ...(areaScope && { areaScope }),
        ...(isActive !== null && { isActive: isActive === 'true' }),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, status: true } },
        contracts: {
          orderBy: { endDate: 'desc' },
          take: 1,
          include: { school: { select: { id: true, name: true } } },
        },
        ratings: { select: { rating: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = consultants.map((c) => {
      const avgRating = c.ratings.length > 0
        ? c.ratings.reduce((s, r) => s + r.rating, 0) / c.ratings.length
        : null;
      const latestContract = c.contracts[0] ?? null;
      return {
        id: c.id,
        user_id: c.userId,
        name: `${c.user.firstName} ${c.user.lastName}`,
        email: c.user.email,
        phone: c.user.phone,
        user_status: c.user.status,
        specialization: c.specialization,
        bio: c.bio,
        qualifications: c.qualifications,
        experience_years: c.experienceYears,
        session_fee: c.sessionFee ? Number(c.sessionFee) : null,
        is_external: c.isExternal,
        is_active: c.isActive,
        area_scope: c.areaScope,
        allowed_school_ids: c.allowedSchoolIds,
        lat: c.lat,
        lng: c.lng,
        avg_rating: avgRating ? Math.round(avgRating * 10) / 10 : null,
        rating_count: c.ratings.length,
        latest_contract: latestContract ? {
          id: latestContract.id,
          contract_no: latestContract.contractNo,
          start_date: latestContract.startDate,
          end_date: latestContract.endDate,
          status: latestContract.status,
          school: latestContract.school,
        } : null,
        created_at: c.createdAt,
      };
    });

    return Response.json({ consultants: rows, total: rows.length });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    assertSuperAdmin(user);

    const body = await request.json();
    const { id, is_external, is_active, area_scope, allowed_school_ids, session_fee } = body;

    if (!id) throw new AppError('id is required');

    const existing = await prisma.consultant.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Consultant');

    const updated = await prisma.consultant.update({
      where: { id },
      data: {
        ...(is_external !== undefined && { isExternal: Boolean(is_external) }),
        ...(is_active !== undefined && { isActive: Boolean(is_active) }),
        ...(area_scope !== undefined && { areaScope: area_scope }),
        ...(allowed_school_ids !== undefined && { allowedSchoolIds: allowed_school_ids }),
        ...(session_fee !== undefined && { sessionFee: session_fee }),
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    return Response.json({
      consultant: {
        id: updated.id,
        name: `${updated.user.firstName} ${updated.user.lastName}`,
        is_external: updated.isExternal,
        is_active: updated.isActive,
        area_scope: updated.areaScope,
        allowed_school_ids: updated.allowedSchoolIds,
        session_fee: updated.sessionFee ? Number(updated.sessionFee) : null,
      },
    });
  } catch (err) { return handleError(err); }
}
