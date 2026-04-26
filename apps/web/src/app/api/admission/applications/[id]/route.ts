import { getUserFromRequest } from '@/lib/auth';
import { getApplicationDetail } from '@/modules/admission/admission.service';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';

const ADMIN_ROLES = ['super_admin', 'school_admin', 'principal'];

/** GET /api/admission/applications/[id] — admin */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(_request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primaryRole.role_code)) throw new ForbiddenError();

    const app = await getApplicationDetail(params.id);
    if (!app) throw new AppError('Application not found', 404);
    // Super admin may access any school's application; others only their own school
    if (primaryRole.role_code !== 'super_admin' && app.schoolId !== primaryRole.school_id) {
      throw new ForbiddenError();
    }
    return Response.json({ application: app });
  } catch (err) { return handleError(err); }
}

/** PATCH /api/admission/applications/[id] — admin edits application details */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primaryRole.role_code)) throw new ForbiddenError();

    const body = await request.json();
    const { default: prisma } = await import('@/lib/prisma');

    // Verify school ownership before any writes
    const existing = await prisma.admissionApplication.findUnique({ where: { id: params.id }, select: { schoolId: true } });
    if (!existing) throw new AppError('Application not found', 404);
    if (primaryRole.role_code !== 'super_admin' && existing.schoolId !== primaryRole.school_id) {
      throw new ForbiddenError();
    }

    // Update parent details
    const parentUpdate: Record<string, any> = {};
    if (body.parentName  !== undefined) parentUpdate.parentName  = body.parentName;
    if (body.parentPhone !== undefined) parentUpdate.parentPhone = body.parentPhone;
    if (body.parentEmail !== undefined) parentUpdate.parentEmail = body.parentEmail;

    if (Object.keys(parentUpdate).length > 0) {
      await prisma.admissionApplication.update({ where: { id: params.id }, data: parentUpdate });
    }

    // Update individual children
    if (Array.isArray(body.children)) {
      for (const c of body.children) {
        if (!c.id) continue;
        const childUpdate: Record<string, any> = {};
        if (c.firstName      !== undefined) childUpdate.firstName      = c.firstName;
        if (c.lastName       !== undefined) childUpdate.lastName       = c.lastName;
        if (c.gender         !== undefined) childUpdate.gender         = c.gender;
        if (c.dateOfBirth    !== undefined) childUpdate.dateOfBirth    = c.dateOfBirth ? new Date(c.dateOfBirth) : null;
        if (c.classApplying  !== undefined) childUpdate.classApplying  = c.classApplying;
        if (c.previousSchool !== undefined) childUpdate.previousSchool = c.previousSchool;
        if (c.section        !== undefined) childUpdate.section        = c.section;
        if (Object.keys(childUpdate).length > 0) {
          await prisma.admissionChild.update({ where: { id: c.id }, data: childUpdate });
        }
      }
    }

    const app = await getApplicationDetail(params.id);
    return Response.json({ application: app });
  } catch (err) { return handleError(err); }
}
