import { getUserFromRequest } from '@/lib/auth';
import { submitApplication } from '@/modules/admission/admission.service';
import { handleError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

/** POST /api/admission/apply */
export async function POST(request: Request) {
  try {
    // Read auth token if present (parents submitting while logged in)
    const authUser = await getUserFromRequest(request).catch(() => null);

    const body = await request.json();
    const { schoolId, parentName, parentPhone, parentEmail, parentOccupation, children } = body;

    if (!schoolId)         throw new AppError('schoolId is required');
    if (!parentName)       throw new AppError('parentName is required');
    if (!parentPhone)      throw new AppError('parentPhone is required');
    if (!children?.length) throw new AppError('At least one child is required');

    // Validate the school exists and is active (prevents submitting to bogus/other-tenant IDs)
    const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { id: true, status: true } });
    if (!school || school.status !== 'active') throw new AppError('School not found or not accepting admissions', 400);

    for (let i = 0; i < children.length; i++) {
      const c = children[i];
      if (!c.firstName) throw new AppError(`Child ${i + 1}: first name is required`);
      if (c.dateOfBirth && isNaN(new Date(c.dateOfBirth).getTime())) {
        throw new AppError(`Child ${i + 1}: dateOfBirth is not a valid date`);
      }
    }

    // Only link the authenticated user as parent if they are actually a parent/guardian,
    // not an admin submitting on someone else's behalf.
    const ADMIN_ROLES = ['super_admin', 'school_admin', 'principal', 'teacher'];
    const isAdmin = authUser?.roles?.some((r: any) => ADMIN_ROLES.includes(r.role_code));

    const result = await submitApplication({
      schoolId,
      parentName,
      parentPhone,
      parentEmail: parentEmail ?? (!isAdmin ? authUser?.email : '') ?? '',
      parentOccupation,
      parentUserId: isAdmin ? null : (authUser?.id ?? null),
      children,
    });

    return Response.json(result, { status: 201 });
  } catch (err) { return handleError(err); }
}
