/**
 * GET /api/admission/masters?schoolId=X&type=blood-groups|gender
 *
 * Public endpoint (no auth required) — returns master data for the public
 * admission form so dropdowns are driven by school-configured master data
 * rather than hardcoded arrays.
 */
import { handleError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const DEFAULTS: Record<string, string[]> = {
  'blood-groups': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  'gender':       ['Male', 'Female', 'Other'],
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const type     = searchParams.get('type');

    if (!schoolId) throw new AppError('schoolId is required', 400);
    if (!type || !DEFAULTS[type]) throw new AppError('type must be blood-groups or gender', 400);

    const defaults = DEFAULTS[type];

    try {
      let names: string[] = [];
      if (type === 'blood-groups') {
        const rows = await prisma.bloodGroupMaster.findMany({
          where: { schoolId, isActive: true },
          orderBy: { sortOrder: 'asc' },
          select: { name: true },
        });
        names = rows.map(r => r.name);
      } else if (type === 'gender') {
        const rows = await prisma.genderMaster.findMany({
          where: { schoolId, isActive: true },
          orderBy: { sortOrder: 'asc' },
          select: { name: true },
        });
        names = rows.map(r => r.name);
      }

      return Response.json({ values: names.length > 0 ? names : defaults });
    } catch {
      return Response.json({ values: defaults });
    }
  } catch (err) { return handleError(err); }
}
