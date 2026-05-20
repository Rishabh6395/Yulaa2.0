/**
 * POST /api/masters/seed-standard
 * Creates all standard GenericMasterType entries (with default values) for a school.
 * Idempotent — skips types that already exist.
 */

import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import { STANDARD_MASTERS } from '@/lib/standard-masters';
import prisma from '@/lib/prisma';

const ADMIN_ROLES = ['super_admin', 'school_admin', 'principal'];

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some((r) => ADMIN_ROLES.includes(r.role_code))) {
      throw new ForbiddenError('Admin access required');
    }

    const { schoolId: bodySchoolId } = await request.json().catch(() => ({}));
    const isSuperAdmin = user.roles.some((r) => r.role_code === 'super_admin');
    const schoolId = isSuperAdmin && bodySchoolId
      ? bodySchoolId
      : (user.roles.find((r) => r.is_primary) ?? user.roles[0])?.school_id;

    if (!schoolId) throw new AppError('schoolId is required', 400);

    let created = 0;
    let skipped = 0;

    for (const master of STANDARD_MASTERS) {
      const existing = await prisma.genericMasterType.findUnique({
        where: { schoolId_slug: { schoolId, slug: master.slug } },
      });

      if (existing) { skipped++; continue; }

      const type = await prisma.genericMasterType.create({
        data: {
          schoolId,
          name: master.name,
          slug: master.slug,
          description: master.description,
        },
      });

      if (master.defaults.length > 0) {
        await prisma.genericMasterValue.createMany({
          data: master.defaults.map((name, i) => ({
            typeId: type.id,
            name,
            sortOrder: i,
          })),
        });
      }

      created++;
    }

    return Response.json({ created, skipped, total: STANDARD_MASTERS.length });
  } catch (err) { return handleError(err); }
}
