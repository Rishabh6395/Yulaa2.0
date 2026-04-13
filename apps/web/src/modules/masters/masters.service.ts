import { ConflictError, NotFoundError } from '@/utils/errors';
import * as repo from './masters.repo';

// ─── Simple masters (school-specific) ────────────────────────────────────────

export async function getGenderMasters(schoolId: string)       { return repo.listGenderMasters(schoolId); }
export async function getBloodGroupMasters(schoolId: string)   { return repo.listBloodGroupMasters(schoolId); }
export async function getQualificationMasters(schoolId: string){ return repo.listQualificationMasters(schoolId); }
export async function getStreamMasters(schoolId: string)       { return repo.listStreamMasters(schoolId); }
export async function getGradeMasters(schoolId: string)        { return repo.listGradeMasters(schoolId); }
export async function getEventTypeMasters(schoolId: string)    { return repo.listEventTypeMasters(schoolId); }

export async function addGenderMaster(schoolId: string, name: string, sortOrder?: number) {
  if (!name?.trim()) throw new ConflictError('Name is required');
  return repo.createGenderMaster({ schoolId, name: name.trim(), sortOrder });
}
export async function addBloodGroupMaster(schoolId: string, name: string, sortOrder?: number) {
  if (!name?.trim()) throw new ConflictError('Name is required');
  return repo.createBloodGroupMaster({ schoolId, name: name.trim(), sortOrder });
}
export async function addQualificationMaster(schoolId: string, name: string, sortOrder?: number) {
  if (!name?.trim()) throw new ConflictError('Name is required');
  return repo.createQualificationMaster({ schoolId, name: name.trim(), sortOrder });
}
export async function addStreamMaster(schoolId: string, name: string, sortOrder?: number) {
  if (!name?.trim()) throw new ConflictError('Name is required');
  return repo.createStreamMaster({ schoolId, name: name.trim(), sortOrder });
}
export async function addGradeMaster(schoolId: string, name: string, sortOrder?: number) {
  if (!name?.trim()) throw new ConflictError('Name is required');
  return repo.createGradeMaster({ schoolId, name: name.trim(), sortOrder });
}
export async function addEventTypeMaster(schoolId: string, name: string, code: string, sortOrder?: number) {
  if (!name?.trim() || !code?.trim()) throw new ConflictError('Name and code are required');
  return repo.createEventTypeMaster({ schoolId, name: name.trim(), code: code.trim().toLowerCase(), sortOrder });
}

export async function patchGenderMaster(id: string, data: { name?: string; isActive?: boolean; sortOrder?: number }) {
  return repo.updateGenderMaster(id, data);
}
export async function patchBloodGroupMaster(id: string, data: { name?: string; isActive?: boolean; sortOrder?: number }) {
  return repo.updateBloodGroupMaster(id, data);
}
export async function patchQualificationMaster(id: string, data: { name?: string; isActive?: boolean; sortOrder?: number }) {
  return repo.updateQualificationMaster(id, data);
}
export async function patchStreamMaster(id: string, data: { name?: string; isActive?: boolean; sortOrder?: number }) {
  return repo.updateStreamMaster(id, data);
}
export async function patchGradeMaster(id: string, data: { name?: string; isActive?: boolean; sortOrder?: number }) {
  return repo.updateGradeMaster(id, data);
}
export async function patchEventTypeMaster(id: string, data: { name?: string; code?: string; isActive?: boolean; sortOrder?: number }) {
  return repo.updateEventTypeMaster(id, data);
}

// ─── Location masters (school-specific) ──────────────────────────────────────

export async function getCountries(schoolId: string)                             { return repo.listCountries(schoolId); }
export async function getStatesByCountry(schoolId: string, countryId: string)   { return repo.listStatesByCountry(schoolId, countryId); }
export async function getDistrictsByState(schoolId: string, stateId: string)    { return repo.listDistrictsByState(schoolId, stateId); }
export async function getAllStates(schoolId: string)                              { return repo.listAllStates(schoolId); }
export async function getAllDistricts(schoolId: string)                           { return repo.listAllDistricts(schoolId); }

export async function addCountry(schoolId: string, name: string, code: string, sortOrder?: number) {
  if (!name?.trim() || !code?.trim()) throw new ConflictError('Name and code are required');
  return repo.createCountry({ schoolId, name: name.trim(), code: code.trim().toUpperCase(), sortOrder });
}
export async function addState(schoolId: string, countryId: string, name: string, code?: string, sortOrder?: number) {
  if (!countryId || !name?.trim()) throw new ConflictError('countryId and name are required');
  return repo.createState({ schoolId, countryId, name: name.trim(), code: code?.trim(), sortOrder });
}
export async function addDistrict(schoolId: string, stateId: string, name: string, sortOrder?: number) {
  if (!stateId || !name?.trim()) throw new ConflictError('stateId and name are required');
  return repo.createDistrict({ schoolId, stateId, name: name.trim(), sortOrder });
}

export async function patchCountry(id: string, data: { name?: string; code?: string; isActive?: boolean; sortOrder?: number }) {
  return repo.updateCountry(id, data);
}
export async function patchState(id: string, data: { name?: string; code?: string; isActive?: boolean; sortOrder?: number }) {
  return repo.updateState(id, data);
}
export async function patchDistrict(id: string, data: { name?: string; isActive?: boolean; sortOrder?: number }) {
  return repo.updateDistrict(id, data);
}

// ─── School-specific masters ─────────────────────────────────────────────────

export async function getSchoolLocations(schoolId: string)  { return repo.listSchoolLocations(schoolId); }
export async function addSchoolLocation(schoolId: string, data: {
  address: string; city?: string; pincode?: string;
  countryId?: string; stateId?: string; districtId?: string;
}) {
  if (!data.address?.trim()) throw new ConflictError('Address is required');
  return repo.createSchoolLocation({ schoolId, ...data });
}
export async function patchSchoolLocation(id: string, data: {
  address?: string; city?: string; pincode?: string;
  countryId?: string; stateId?: string; districtId?: string; isActive?: boolean;
}) { return repo.updateSchoolLocation(id, data); }

export async function getSchoolHierarchy(schoolId: string)  { return repo.listSchoolHierarchy(schoolId); }
export async function addSchoolHierarchy(schoolId: string, data: { name: string; level: number; parentId?: string }) {
  if (!data.name?.trim()) throw new ConflictError('Name is required');
  return repo.createSchoolHierarchy({ schoolId, ...data });
}
export async function patchSchoolHierarchy(id: string, data: { name?: string; level?: number; parentId?: string; isActive?: boolean }) {
  return repo.updateSchoolHierarchy(id, data);
}

export async function getExamTypes(schoolId: string)  { return repo.listExamTypes(schoolId); }
export async function addExamType(schoolId: string, data: { name: string; code: string; termOrder?: number }) {
  if (!data.name?.trim() || !data.code?.trim()) throw new ConflictError('Name and code are required');
  return repo.createExamType({ schoolId, name: data.name.trim(), code: data.code.trim().toLowerCase(), termOrder: data.termOrder });
}
export async function patchExamType(id: string, data: { name?: string; code?: string; termOrder?: number; isActive?: boolean }) {
  return repo.updateExamType(id, data);
}

export async function getGradingTypes(schoolId: string, examTypeId?: string) {
  return repo.listGradingTypes(schoolId, examTypeId);
}
export async function addGradingType(schoolId: string, data: {
  examTypeId: string; grade: string; minPercent: number; maxPercent: number;
  gradePoints?: number; description?: string;
}) {
  if (!data.examTypeId || !data.grade?.trim()) throw new ConflictError('examTypeId and grade are required');
  if (data.minPercent > data.maxPercent) throw new ConflictError('minPercent must be ≤ maxPercent');
  return repo.createGradingType({ schoolId, ...data });
}
export async function patchGradingType(id: string, data: {
  grade?: string; minPercent?: number; maxPercent?: number;
  gradePoints?: number; description?: string; isActive?: boolean;
}) { return repo.updateGradingType(id, data); }

export async function getAnnouncementTypes(schoolId: string)  { return repo.listAnnouncementTypes(schoolId); }
export async function addAnnouncementType(schoolId: string, data: { name: string; code: string }) {
  if (!data.name?.trim() || !data.code?.trim()) throw new ConflictError('Name and code are required');
  return repo.createAnnouncementType({ schoolId, name: data.name.trim(), code: data.code.trim().toLowerCase() });
}
export async function patchAnnouncementType(id: string, data: { name?: string; code?: string; isActive?: boolean }) {
  return repo.updateAnnouncementType(id, data);
}

export async function getContentTypes(schoolId: string, formName?: string) {
  return repo.listContentTypes(schoolId, formName);
}
export async function addContentType(schoolId: string, data: {
  formName: string; fieldSlot: string; fieldType: string; label: string;
  options?: string[]; sortOrder?: number;
}) {
  if (!data.formName || !data.fieldSlot || !data.label?.trim()) {
    throw new ConflictError('formName, fieldSlot, and label are required');
  }
  return repo.createContentType({ schoolId, ...data });
}
export async function patchContentType(id: string, data: {
  label?: string; fieldType?: string; options?: string[]; isActive?: boolean; sortOrder?: number;
}) { return repo.updateContentType(id, data); }

// ─── Leave types (existing model) ────────────────────────────────────────────

export async function getLeaveTypes(schoolId: string)  { return repo.listLeaveTypes(schoolId); }
export async function addLeaveType(schoolId: string, data: { name: string; code: string; applicableTo: string[] }) {
  if (!data.name?.trim() || !data.code?.trim()) throw new ConflictError('Name and code are required');
  return repo.createLeaveType({ schoolId, name: data.name.trim(), code: data.code.trim().toLowerCase(), applicableTo: data.applicableTo });
}
export async function patchLeaveType(id: string, data: { name?: string; code?: string; applicableTo?: string[]; isActive?: boolean }) {
  return repo.updateLeaveType(id, data);
}
