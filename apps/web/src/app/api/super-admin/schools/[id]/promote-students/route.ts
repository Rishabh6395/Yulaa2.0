/**
 * POST /api/super-admin/schools/[id]/promote-students
 *
 * Promotes students from their current class to the next grade class
 * for the selected grade mappings.
 *
 * Body:
 * {
 *   promotions: [{ fromGrade: 'Grade 5', toGrade: 'Grade 6' }, ...]
 * }
 *
 * For each mapping:
 *   1. Find the target Class record for toGrade (same school, same section pattern)
 *   2. Update all active Students in the fromGrade class(es) to the toGrade class
 *
 * Students in the final grade (Grade 12 / no next class) are left as-is — they
 * should be handled separately via alumni/graduation workflow.
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!['super_admin', 'school_admin', 'principal'].includes(primary.role_code))
      throw new ForbiddenError('Admin role required');

    const { id: schoolId } = await params;
    if (primary.school_id && primary.school_id !== schoolId)
      throw new ForbiddenError('Access denied');

    const { promotions } = await request.json() as {
      promotions: { fromGrade: string; toGrade: string }[];
    };

    if (!Array.isArray(promotions) || promotions.length === 0)
      throw new AppError('promotions array is required', 400);

    const results: { fromGrade: string; toGrade: string; promoted: number; skipped: string }[] = [];

    for (const { fromGrade, toGrade } of promotions) {
      if (!fromGrade || !toGrade) continue;

      // Find all source classes for fromGrade
      const fromClasses = await prisma.class.findMany({
        where: { schoolId, grade: { equals: fromGrade, mode: 'insensitive' } },
        select: { id: true, section: true },
      });

      if (fromClasses.length === 0) {
        results.push({ fromGrade, toGrade, promoted: 0, skipped: `No classes found for grade "${fromGrade}"` });
        continue;
      }

      let promotedCount = 0;
      for (const fromClass of fromClasses) {
        // Find matching target class (same section if possible, fallback to any)
        const toClass = await prisma.class.findFirst({
          where: {
            schoolId,
            grade: { equals: toGrade, mode: 'insensitive' },
            ...(fromClass.section ? { section: { equals: fromClass.section, mode: 'insensitive' } } : {}),
          },
          select: { id: true },
        });

        if (!toClass) continue; // No target class for this section — skip

        const { count } = await prisma.student.updateMany({
          where: { schoolId, classId: fromClass.id, status: 'active' },
          data:  { classId: toClass.id },
        });
        promotedCount += count;
      }

      results.push({ fromGrade, toGrade, promoted: promotedCount, skipped: '' });
    }

    const totalPromoted = results.reduce((s, r) => s + r.promoted, 0);
    return Response.json({ ok: true, totalPromoted, results }, { status: 200 });
  } catch (err) { return handleError(err); }
}
