/**
 * GET /api/admission/grades?schoolId=X
 *
 * Public endpoint (no auth required) — returns the list of active grade names for
 * a school so the public /apply admission form can populate its grade dropdown
 * dynamically instead of using a hardcoded list.
 *
 * Falls back to the default 15-grade list if the grade_masters table doesn't exist
 * yet or the school has no grades configured.
 */
import { handleError } from '@/utils/errors';
import prisma from '@/lib/prisma';
import { AppError } from '@/utils/errors';

const DEFAULT_GRADES = [
  'Nursery', 'LKG', 'UKG',
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5',
  'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10',
  'Grade 11', 'Grade 12',
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    if (!schoolId) throw new AppError('schoolId is required', 400);

    try {
      const records = await prisma.gradeMaster.findMany({
        where: { schoolId, isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: { name: true },
      });

      const grades = records.length > 0
        ? records.map(r => r.name)
        : DEFAULT_GRADES;

      return Response.json({ grades });
    } catch {
      // grade_masters table may not exist yet — return safe defaults
      return Response.json({ grades: DEFAULT_GRADES });
    }
  } catch (err) { return handleError(err); }
}
