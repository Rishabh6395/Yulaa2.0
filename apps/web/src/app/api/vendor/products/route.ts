/**
 * Vendor product catalogue.
 * GET  - parent/student/admin browse; vendor sees own products
 * POST - vendor creates product
 * PATCH - vendor updates product
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, NotFoundError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const primaryRole  = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const isVendor     = primaryRole.role_code === 'vendor';
    const isSuperAdmin = primaryRole.role_code === 'super_admin';
    const schoolId     = primaryRole.school_id;

    const { searchParams } = new URL(request.url);
    const category  = searchParams.get('category');
    const search    = searchParams.get('search');
    const minPrice  = searchParams.get('min_price') ? Number(searchParams.get('min_price')) : null;
    const maxPrice  = searchParams.get('max_price') ? Number(searchParams.get('max_price')) : null;
    const nearbyKm  = searchParams.get('nearby_km') ? Number(searchParams.get('nearby_km')) : null;

    let school: { allowExternalVendor: boolean; latitude: number | null; longitude: number | null } | null = null;
    if (!isSuperAdmin && !isVendor && schoolId) {
      school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { allowExternalVendor: true, latitude: true, longitude: true },
      });
    }

    let vendorWhere: Record<string, unknown> = { isActive: true };
    if (isVendor) {
      const vendor = await prisma.vendor.findUnique({ where: { userId: user.id } });
      if (!vendor) throw new NotFoundError('Vendor profile');
      vendorWhere = { id: vendor.id };
    } else if (!isSuperAdmin && schoolId) {
      vendorWhere = {
        isActive: true,
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
      };
    }

    const products = await prisma.vendorProduct.findMany({
      where: {
        isActive: true,
        vendor: vendorWhere,
        ...(category && { category }),
        ...(search && { name: { contains: search, mode: 'insensitive' } }),
        ...(minPrice !== null && { price: { gte: minPrice } }),
        ...(maxPrice !== null && { price: { lte: maxPrice } }),
      },
      include: {
        vendor: {
          select: {
            id: true,
            companyName: true,
            lat: true,
            lng: true,
            isExternal: true,
            areaScope: true,
            ratings: { select: { rating: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let rows = products.map((p) => {
      const avgRating = p.vendor.ratings.length > 0
        ? p.vendor.ratings.reduce((s, r) => s + r.rating, 0) / p.vendor.ratings.length
        : null;
      const distance =
        nearbyKm && school?.latitude && school?.longitude && p.vendor.lat && p.vendor.lng
          ? distanceKm(school.latitude, school.longitude, p.vendor.lat, p.vendor.lng)
          : null;
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category,
        price: Number(p.price),
        mrp: p.mrp ? Number(p.mrp) : null,
        quantity: p.quantity,
        unit: p.unit,
        image_urls: p.imageUrls,
        tags: p.tags,
        vendor_id: p.vendorId,
        vendor_name: p.vendor.companyName,
        vendor_rating: avgRating ? Math.round(avgRating * 10) / 10 : null,
        distance_km: distance !== null ? Math.round(distance * 10) / 10 : null,
        created_at: p.createdAt,
      };
    });

    if (nearbyKm !== null) {
      rows = rows.filter((r) => r.distance_km !== null && r.distance_km <= nearbyKm);
      rows.sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0));
    }

    return Response.json({ products: rows, total: rows.length });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (primaryRole.role_code !== 'vendor') throw new ForbiddenError('Only vendors can create products');

    const vendor = await prisma.vendor.findUnique({ where: { userId: user.id } });
    if (!vendor) throw new NotFoundError('Vendor profile');

    const body = await request.json();
    const { name, description, category, price, mrp, quantity, unit, image_urls, tags } = body;

    if (!name || !category || price === undefined) throw new AppError('name, category, and price are required');

    const product = await prisma.vendorProduct.create({
      data: {
        vendorId:    vendor.id,
        name,
        description: description ?? null,
        category,
        price,
        mrp:         mrp ?? null,
        quantity:    quantity ?? 0,
        unit:        unit ?? 'piece',
        imageUrls:   image_urls ?? [],
        tags:        tags ?? [],
      },
    });

    return Response.json({ product }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (primaryRole.role_code !== 'vendor') throw new ForbiddenError('Only vendors can update products');

    const vendor = await prisma.vendor.findUnique({ where: { userId: user.id } });
    if (!vendor) throw new NotFoundError('Vendor profile');

    const body = await request.json();
    const { id, name, description, category, price, mrp, quantity, unit, image_urls, tags, is_active } = body;
    if (!id) throw new AppError('id is required');

    const existing = await prisma.vendorProduct.findFirst({ where: { id, vendorId: vendor.id } });
    if (!existing) throw new NotFoundError('Product');

    const updated = await prisma.vendorProduct.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(category && { category }),
        ...(price !== undefined && { price }),
        ...(mrp !== undefined && { mrp }),
        ...(quantity !== undefined && { quantity }),
        ...(unit && { unit }),
        ...(image_urls && { imageUrls: image_urls }),
        ...(tags && { tags }),
        ...(is_active !== undefined && { isActive: Boolean(is_active) }),
      },
    });

    return Response.json({ product: updated });
  } catch (err) { return handleError(err); }
}
