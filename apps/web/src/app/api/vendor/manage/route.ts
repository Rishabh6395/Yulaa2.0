/**
 * School admin — manage vendors linked to their school.
 * GET    - list vendors accessible to this school
 * POST   - create a vendor account (internal or external if allowed)
 * PATCH  - update vendor contract end date, area, or active status
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
    const category   = searchParams.get('category');
    const isExternal = searchParams.get('is_external');

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { allowExternalVendor: true },
    });

    const vendors = await prisma.vendor.findMany({
      where: {
        isActive: true,
        ...(category && { category }),
        ...(isExternal !== null ? { isExternal: isExternal === 'true' } : {}),
        OR: [
          { isExternal: false, allowedSchoolIds: { has: schoolId } },
          ...(school?.allowExternalVendor
            ? [
                { isExternal: true, areaScope: 'national' },
                { isExternal: true, areaScope: 'state' },
                { isExternal: true, areaScope: 'city' },
                { isExternal: true, areaScope: 'school', allowedSchoolIds: { has: schoolId } },
              ]
            : []),
        ],
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phone: true } },
        ratings: { select: { rating: true } },
        products: { where: { isActive: true }, select: { id: true, category: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const rows = vendors.map((v) => {
      const avgRating = v.ratings.length > 0
        ? v.ratings.reduce((s, r) => s + r.rating, 0) / v.ratings.length
        : null;
      return {
        id: v.id,
        company_name: v.companyName,
        contact_name: `${v.user.firstName} ${v.user.lastName}`,
        email: v.user.email,
        phone: v.user.phone,
        description: v.description,
        category: v.category,
        gst_no: v.gstNo,
        address: v.address,
        is_external: v.isExternal,
        is_active: v.isActive,
        area_scope: v.areaScope,
        contract_start: v.contractStart,
        contract_end: v.contractEnd,
        contract_expired: v.contractEnd ? v.contractEnd < now : false,
        avg_rating: avgRating ? Math.round(avgRating * 10) / 10 : null,
        product_count: v.products.length,
      };
    });

    return Response.json({ vendors: rows, total: rows.length });
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
      company_name, gst_no, address, description, category,
      is_external, contract_start, contract_end,
    } = body;

    if (!first_name || !last_name || !email || !company_name) {
      throw new AppError('first_name, last_name, email, and company_name are required');
    }

    if (is_external) {
      const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { allowExternalVendor: true } });
      if (!school?.allowExternalVendor) {
        throw new ForbiddenError('External vendors are not enabled for this school. Contact the super admin.');
      }
    }

    let existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    let vendorProfile = existingUser
      ? await prisma.vendor.findUnique({ where: { userId: existingUser.id } })
      : null;

    if (!existingUser) {
      const vendorRole = await prisma.role.findUnique({ where: { code: 'vendor' } });
      if (!vendorRole) throw new AppError('Vendor role not configured in the system');

      const hash = await bcrypt.hash(password || 'Yulaa@2024', 12);
      existingUser = await prisma.user.create({
        data: {
          email: email.toLowerCase().trim(),
          passwordHash: hash,
          firstName: first_name,
          lastName: last_name,
          phone: phone ?? null,
          userRoles: {
            create: { roleId: vendorRole.id, schoolId, isPrimary: true },
          },
        },
      });
    }

    if (!vendorProfile) {
      vendorProfile = await prisma.vendor.create({
        data: {
          userId:          existingUser.id,
          companyName:     company_name,
          gstNo:           gst_no ?? null,
          address:         address ?? null,
          description:     description ?? null,
          category:        category ?? null,
          isExternal:      Boolean(is_external),
          allowedSchoolIds: [schoolId],
          contractStart:   contract_start ? new Date(contract_start) : new Date(),
          contractEnd:     contract_end ? new Date(contract_end) : null,
        },
      });
    }

    return Response.json({ vendor: vendorProfile }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    const role = assertAdmin(user);
    const schoolId = role.school_id!;

    const body = await request.json();
    const { vendor_id, contract_end, is_active } = body;
    if (!vendor_id) throw new AppError('vendor_id is required');

    const vendor = await prisma.vendor.findFirst({
      where: { id: vendor_id, allowedSchoolIds: { has: schoolId } },
    });
    if (!vendor) throw new NotFoundError('Vendor');

    const updated = await prisma.vendor.update({
      where: { id: vendor_id },
      data: {
        ...(contract_end !== undefined && { contractEnd: contract_end ? new Date(contract_end) : null }),
        ...(is_active !== undefined && { isActive: Boolean(is_active) }),
      },
    });

    return Response.json({ vendor: updated });
  } catch (err) { return handleError(err); }
}
