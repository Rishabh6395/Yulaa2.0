import { ConflictError, NotFoundError } from '@/utils/errors';
import * as repo from './masters.repo';

// ─── Simple masters (school-specific) ────────────────────────────────────────

export async function getGenderMasters(schoolId: string, activeOnly = true)       { return repo.listGenderMasters(schoolId, activeOnly); }
export async function getBloodGroupMasters(schoolId: string, activeOnly = true)   { return repo.listBloodGroupMasters(schoolId, activeOnly); }
export async function getQualificationMasters(schoolId: string, activeOnly = true){ return repo.listQualificationMasters(schoolId, activeOnly); }
export async function getStreamMasters(schoolId: string, activeOnly = true, classId?: string) { return repo.listStreamMasters(schoolId, activeOnly, classId); }
export async function getGradeMasters(schoolId: string, activeOnly = true)        { return repo.listGradeMasters(schoolId, activeOnly); }
export async function getEventTypeMasters(schoolId: string, activeOnly = true)    { return repo.listEventTypeMasters(schoolId, activeOnly); }

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
export async function addStreamMaster(schoolId: string, name: string, sortOrder?: number, classId?: string) {
  if (!name?.trim()) throw new ConflictError('Name is required');
  return repo.createStreamMaster({ schoolId, name: name.trim(), sortOrder, ...(classId ? { classId } : {}) });
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
export async function patchStreamMaster(id: string, data: { name?: string; classId?: string; isActive?: boolean; sortOrder?: number }) {
  return repo.updateStreamMaster(id, data);
}
export async function patchGradeMaster(id: string, data: { name?: string; isActive?: boolean; sortOrder?: number }) {
  return repo.updateGradeMaster(id, data);
}
export async function patchEventTypeMaster(id: string, data: { name?: string; code?: string; isActive?: boolean; sortOrder?: number }) {
  return repo.updateEventTypeMaster(id, data);
}

// ─── Location masters (system-level — stored under the default school) ───────

async function resolveSystemSchoolId(): Promise<string> {
  const s = await repo.getSystemSchoolId();
  if (!s) throw new ConflictError('No default school configured — mark one school as default first');
  return s.id;
}

export async function getCountries(activeOnly = true)                          { return repo.listCountries(await resolveSystemSchoolId(), activeOnly); }
export async function getStatesByCountry(countryId: string, activeOnly = true) { return repo.listStatesByCountry(await resolveSystemSchoolId(), countryId, activeOnly); }
export async function getDistrictsByState(stateId: string, activeOnly = true)  { return repo.listDistrictsByState(await resolveSystemSchoolId(), stateId, activeOnly); }
export async function getAllStates(activeOnly = true)                           { return repo.listAllStates(await resolveSystemSchoolId(), activeOnly); }
export async function getAllDistricts(activeOnly = true)                        { return repo.listAllDistricts(await resolveSystemSchoolId(), activeOnly); }

export async function addCountry(name: string, code: string, sortOrder?: number) {
  if (!name?.trim() || !code?.trim()) throw new ConflictError('Name and code are required');
  const sysId = await resolveSystemSchoolId();
  return repo.createCountry({ schoolId: sysId, name: name.trim(), code: code.trim().toUpperCase(), sortOrder });
}
export async function addState(countryId: string, name: string, code?: string, sortOrder?: number) {
  if (!countryId || !name?.trim()) throw new ConflictError('countryId and name are required');
  const sysId = await resolveSystemSchoolId();
  return repo.createState({ schoolId: sysId, countryId, name: name.trim(), code: code?.trim(), sortOrder });
}
export async function addDistrict(stateId: string, name: string, sortOrder?: number) {
  if (!stateId || !name?.trim()) throw new ConflictError('stateId and name are required');
  const sysId = await resolveSystemSchoolId();
  return repo.createDistrict({ schoolId: sysId, stateId, name: name.trim(), sortOrder });
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

export async function getSchoolLocations(schoolId: string, activeOnly = true)  { return repo.listSchoolLocations(schoolId, activeOnly); }
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

export async function getSchoolHierarchy(schoolId: string, activeOnly = true)  { return repo.listSchoolHierarchy(schoolId, activeOnly); }
export async function addSchoolHierarchy(schoolId: string, data: { name: string; level: number; parentId?: string }) {
  if (!data.name?.trim()) throw new ConflictError('Name is required');
  return repo.createSchoolHierarchy({ schoolId, ...data });
}
export async function patchSchoolHierarchy(id: string, data: { name?: string; level?: number; parentId?: string; isActive?: boolean }) {
  return repo.updateSchoolHierarchy(id, data);
}

export async function getExamTypes(schoolId: string, activeOnly = true)  { return repo.listExamTypes(schoolId, activeOnly); }
export async function addExamType(schoolId: string, data: { name: string; code: string; termOrder?: number }) {
  if (!data.name?.trim() || !data.code?.trim()) throw new ConflictError('Name and code are required');
  return repo.createExamType({ schoolId, name: data.name.trim(), code: data.code.trim().toLowerCase(), termOrder: data.termOrder });
}
export async function patchExamType(id: string, data: { name?: string; code?: string; termOrder?: number; isActive?: boolean }) {
  return repo.updateExamType(id, data);
}

export async function getGradingTypes(schoolId: string, examTypeId?: string, activeOnly = true) {
  return repo.listGradingTypes(schoolId, examTypeId, activeOnly);
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

export async function getAnnouncementTypes(schoolId: string, activeOnly = true)  { return repo.listAnnouncementTypes(schoolId, activeOnly); }
export async function addAnnouncementType(schoolId: string, data: { name: string; code: string }) {
  if (!data.name?.trim() || !data.code?.trim()) throw new ConflictError('Name and code are required');
  return repo.createAnnouncementType({ schoolId, name: data.name.trim(), code: data.code.trim().toLowerCase() });
}
export async function patchAnnouncementType(id: string, data: { name?: string; code?: string; isActive?: boolean }) {
  return repo.updateAnnouncementType(id, data);
}

export async function getContentTypes(schoolId: string, formName?: string, activeOnly = true) {
  return repo.listContentTypes(schoolId, formName, activeOnly);
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
export async function deleteContentType(id: string) {
  if (!id) throw new ConflictError('id is required');
  return repo.deleteContentType(id);
}

// ─── Leave types (existing model) ────────────────────────────────────────────

export async function getLeaveTypes(schoolId: string, activeOnly = true)  { return repo.listLeaveTypes(schoolId, activeOnly); }
export async function addLeaveType(schoolId: string, data: { name: string; code: string; applicableTo: string[] }) {
  if (!data.name?.trim() || !data.code?.trim()) throw new ConflictError('Name and code are required');
  return repo.createLeaveType({ schoolId, name: data.name.trim(), code: data.code.trim().toLowerCase(), applicableTo: data.applicableTo });
}
export async function patchLeaveType(id: string, data: { name?: string; code?: string; applicableTo?: string[]; isActive?: boolean }) {
  return repo.updateLeaveType(id, data);
}
