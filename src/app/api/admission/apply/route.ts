import { submitApplication } from '@/modules/admission/admission.service';
import { handleError, AppError } from '@/utils/errors';

/** POST /api/admission/apply — public */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { schoolId, parentName, parentPhone, parentEmail, parentOccupation, children } = body;

    if (!schoolId)    throw new AppError('schoolId is required');
    if (!parentName)  throw new AppError('parentName is required');
    if (!parentPhone) throw new AppError('parentPhone is required');
    if (!children?.length) throw new AppError('At least one child is required');

    const result = await submitApplication({
      schoolId,
      parentName,
      parentPhone,
      parentEmail: parentEmail ?? '',
      parentOccupation,
      children,
    });

    return Response.json(result, { status: 201 });
  } catch (err) { return handleError(err); }
}
