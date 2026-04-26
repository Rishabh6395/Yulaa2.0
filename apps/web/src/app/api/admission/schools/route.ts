import prisma from '@/lib/prisma';
import { handleError } from '@/utils/errors';

/** GET /api/admission/schools — public, no auth */
export async function GET() {
  try {
    const schools = await prisma.school.findMany({
      where:   { status: 'active' },
      select:  { id: true, name: true, logoUrl: true, address: true, city: true, state: true, description: true, facilities: true, admissionFeeAmt: true },
      orderBy: { name: 'asc' },
    });
    return Response.json({ schools });
  } catch (err) { return handleError(err); }
}
