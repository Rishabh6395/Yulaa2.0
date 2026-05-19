import { AppError } from '@/utils/errors';
import { validatePhone } from '@/utils/phone';
import { parsePagination } from '@/utils/pagination';
import * as repo from './admission.repo';
import { runValidation } from './admission.validator';
import { provisionApprovedApplication } from './admission.provisioner';
import { sendNotification } from '@/services/notification.service';
import type { ApplicationActionInput, CreateApplicationInput, CreateWorkflowInput } from './admission.types';

// ── Public ────────────────────────────────────────────────────────────────────

export async function submitApplication(data: CreateApplicationInput) {
  if (!data.children || data.children.length === 0)
    throw new AppError('Please add at least one child to the application.');

  // Phone format validation
  const phoneResult = validatePhone(data.parentPhone ?? '');
  if (!phoneResult.valid)
    throw new AppError(`Invalid phone number: ${phoneResult.error}. Please enter a valid 10-digit mobile number or international format.`, 400);
  const phone = phoneResult.e164!;

  // Duplicate phone check — allow same family (same email) to apply for multiple children
  const phoneExists = await repo.findApplicationByPhone(data.schoolId, phone);
  if (phoneExists && phoneExists.parentEmail?.toLowerCase() !== data.parentEmail?.trim().toLowerCase())
    throw new AppError(
      'An application with this phone number already exists for this school. If this is a mistake, please contact the school admissions office.',
      409,
    );

  // Duplicate email check (only when email provided)
  if (data.parentEmail?.trim()) {
    const emailExists = await repo.findApplicationByEmail(data.schoolId, data.parentEmail.trim());
    if (emailExists)
      throw new AppError(
        'An application with this email address already exists for this school. Each family can submit only one application per school.',
        409,
      );
  }

  // AI validation
  const { flags, riskScore } = await runValidation(data.children, data.schoolId);

  // Block only if ALL children have critical errors (Aadhaar duplicate is blocking)
  const blockingErrors = flags.filter((f) => f.severity === 'error' && f.code === 'DUPLICATE_AADHAAR');
  if (blockingErrors.length > 0) {
    throw new AppError(
      `Duplicate Aadhaar number detected: ${blockingErrors.map((f) => f.message).join('; ')}. Each child must have a unique Aadhaar number.`,
      409,
    );
  }

  // Fetch active workflow
  const workflow = await repo.findActiveWorkflow(data.schoolId);

  const app = await repo.createApplication({ ...data, parentPhone: phone }, flags, riskScore, workflow?.id ?? null);

  if (process.env.NODE_ENV === 'development') console.log(`[NOTIFY] New application ${app.id} submitted for school ${data.schoolId}`);
  return { applicationId: app.id, riskScore, flags };
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function listApplications(schoolId: string, searchParams: URLSearchParams) {
  const pagination = parsePagination(searchParams);
  const { total, applications } = await repo.findApplications({
    schoolId,
    status:   searchParams.get('status')  ?? undefined,
    search:   searchParams.get('search')  ?? undefined,
    ...pagination,
  });

  const rows = applications.map((a) => ({
    id:           a.id,
    parent_name:  a.parentName,
    parent_phone: a.parentPhone,
    parent_email: a.parentEmail,
    status:       a.status,
    risk_score:   a.riskScore,
    children_count: (a as any).children?.length ?? 0,
    children:     (a as any).children?.map((c: any) => ({ name: `${c.firstName} ${c.lastName}`, class: c.classApplying })) ?? [],
    submitted_at: a.submittedAt,
  }));

  return { applications: rows, total, page: pagination.page, limit: pagination.limit, totalPages: Math.ceil(total / pagination.limit) };
}

export async function getApplicationDetail(id: string) {
  const app = await repo.findApplicationById(id);
  if (!app) throw new AppError('Application not found', 404);
  return app;
}

export async function processAction(input: ApplicationActionInput) {
  const app = await repo.findApplicationById(input.applicationId);
  if (!app) throw new AppError('Application not found', 404);
  if (app.status === 'approved' || app.status === 'rejected') {
    throw new AppError(`Application already ${app.status}`);
  }

  const steps = app.workflow?.steps ?? [];

  if (input.action === 'reject') {
    await repo.updateApplicationStatus(input.applicationId, 'rejected', app.currentStep);
    await repo.createAction(input.applicationId, input.actorUserId, app.currentStep, 'reject', input.comment);
    if (app.parentUserId) {
      await sendNotification({
        userId: app.parentUserId,
        title:  'Application Update',
        body:   `Your admission application has been reviewed and unfortunately could not be approved at this time.${input.comment ? ` Note: ${input.comment}` : ''}`,
        channels: ['in_app'],
        data: { applicationId: input.applicationId, status: 'rejected' },
      });
    }
    return { status: 'rejected' };
  }

  // Approve — verify all required checklist items for current step are complete
  const currentStepConfig = steps.find((s) => s.stepOrder === app.currentStep);
  const checklistItems = (currentStepConfig?.checklistItems as any[] | null) ?? [];
  const requiredItems  = checklistItems.filter((item: any) => item.required);
  if (requiredItems.length > 0) {
    const progress   = await repo.findChecklistProgress(input.applicationId, app.currentStep);
    const completedIdxs = new Set(progress.map((p) => p.itemIndex));
    const missing = requiredItems.filter((_: any, idx: number) => !completedIdxs.has(idx));
    if (missing.length > 0) {
      const names = missing.map((item: any) => item.label).join(', ');
      throw new AppError(`Cannot advance: required checklist items not completed — ${names}`, 400);
    }
  }

  // Approve — check if more steps remain
  const nextStep = app.currentStep + 1;
  const hasMoreSteps = steps.some((s) => s.stepOrder === nextStep);

  if (hasMoreSteps) {
    await repo.updateApplicationStatus(input.applicationId, 'under_review', nextStep);
    await repo.createAction(input.applicationId, input.actorUserId, app.currentStep, 'approve', input.comment);
    return { status: 'under_review', currentStep: nextStep };
  }

  // Final approval — require section on every child
  const missingSection = (app as any).children?.filter((c: any) => !c.section?.trim());
  if (missingSection && missingSection.length > 0) {
    const names = missingSection.map((c: any) => `${c.firstName} ${c.lastName}`.trim()).join(', ');
    throw new AppError(`Section is required before final approval. Missing for: ${names}`, 400);
  }

  await repo.updateApplicationStatus(input.applicationId, 'approved', app.currentStep);
  await repo.createAction(input.applicationId, input.actorUserId, app.currentStep, 'approve', input.comment);
  await provisionApprovedApplication(input.applicationId);
  if (app.parentUserId) {
    await sendNotification({
      userId: app.parentUserId,
      title:  'Application Approved!',
      body:   'Congratulations! Your admission application has been approved. Login details have been sent to your registered contact.',
      channels: ['in_app'],
      data: { applicationId: input.applicationId, status: 'approved' },
    });
  }
  return { status: 'approved' };
}

// ── Workflow ──────────────────────────────────────────────────────────────────

export async function getWorkflow(schoolId: string) {
  return repo.findActiveWorkflow(schoolId);
}

export async function saveWorkflow(data: CreateWorkflowInput) {
  if (!data.name) throw new AppError('Workflow name is required');
  if (!data.steps || data.steps.length === 0) throw new AppError('At least one step is required');
  return repo.createWorkflow(data);
}

export async function updateWorkflow(id: string, data: { name?: string; isActive?: boolean }) {
  return repo.updateWorkflow(id, data);
}
