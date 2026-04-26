import { AppError } from '@/utils/errors';
import { parsePagination } from '@/utils/pagination';
import * as repo from './admission.repo';
import { runValidation } from './admission.validator';
import { provisionApprovedApplication } from './admission.provisioner';
import type { ApplicationActionInput, CreateApplicationInput, CreateWorkflowInput } from './admission.types';

// ── Public ────────────────────────────────────────────────────────────────────

export async function submitApplication(data: CreateApplicationInput) {
  if (!data.children || data.children.length === 0) throw new AppError('At least one child is required');

  // Phone format validation
  const phone = data.parentPhone?.replace(/\s/g, '') ?? '';
  if (!/^\d{10}$/.test(phone)) throw new AppError('Phone number must be exactly 10 digits', 400);

  // Duplicate phone check
  const phoneExists = await repo.findApplicationByPhone(data.schoolId, phone);
  if (phoneExists) throw new AppError('An application with this phone number already exists for this school', 409);

  // Duplicate email check (only when email provided)
  if (data.parentEmail?.trim()) {
    const emailExists = await repo.findApplicationByEmail(data.schoolId, data.parentEmail.trim());
    if (emailExists) throw new AppError('An application with this email address already exists for this school', 409);
  }

  // AI validation
  const { flags, riskScore } = await runValidation(data.children, data.schoolId);

  // Block only if ALL children have critical errors (Aadhaar duplicate is blocking)
  const blockingErrors = flags.filter((f) => f.severity === 'error' && f.code === 'DUPLICATE_AADHAAR');
  if (blockingErrors.length > 0) {
    throw new AppError(`Duplicate Aadhaar detected: ${blockingErrors.map((f) => f.message).join('; ')}`, 409);
  }

  // Fetch active workflow
  const workflow = await repo.findActiveWorkflow(data.schoolId);

  const app = await repo.createApplication(data, flags, riskScore, workflow?.id ?? null);

  console.log(`[NOTIFY] New application ${app.id} submitted for school ${data.schoolId}`);
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
    console.log(`[NOTIFY] Application ${input.applicationId} rejected`);
    return { status: 'rejected' };
  }

  // Approve — check if more steps remain
  const nextStep = app.currentStep + 1;
  const hasMoreSteps = steps.some((s) => s.stepOrder === nextStep);

  if (hasMoreSteps) {
    await repo.updateApplicationStatus(input.applicationId, 'under_review', nextStep);
    await repo.createAction(input.applicationId, input.actorUserId, app.currentStep, 'approve', input.comment);
    return { status: 'under_review', currentStep: nextStep };
  }

  // Final approval — provision
  await repo.updateApplicationStatus(input.applicationId, 'approved', app.currentStep);
  await repo.createAction(input.applicationId, input.actorUserId, app.currentStep, 'approve', input.comment);
  await provisionApprovedApplication(input.applicationId);
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
