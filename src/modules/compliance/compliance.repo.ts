import prisma from '@/lib/prisma';
import type { ComplianceItemInput, ComplianceItemUpdate } from './compliance.types';

export async function listComplianceItems(schoolId: string, category?: string) {
  return prisma.complianceItem.findMany({
    where: {
      schoolId,
      ...(category && category !== 'all' ? { category } : {}),
    },
    include: { documents: { orderBy: { uploadedAt: 'desc' } } },
    orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function getComplianceSummary(schoolId: string) {
  const items = await prisma.complianceItem.groupBy({
    by: ['status'],
    where: { schoolId },
    _count: true,
  });
  const byCategory = await prisma.complianceItem.groupBy({
    by: ['category', 'status'],
    where: { schoolId },
    _count: true,
  });
  return { byStatus: items, byCategory };
}

export async function createComplianceItem(schoolId: string, userId: string, data: ComplianceItemInput) {
  return prisma.complianceItem.create({
    data: {
      schoolId,
      category:    data.category,
      title:       data.title,
      description: data.description,
      status:      data.status ?? 'pending',
      dueDate:     data.dueDate ? new Date(data.dueDate) : null,
      notes:       data.notes,
      assignedTo:  data.assignedTo,
      updatedBy:   userId,
    },
  });
}

export async function updateComplianceItem(id: string, schoolId: string, userId: string, data: ComplianceItemUpdate) {
  return prisma.complianceItem.update({
    where: { id },
    data: {
      ...(data.status      !== undefined ? { status: data.status }           : {}),
      ...(data.notes       !== undefined ? { notes: data.notes }             : {}),
      ...(data.title       !== undefined ? { title: data.title }             : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.assignedTo  !== undefined ? { assignedTo: data.assignedTo }   : {}),
      ...(data.dueDate     !== undefined ? { dueDate: data.dueDate ? new Date(data.dueDate) : null } : {}),
      updatedBy: userId,
    },
  });
}

export async function deleteComplianceItem(id: string, schoolId: string) {
  return prisma.complianceItem.delete({ where: { id } });
}

export async function seedDefaultItems(schoolId: string, userId: string) {
  const defaults = [
    // Regulatory
    { category: 'regulatory', title: 'RTE Act Compliance Certificate', status: 'pending' },
    { category: 'regulatory', title: 'Affiliation / Board Recognition Letter', status: 'pending' },
    { category: 'regulatory', title: 'Annual Safety Audit Report', status: 'pending' },
    { category: 'regulatory', title: 'Fire NOC Certificate', status: 'pending' },
    // Document
    { category: 'document', title: 'All Student Records Up-to-date', status: 'pending' },
    { category: 'document', title: 'Transfer Certificates Issued', status: 'pending' },
    { category: 'document', title: 'ID Proofs Collected for All Students', status: 'pending' },
    // Staff
    { category: 'staff', title: 'Teacher Background Verification', status: 'pending' },
    { category: 'staff', title: 'CPD Training Certificates', status: 'pending' },
    { category: 'staff', title: 'Employment Contracts Signed', status: 'pending' },
    // Financial
    { category: 'financial', title: 'Fee Receipt Issuance Audit', status: 'pending' },
    { category: 'financial', title: 'Annual Tax Filing', status: 'pending' },
    { category: 'financial', title: 'Audit Trail for Fee Waivers', status: 'pending' },
    // Academic
    { category: 'academic', title: 'Curriculum Alignment with Board Standards', status: 'pending' },
    { category: 'academic', title: 'Minimum Teaching Hours Met', status: 'pending' },
    // Child Safety
    { category: 'child_safety', title: 'POCSO Policy Published', status: 'pending' },
    { category: 'child_safety', title: 'Anti-Bullying Policy in Place', status: 'pending' },
    { category: 'child_safety', title: 'CCTV Functional in All Areas', status: 'pending' },
    // Data Protection
    { category: 'data_protection', title: 'Student Data Privacy Policy', status: 'pending' },
    { category: 'data_protection', title: 'DPDP Act Compliance', status: 'pending' },
    // Infrastructure
    { category: 'infrastructure', title: 'Drinking Water Quality Test', status: 'pending' },
    { category: 'infrastructure', title: 'Sanitation Facilities Adequate', status: 'pending' },
    // Audit
    { category: 'audit', title: 'Internal Compliance Audit Q1', status: 'pending' },
    { category: 'audit', title: 'Board Inspection Readiness', status: 'pending' },
  ] as const;

  await prisma.complianceItem.createMany({
    data: defaults.map((d) => ({ ...d, schoolId, updatedBy: userId })),
    skipDuplicates: true,
  });
}
