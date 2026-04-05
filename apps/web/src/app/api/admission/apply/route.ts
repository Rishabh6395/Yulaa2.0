import { getUserFromRequest } from '@/lib/auth';
import { submitApplication } from '@/modules/admission/admission.service';
import { handleError, AppError } from '@/utils/errors';

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

    for (let i = 0; i < children.length; i++) {
      const c = children[i];
      if (!c.firstName) throw new AppError(`Child ${i + 1}: first name is required`);
      if (c.dateOfBirth && isNaN(new Date(c.dateOfBirth).getTime())) {
        throw new AppError(`Child ${i + 1}: dateOfBirth is not a valid date`);
      }
    }

    const result = await submitApplication({
      schoolId,
      parentName,
      parentPhone,
      parentEmail: parentEmail ?? authUser?.email ?? '',
      parentOccupation,
      parentUserId: authUser?.id ?? null,
      children,
    });

    return Response.json(result, { status: 201 });
  } catch (err) { return handleError(err); }
}
