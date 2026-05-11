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
    const category   = searchParams.get('category');

    const vendors = await prisma.vendor.findMany({
      where: {
        ...(isExternal !== null && { isExternal: isExternal === 'true' }),
        ...(areaScope && { areaScope }),
        ...(isActive !== null && { isActive: isActive === 'true' }),
        ...(category && { category }),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, status: true } },
        ratings: { select: { rating: true } },
        products: { where: { isActive: true }, select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = vendors.map((v) => {
      const avgRating = v.ratings.length > 0
        ? v.ratings.reduce((s, r) => s + r.rating, 0) / v.ratings.length
        : null;
      const now = new Date();
      const contractExpired = v.contractEnd ? v.contractEnd < now : false;
      return {
        id: v.id,
        user_id: v.userId,
        name: `${v.user.firstName} ${v.user.lastName}`,
        company_name: v.companyName,
        email: v.user.email,
        phone: v.user.phone,
        user_status: v.user.status,
        gst_no: v.gstNo,
        address: v.address,
        description: v.description,
        category: v.category,
        is_external: v.isExternal,
        is_active: v.isActive,
        area_scope: v.areaScope,
        allowed_school_ids: v.allowedSchoolIds,
        lat: v.lat,
        lng: v.lng,
        contract_start: v.contractStart,
        contract_end: v.contractEnd,
        contract_expired: contractExpired,
        avg_rating: avgRating ? Math.round(avgRating * 10) / 10 : null,
        rating_count: v.ratings.length,
        active_product_count: v.products.length,
        created_at: v.createdAt,
      };
    });

    return Response.json({ vendors: rows, total: rows.length });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    assertSuperAdmin(user);

    const body = await request.json();
    const { id, is_external, is_active, area_scope, allowed_school_ids, contract_end } = body;

    if (!id) throw new AppError('id is required');

    const existing = await prisma.vendor.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Vendor');

    const updated = await prisma.vendor.update({
      where: { id },
      data: {
        ...(is_external !== undefined && { isExternal: Boolean(is_external) }),
        ...(is_active !== undefined && { isActive: Boolean(is_active) }),
        ...(area_scope !== undefined && { areaScope: area_scope }),
        ...(allowed_school_ids !== undefined && { allowedSchoolIds: allowed_school_ids }),
        ...(contract_end !== undefined && { contractEnd: contract_end ? new Date(contract_end) : null }),
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    return Response.json({
      vendor: {
        id: updated.id,
        company_name: updated.companyName,
        name: `${updated.user.firstName} ${updated.user.lastName}`,
        is_external: updated.isExternal,
        is_active: updated.isActive,
        area_scope: updated.areaScope,
        allowed_school_ids: updated.allowedSchoolIds,
        contract_end: updated.contractEnd,
      },
    });
  } catch (err) { return handleError(err); }
}
