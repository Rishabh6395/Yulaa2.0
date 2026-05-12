/**
 * GET /api/career-sessions
 * Browse available career consultants.
 * - parent: sees consultants visible to their school (internal + external if allowed)
 * - school_admin / principal / hod: same school view
 * - super_admin: all consultants
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';
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

    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const isSuperAdmin = primaryRole.role_code === 'super_admin';
    const schoolId = primaryRole.school_id;

    const { searchParams } = new URL(request.url);
    const specialization = searchParams.get('specialization');
    const mode           = searchParams.get('mode'); // online | offline
    const nearbyKm       = searchParams.get('nearby_km') ? Number(searchParams.get('nearby_km')) : null;

    let school: { allowExternalConsultant: boolean; latitude: number | null; longitude: number | null } | null = null;
    if (!isSuperAdmin && schoolId) {
      school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { allowExternalConsultant: true, latitude: true, longitude: true },
      });
    }

    const consultants = await prisma.consultant.findMany({
      where: {
        isActive: true,
        ...(specialization && { specialization: { contains: specialization, mode: 'insensitive' } }),
        ...(!isSuperAdmin && schoolId
          ? {
              OR: [
                { isExternal: false, contracts: { some: { schoolId, status: 'active', endDate: { gte: new Date() } } } },
                ...(school?.allowExternalConsultant
                  ? [
                      { isExternal: true, areaScope: 'national' as const },
                      { isExternal: true, areaScope: 'state' as const },
                      { isExternal: true, areaScope: 'city' as const },
                      { isExternal: true, areaScope: 'school' as const, allowedSchoolIds: { has: schoolId } },
                    ]
                  : []),
              ],
            }
          : {}),
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, avatarUrl: true } },
        ratings: { select: { rating: true } },
        availability: { where: { isActive: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    let rows = consultants.map((c) => {
      const avgRating = c.ratings.length > 0
        ? c.ratings.reduce((s, r) => s + r.rating, 0) / c.ratings.length
        : null;

      const availableModes = [...new Set(c.availability.map((a) => a.mode))];
      const distance = nearbyKm && school?.latitude && school?.longitude && c.lat && c.lng
        ? distanceKm(school.latitude, school.longitude, c.lat, c.lng)
        : null;

      return {
        id: c.id,
        name: `${c.user.firstName} ${c.user.lastName}`,
        avatar_url: c.user.avatarUrl,
        specialization: c.specialization,
        bio: c.bio,
        qualifications: c.qualifications,
        experience_years: c.experienceYears,
        session_fee: c.sessionFee ? Number(c.sessionFee) : null,
        is_external: c.isExternal,
        area_scope: c.areaScope,
        available_modes: availableModes,
        avg_rating: avgRating ? Math.round(avgRating * 10) / 10 : null,
        rating_count: c.ratings.length,
        distance_km: distance !== null ? Math.round(distance * 10) / 10 : null,
      };
    });

    if (mode) {
      rows = rows.filter((r) => r.available_modes.includes(mode));
    }
    if (nearbyKm !== null) {
      rows = rows.filter((r) => r.distance_km !== null && r.distance_km <= nearbyKm);
      rows.sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0));
    }

    return Response.json({ consultants: rows, total: rows.length });
  } catch (err) { return handleError(err); }
}
