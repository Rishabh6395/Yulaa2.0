import { REVIEWER_ROLES as ADMIN_ROLES } from '@/lib/roles';
import { getUserFromRequest } from '@/lib/auth';
import { submitApplication } from '@/modules/admission/admission.service';
import { handleError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

/** POST /api/admission/apply */
export async function POST(request: Request) {
  try {
    const authUser = await getUserFromRequest(request).catch(() => null);

    const body = await request.json();
    const {
      schoolId, parentName, parentPhone, parentEmail,
      parentOccupation, residentialAddress, permanentAddress, children,
    } = body;

    if (!schoolId)
      throw new AppError('Please select a school before submitting.');
    if (!parentName?.trim())
      throw new AppError("Parent's full name is required.");
    if (!parentPhone?.trim())
      throw new AppError("Parent's phone number is required.");
    if (!children?.length)
      throw new AppError('Please add at least one child to the application.');

    const school = await prisma.school.findUnique({
      where:  { id: schoolId },
      select: { id: true, status: true, name: true },
    });
    if (!school)
      throw new AppError('The selected school was not found. Please go back and select a valid school.', 400);
    if (school.status !== 'active')
      throw new AppError(`${school.name} is not currently accepting admissions. Please try again later or contact the school directly.`, 400);

    for (let i = 0; i < children.length; i++) {
      const c   = children[i];
      const nth = children.length > 1 ? `Child ${i + 1}: ` : '';

      if (!c.firstName?.trim())
        throw new AppError(`${nth}First name is required.`);
      if (!c.lastName?.trim())
        throw new AppError(`${nth}Last name is required.`);
      if (!c.classApplying?.trim())
        throw new AppError(`${nth}Please select the class / grade the child is applying for.`);
      if (c.dateOfBirth && isNaN(new Date(c.dateOfBirth).getTime()))
        throw new AppError(`${nth}The date of birth "${c.dateOfBirth}" is not a valid date.`);
    }

    const isAdmin = authUser?.roles?.some((r: any) => ADMIN_ROLES.includes(r.role_code));

    const result = await submitApplication({
      schoolId,
      parentName:          parentName.trim(),
      parentPhone:         parentPhone.trim(),
      parentEmail:         parentEmail ?? (!isAdmin ? authUser?.email : '') ?? '',
      parentOccupation,
      parentUserId:        isAdmin ? null : (authUser?.id ?? null),
      residentialAddress:  residentialAddress ?? undefined,
      permanentAddress:    permanentAddress   ?? undefined,
      children,
    });

    return Response.json(result, { status: 201 });
  } catch (err) { return handleError(err); }
}
