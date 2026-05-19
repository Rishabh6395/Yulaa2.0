/**
 * GET  /api/admission/applications/[id]/checklist?step=N  — items + progress for a step
 * POST /api/admission/applications/[id]/checklist         — mark item complete / upload doc
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import { PRINCIPAL_ADMIN_ROLES } from '@/lib/roles';
import prisma from '@/lib/prisma';

const ALLOWED_ROLES = [...PRINCIPAL_ADMIN_ROLES, 'teacher', 'parent'];

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const { id: applicationId } = await params;
    const { searchParams }      = new URL(request.url);
    const stepStr               = searchParams.get('step');

    const app = await prisma.admissionApplication.findUnique({
      where:   { id: applicationId },
      include: { workflow: { include: { steps: { orderBy: { stepOrder: 'asc' } } } } },
    });
    if (!app) throw new AppError('Application not found', 404);

    const primary = user.roles.find((r) => r.is_primary) ?? user.roles[0];

    // Parents can only view their own application's checklist
    if (primary.role_code === 'parent' && app.parentUserId !== user.id) throw new ForbiddenError();

    // Admins/teachers: must belong to same school
    if (primary.school_id && primary.role_code !== 'parent' && app.schoolId !== primary.school_id) throw new ForbiddenError();

    const stepOrder = stepStr ? parseInt(stepStr, 10) : app.currentStep;
    const stepConfig = app.workflow?.steps.find((s) => s.stepOrder === stepOrder);
    const checklistItems = (stepConfig?.checklistItems as any[] | null) ?? [];

    const progress = await prisma.admissionChecklistProgress.findMany({
      where: { applicationId, stepOrder },
    });

    const progressMap = new Map(progress.map((p) => [p.itemIndex, p]));

    const items = checklistItems.map((item: any, idx: number) => {
      const prog = progressMap.get(idx);
      return {
        index:        idx,
        label:        item.label,
        required:     item.required ?? false,
        documentType: item.documentType ?? null,
        description:  item.description ?? null,
        actionRole:   item.actionRole,
        completed:    !!prog,
        completedAt:  prog?.completedAt ?? null,
        documentUrl:  prog?.documentUrl ?? null,
        notes:        prog?.notes ?? null,
      };
    });

    return Response.json({
      applicationId,
      stepOrder,
      items,
      allRequiredComplete: items.filter((i) => i.required).every((i) => i.completed),
    });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const { id: applicationId } = await params;
    const body                  = await request.json();
    const { stepOrder, itemIndex, documentUrl, notes } = body;

    if (stepOrder === undefined || itemIndex === undefined)
      throw new AppError('stepOrder and itemIndex are required');

    const app = await prisma.admissionApplication.findUnique({
      where:   { id: applicationId },
      include: { workflow: { include: { steps: true } } },
    });
    if (!app) throw new AppError('Application not found', 404);

    const primary = user.roles.find((r) => r.is_primary) ?? user.roles[0];

    // Parents can complete items on their own application
    if (primary.role_code === 'parent' && app.parentUserId !== user.id) throw new ForbiddenError();
    if (primary.school_id && primary.role_code !== 'parent' && app.schoolId !== primary.school_id) throw new ForbiddenError();

    // Validate item index exists in the step config
    const stepConfig = app.workflow?.steps.find((s) => s.stepOrder === stepOrder);
    const checklistItems = (stepConfig?.checklistItems as any[] | null) ?? [];
    if (itemIndex < 0 || itemIndex >= checklistItems.length)
      throw new AppError('Invalid item index');

    const progress = await prisma.admissionChecklistProgress.upsert({
      where:  { applicationId_stepOrder_itemIndex: { applicationId, stepOrder, itemIndex } },
      create: {
        applicationId, stepOrder, itemIndex,
        completedBy:  user.id,
        completedAt:  new Date(),
        documentUrl:  documentUrl ?? null,
        notes:        notes ?? null,
      },
      update: {
        completedBy: user.id,
        completedAt: new Date(),
        documentUrl: documentUrl ?? null,
        notes:       notes ?? null,
      },
    });

    return Response.json({ progress }, { status: 201 });
  } catch (err) { return handleError(err); }
}
