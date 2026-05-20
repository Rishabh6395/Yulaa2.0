/**
 * GET  /api/admission/applications/[id]/checklist
 *   Returns checklist items for the current step and their completion status.
 *
 * POST /api/admission/applications/[id]/checklist
 *   Body: { stepId, itemIndex, completed }
 *   Marks or unmarks a checklist item as completed.
 *
 * DELETE /api/admission/applications/[id]/checklist
 *   Body: { stepId, itemIndex }
 *   Removes a checklist completion record.
 */

import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const applicationId = (await params).id;

    const app = await prisma.admissionApplication.findUnique({
      where:   { id: applicationId },
      include: { workflow: { include: { steps: { orderBy: { stepOrder: 'asc' } } } } },
    });
    if (!app) throw new AppError('Application not found', 404);

    const completions = await prisma.admissionChecklistCompletion.findMany({
      where: { applicationId },
    });

    const currentStep = app.workflow?.steps.find(s => s.stepOrder === app.currentStep);
    const checklistItems = (currentStep?.checklistItems as any[]) ?? [];

    return Response.json({
      stepId:         currentStep?.id ?? null,
      stepOrder:      app.currentStep,
      checklistItems: checklistItems.map((item: any, idx: number) => ({
        ...item,
        itemIndex: idx,
        completed: completions.some(c => c.stepId === currentStep?.id && c.itemIndex === idx),
        completedBy: completions.find(c => c.stepId === currentStep?.id && c.itemIndex === idx)?.completedBy,
      })),
    });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const applicationId = (await params).id;
    const { stepId, itemIndex, completed = true } = await request.json();
    if (!stepId || itemIndex === undefined) throw new AppError('stepId and itemIndex are required', 400);

    if (completed) {
      await prisma.admissionChecklistCompletion.upsert({
        where:  { applicationId_stepId_itemIndex: { applicationId, stepId, itemIndex } },
        update: { completedBy: user.id, completedAt: new Date() },
        create: { applicationId, stepId, itemIndex, completedBy: user.id },
      });
    } else {
      await prisma.admissionChecklistCompletion.deleteMany({
        where: { applicationId, stepId, itemIndex },
      });
    }

    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
