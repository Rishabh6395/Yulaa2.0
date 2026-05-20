/**
 * POST /api/admission/applications/[id]/assign
 * Body: { assignedToId, note? }
 * Reassigns the current step of an admission application to another user.
 * Requires school-level admissionSettings.allowTaskReassign = true
 * and the actor's role must be in admissionSettings.taskReassignRoles.
 */

import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const applicationId = (await params).id;
    const { assignedToId, note } = await request.json();
    if (!assignedToId) throw new AppError('assignedToId is required', 400);

    const app = await prisma.admissionApplication.findUnique({
      where:  { id: applicationId },
      select: { schoolId: true, currentStep: true, status: true },
    });
    if (!app) throw new AppError('Application not found', 404);
    if (app.status === 'approved' || app.status === 'rejected') {
      throw new AppError('Cannot reassign a closed application', 400);
    }

    // Check school allows reassignment
    const school = await prisma.school.findUnique({
      where:  { id: app.schoolId },
      select: { admissionSettings: true },
    });
    const settings: any = school?.admissionSettings ?? {};
    if (!settings.allowTaskReassign) throw new ForbiddenError('Task reassignment is not enabled for this school');

    // Check actor's role is allowed to reassign
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const allowedRoles: string[] = settings.taskReassignRoles ?? ['school_admin', 'principal'];
    if (!allowedRoles.includes(primary.role_code)) {
      throw new ForbiddenError('Your role is not permitted to reassign tasks');
    }

    const assignment = await prisma.admissionStepAssignment.create({
      data: {
        applicationId,
        stepOrder:   app.currentStep,
        assignedToId,
        assignedById: user.id,
        note:         note ?? null,
      },
    });
    return Response.json({ assignment }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const applicationId = (await params).id;

    const assignments = await prisma.admissionStepAssignment.findMany({
      where:   { applicationId },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return Response.json({ assignments });
  } catch (err) { return handleError(err); }
}
