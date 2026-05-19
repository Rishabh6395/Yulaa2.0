/**
 * GET    /api/admission/waitlist?school_id=X   — list waitlisted applications
 * POST   /api/admission/waitlist               — add application to waitlist
 * PATCH  /api/admission/waitlist?id=X          — promote / remove / notify
 *
 * Waitlist is ordered by waitlistPosition (ascending) per school.
 * On promote: application moves to under_review and remaining positions compact.
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const STAFF_ROLES = ['super_admin', 'school_admin', 'principal', 'teacher'];

async function resolveSchoolId(user: any, override?: string | null): Promise<string> {
  const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  if (primary.role_code === 'super_admin' && override) return override;
  if (primary.school_id) return primary.school_id;
  throw new AppError('school_id required');
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const { searchParams } = new URL(request.url);
    const schoolId = await resolveSchoolId(user, searchParams.get('school_id'));

    const waitlisted = await prisma.admissionApplication.findMany({
      where: { schoolId, status: 'waitlisted' },
      orderBy: { waitlistPosition: 'asc' },
      select: {
        id: true, parentName: true, parentPhone: true, parentEmail: true,
        waitlistPosition: true, waitlistedAt: true, submittedAt: true,
        children: {
          select: { firstName: true, lastName: true, classApplying: true },
        },
      },
    });

    return Response.json({ waitlisted, total: waitlisted.length });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!STAFF_ROLES.includes(primary.role_code)) throw new ForbiddenError('Staff role required');

    const body = await request.json();
    const { applicationId } = body;
    if (!applicationId) throw new AppError('applicationId required');

    const app = await prisma.admissionApplication.findUnique({ where: { id: applicationId } });
    if (!app) throw new AppError('Application not found', 404);

    const schoolId = await resolveSchoolId(user, app.schoolId);
    if (app.schoolId !== schoolId) throw new ForbiddenError();
    if (app.status === 'waitlisted') throw new AppError('Already on waitlist', 409);

    const lastPos = await prisma.admissionApplication.aggregate({
      where:  { schoolId, status: 'waitlisted' },
      _max:   { waitlistPosition: true },
    });
    const nextPosition = (lastPos._max.waitlistPosition ?? 0) + 1;

    const updated = await prisma.admissionApplication.update({
      where: { id: applicationId },
      data:  { status: 'waitlisted', waitlistPosition: nextPosition, waitlistedAt: new Date() },
    });

    return Response.json({ application: updated, position: nextPosition });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!['super_admin', 'school_admin', 'principal'].includes(primary.role_code))
      throw new ForbiddenError('Admin role required');

    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new AppError('id required');

    const app = await prisma.admissionApplication.findUnique({ where: { id } });
    if (!app) throw new AppError('Application not found', 404);
    if (primary.school_id && app.schoolId !== primary.school_id) throw new ForbiddenError();
    if (app.status !== 'waitlisted') throw new AppError('Application is not on waitlist');

    const body = await request.json();
    const { action } = body;

    if (action === 'promote') {
      const [updated] = await prisma.$transaction([
        prisma.admissionApplication.update({
          where: { id },
          data:  { status: 'under_review', waitlistPosition: null, waitlistedAt: null },
        }),
        prisma.admissionApplication.updateMany({
          where: {
            schoolId: app.schoolId,
            status:   'waitlisted',
            waitlistPosition: { gt: app.waitlistPosition ?? 0 },
          },
          data: { waitlistPosition: { decrement: 1 } },
        }),
      ]);
      return Response.json({ application: updated, promoted: true });
    }

    if (action === 'remove') {
      const [updated] = await prisma.$transaction([
        prisma.admissionApplication.update({
          where: { id },
          data:  { status: 'rejected', waitlistPosition: null, waitlistedAt: null },
        }),
        prisma.admissionApplication.updateMany({
          where: {
            schoolId: app.schoolId,
            status:   'waitlisted',
            waitlistPosition: { gt: app.waitlistPosition ?? 0 },
          },
          data: { waitlistPosition: { decrement: 1 } },
        }),
      ]);
      return Response.json({ application: updated, removed: true });
    }

    if (action === 'notify') {
      // In production: send SMS/email to app.parentPhone / app.parentEmail
      return Response.json({
        notified: true,
        contact: { phone: app.parentPhone, email: app.parentEmail },
        message: `Notification queued for ${app.parentName} (position ${app.waitlistPosition})`,
      });
    }

    throw new AppError('action must be promote | remove | notify');
  } catch (err) { return handleError(err); }
}
