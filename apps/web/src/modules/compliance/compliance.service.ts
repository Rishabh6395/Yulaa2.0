import * as repo from './compliance.repo';
import { withCache, cacheInvalidate, CacheTTL } from '@/services/cache.service';
import type { ComplianceCategoryKey, ComplianceItemInput, ComplianceItemUpdate } from './compliance.types';

function cacheKey(schoolId: string) {
  return `compliance:${schoolId}`;
}

export async function getComplianceItems(schoolId: string, category?: string) {
  return repo.listComplianceItems(schoolId, category);
}

export async function getComplianceDashboard(schoolId: string) {
  return withCache(cacheKey(schoolId), CacheTTL.dashboard, () =>
    repo.getComplianceSummary(schoolId)
  );
}

export async function addComplianceItem(schoolId: string, userId: string, data: ComplianceItemInput) {
  const item = await repo.createComplianceItem(schoolId, userId, data);
  await cacheInvalidate(cacheKey(schoolId));
  return item;
}

export async function updateComplianceItem(id: string, schoolId: string, userId: string, data: ComplianceItemUpdate) {
  const item = await repo.updateComplianceItem(id, schoolId, userId, data);
  await cacheInvalidate(cacheKey(schoolId));
  return item;
}

export async function deleteComplianceItem(id: string, schoolId: string) {
  await repo.deleteComplianceItem(id, schoolId);
  await cacheInvalidate(cacheKey(schoolId));
}

export async function initDefaultItems(schoolId: string, userId: string) {
  await repo.seedDefaultItems(schoolId, userId);
  await cacheInvalidate(cacheKey(schoolId));
}
