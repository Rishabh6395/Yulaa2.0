import { CORE_ADMIN_ROLES as ADMIN_ROLES } from '@/lib/roles';
import { getUserFromRequest } from '@/lib/auth';
import { processAction } from '@/modules/admission/admission.service';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';


/** POST /api/admission/applications/[id]/action — admin */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primaryRole.role_code)) throw new ForbiddenError();

    // Verify the application belongs to this admin's school
    const appRow = await prisma.admissionApplication.findUnique({ where: { id: params.id }, select: { schoolId: true } });
    if (!appRow) throw new AppError('Application not found', 404);
    if (primaryRole.role_code !== 'super_admin' && appRow.schoolId !== primaryRole.school_id) {
      throw new ForbiddenError();
    }

    const body = await request.json();
    if (!body.action || !['approve', 'reject'].includes(body.action)) {
      throw new AppError('action must be "approve" or "reject"');
    }

    const result = await processAction({
      applicationId: params.id,
      actorUserId:   user.id,
      actorName:     `${user.first_name} ${user.last_name}`,
      action:        body.action,
      comment:       body.comment,
    });

    return Response.json(result);
  } catch (err) { return handleError(err); }
}
