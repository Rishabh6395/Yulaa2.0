import prisma from '@/lib/prisma';
import type { ApplicationListParams, CreateApplicationInput, CreateWorkflowInput } from './admission.types';

const applicationInclude = {
  children: true,
  actions:  { include: { actorUser: { select: { firstName: true, lastName: true } } }, orderBy: { createdAt: 'asc' as const } },
  workflow: { include: { steps: { orderBy: { stepOrder: 'asc' as const } } } },
  school:   { select: { name: true, admissionFeeAmt: true } },
} as const;

export async function createApplication(data: CreateApplicationInput, flags: object, riskScore: number, workflowId: string | null) {
  return prisma.admissionApplication.create({
    data: {
      schoolId:        data.schoolId,
      workflowId:      workflowId ?? undefined,
      parentName:      data.parentName,
      parentPhone:     data.parentPhone,
      parentEmail:     data.parentEmail,
      parentUserId:    data.parentUserId ?? undefined,
      validationFlags: flags,
      riskScore,
      children: {
        create: data.children.map((c) => ({
          firstName:      c.firstName,
          lastName:       c.lastName,
          dateOfBirth:    c.dateOfBirth ? new Date(c.dateOfBirth) : null,
          gender:         c.gender ?? null,
          aadhaarNo:      c.aadhaarNo ?? null,
          classApplying:  c.classApplying,
          previousSchool: c.previousSchool ?? null,
        })),
      },
    },
    include: applicationInclude,
  });
}

export async function findApplications(params: ApplicationListParams) {
  const where: any = { schoolId: params.schoolId };
  if (params.status) where.status = params.status;
  if (params.search) {
    where.OR = [
      { parentName:  { contains: params.search, mode: 'insensitive' } },
      { parentPhone: { contains: params.search } },
      { parentEmail: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const [total, applications] = await Promise.all([
    prisma.admissionApplication.count({ where }),
    prisma.admissionApplication.findMany({
      where,
      include: { children: { select: { firstName: true, lastName: true, classApplying: true } } },
      orderBy: { submittedAt: 'desc' },
      skip:    params.skip,
      take:    params.limit,
    }),
  ]);
  return { total, applications };
}

export async function findApplicationById(id: string) {
  return prisma.admissionApplication.findUnique({ where: { id }, include: applicationInclude });
}

export async function updateApplicationStatus(id: string, status: string, currentStep: number, parentUserId?: string) {
  return prisma.admissionApplication.update({
    where: { id },
    data:  { status, currentStep, ...(parentUserId ? { parentUserId } : {}) },
  });
}

export async function createAction(applicationId: string, actorUserId: string | null, stepOrder: number | null, action: string, comment?: string) {
  return prisma.admissionAction.create({
    data: { applicationId, actorUserId, stepOrder, action, comment },
  });
}

export async function findApplicationByPhone(schoolId: string, phone: string) {
  return prisma.admissionApplication.findFirst({
    where: { schoolId, parentPhone: phone, status: { not: 'rejected' } },
    select: { id: true },
  });
}

export async function findApplicationByEmail(schoolId: string, email: string) {
  return prisma.admissionApplication.findFirst({
    where: { schoolId, parentEmail: { equals: email, mode: 'insensitive' }, status: { not: 'rejected' } },
    select: { id: true },
  });
}

export async function findActiveWorkflow(schoolId: string) {
  return prisma.admissionWorkflow.findFirst({
    where:   { schoolId, isActive: true },
    include: { steps: { orderBy: { stepOrder: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createWorkflow(data: CreateWorkflowInput) {
  // Deactivate previous workflows for this school
  await prisma.admissionWorkflow.updateMany({ where: { schoolId: data.schoolId }, data: { isActive: false } });
  return prisma.admissionWorkflow.create({
    data: {
      schoolId: data.schoolId,
      name:     data.name,
      isActive: true,
      steps: { create: data.steps },
    },
    include: { steps: { orderBy: { stepOrder: 'asc' } } },
  });
}

export async function updateWorkflow(id: string, data: { name?: string; isActive?: boolean }) {
  return prisma.admissionWorkflow.update({ where: { id }, data });
}

export async function linkChildToStudent(childId: string, studentId: string) {
  return prisma.admissionChild.update({ where: { id: childId }, data: { studentId } });
}
