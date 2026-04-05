import prisma from '@/lib/prisma';

// ─── Simple masters (school-specific) ────────────────────────────────────────

export const listGenderMasters        = (schoolId: string) => prisma.genderMaster.findMany({ where: { schoolId }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
export const listBloodGroupMasters    = (schoolId: string) => prisma.bloodGroupMaster.findMany({ where: { schoolId }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
export const listQualificationMasters = (schoolId: string) => prisma.qualificationMaster.findMany({ where: { schoolId }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
export const listStreamMasters        = (schoolId: string) => prisma.streamMaster.findMany({ where: { schoolId }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
export const listEventTypeMasters     = (schoolId: string) => prisma.eventTypeMaster.findMany({ where: { schoolId }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });

export const createGenderMaster        = (data: { schoolId: string; name: string; sortOrder?: number }) => prisma.genderMaster.create({ data });
export const createBloodGroupMaster    = (data: { schoolId: string; name: string; sortOrder?: number }) => prisma.bloodGroupMaster.create({ data });
export const createQualificationMaster = (data: { schoolId: string; name: string; sortOrder?: number }) => prisma.qualificationMaster.create({ data });
export const createStreamMaster        = (data: { schoolId: string; name: string; sortOrder?: number }) => prisma.streamMaster.create({ data });
export const createEventTypeMaster     = (data: { schoolId: string; name: string; code: string; sortOrder?: number }) => prisma.eventTypeMaster.create({ data });

export const updateGenderMaster        = (id: string, data: { name?: string; isActive?: boolean; sortOrder?: number }) => prisma.genderMaster.update({ where: { id }, data });
export const updateBloodGroupMaster    = (id: string, data: { name?: string; isActive?: boolean; sortOrder?: number }) => prisma.bloodGroupMaster.update({ where: { id }, data });
export const updateQualificationMaster = (id: string, data: { name?: string; isActive?: boolean; sortOrder?: number }) => prisma.qualificationMaster.update({ where: { id }, data });
export const updateStreamMaster        = (id: string, data: { name?: string; isActive?: boolean; sortOrder?: number }) => prisma.streamMaster.update({ where: { id }, data });
export const updateEventTypeMaster     = (id: string, data: { name?: string; code?: string; isActive?: boolean; sortOrder?: number }) => prisma.eventTypeMaster.update({ where: { id }, data });

// ─── Location masters (school-specific) ──────────────────────────────────────

export const listCountries        = (schoolId: string) => prisma.countryMaster.findMany({ where: { schoolId }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
export const listStatesByCountry  = (schoolId: string, countryId: string) => prisma.stateMaster.findMany({ where: { schoolId, countryId }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
export const listDistrictsByState = (schoolId: string, stateId: string)   => prisma.districtMaster.findMany({ where: { schoolId, stateId }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
export const listAllStates        = (schoolId: string) => prisma.stateMaster.findMany({ where: { schoolId }, include: { country: { select: { name: true } } }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
export const listAllDistricts     = (schoolId: string) => prisma.districtMaster.findMany({ where: { schoolId }, include: { state: { select: { name: true } } }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });

export const createCountry  = (data: { schoolId: string; name: string; code: string; sortOrder?: number }) => prisma.countryMaster.create({ data });
export const createState    = (data: { schoolId: string; countryId: string; name: string; code?: string; sortOrder?: number }) => prisma.stateMaster.create({ data });
export const createDistrict = (data: { schoolId: string; stateId: string; name: string; sortOrder?: number }) => prisma.districtMaster.create({ data });

export const updateCountry  = (id: string, data: { name?: string; code?: string; isActive?: boolean; sortOrder?: number }) => prisma.countryMaster.update({ where: { id }, data });
export const updateState    = (id: string, data: { name?: string; code?: string; isActive?: boolean; sortOrder?: number }) => prisma.stateMaster.update({ where: { id }, data });
export const updateDistrict = (id: string, data: { name?: string; isActive?: boolean; sortOrder?: number }) => prisma.districtMaster.update({ where: { id }, data });

// ─── School-specific masters ─────────────────────────────────────────────────

export const listSchoolLocations = (schoolId: string) =>
  prisma.schoolLocationMaster.findMany({
    where:   { schoolId },
    include: { country: true, state: true, district: true },
    orderBy: { createdAt: 'asc' },
  });
export const createSchoolLocation = (data: {
  schoolId:   string;
  address:    string;
  city?:      string;
  pincode?:   string;
  countryId?: string;
  stateId?:   string;
  districtId?:string;
}) => prisma.schoolLocationMaster.create({ data });
export const updateSchoolLocation = (id: string, data: {
  address?:   string;
  city?:      string;
  pincode?:   string;
  countryId?: string;
  stateId?:   string;
  districtId?:string;
  isActive?:  boolean;
}) => prisma.schoolLocationMaster.update({ where: { id }, data });

export const listSchoolHierarchy = (schoolId: string) =>
  prisma.schoolHierarchyMaster.findMany({
    where:   { schoolId },
    orderBy: [{ level: 'asc' }, { name: 'asc' }],
  });
export const createSchoolHierarchy = (data: { schoolId: string; name: string; level: number; parentId?: string }) =>
  prisma.schoolHierarchyMaster.create({ data });
export const updateSchoolHierarchy = (id: string, data: { name?: string; level?: number; parentId?: string; isActive?: boolean }) =>
  prisma.schoolHierarchyMaster.update({ where: { id }, data });

export const listExamTypes = (schoolId: string) =>
  prisma.examTypeMaster.findMany({ where: { schoolId }, orderBy: { termOrder: 'asc' } });
export const createExamType = (data: { schoolId: string; name: string; code: string; termOrder?: number }) =>
  prisma.examTypeMaster.create({ data });
export const updateExamType = (id: string, data: { name?: string; code?: string; termOrder?: number; isActive?: boolean }) =>
  prisma.examTypeMaster.update({ where: { id }, data });

export const listGradingTypes = (schoolId: string, examTypeId?: string) =>
  prisma.gradingTypeMaster.findMany({
    where:   { schoolId, ...(examTypeId && { examTypeId }) },
    include: { examType: { select: { name: true, code: true } } },
    orderBy: [{ examTypeId: 'asc' }, { minPercent: 'desc' }],
  });
export const createGradingType = (data: {
  schoolId:    string;
  examTypeId:  string;
  grade:       string;
  minPercent:  number;
  maxPercent:  number;
  gradePoints?:number;
  description?:string;
}) => prisma.gradingTypeMaster.create({ data });
export const updateGradingType = (id: string, data: {
  grade?:       string;
  minPercent?:  number;
  maxPercent?:  number;
  gradePoints?: number;
  description?: string;
  isActive?:    boolean;
}) => prisma.gradingTypeMaster.update({ where: { id }, data });

export const listAnnouncementTypes = (schoolId: string) =>
  prisma.announcementTypeMaster.findMany({ where: { schoolId }, orderBy: { name: 'asc' } });
export const createAnnouncementType = (data: { schoolId: string; name: string; code: string }) =>
  prisma.announcementTypeMaster.create({ data });
export const updateAnnouncementType = (id: string, data: { name?: string; code?: string; isActive?: boolean }) =>
  prisma.announcementTypeMaster.update({ where: { id }, data });

export const listContentTypes = (schoolId: string, formName?: string) =>
  prisma.contentTypeMaster.findMany({
    where:   { schoolId, ...(formName && { formName }) },
    orderBy: [{ formName: 'asc' }, { sortOrder: 'asc' }],
  });
export const createContentType = (data: {
  schoolId:  string;
  formName:  string;
  fieldSlot: string;
  fieldType: string;
  label:     string;
  options?:  string[];
  sortOrder?:number;
}) => prisma.contentTypeMaster.create({ data });
export const updateContentType = (id: string, data: {
  label?:     string;
  fieldType?: string;
  options?:   string[];
  isActive?:  boolean;
  sortOrder?: number;
}) => prisma.contentTypeMaster.update({ where: { id }, data });

// ─── Leave type master (existing — list by school) ───────────────────────────

export const listLeaveTypes = (schoolId: string) =>
  prisma.leaveTypeMaster.findMany({ where: { schoolId }, orderBy: { name: 'asc' } });
export const createLeaveType = (data: { schoolId: string; name: string; code: string; applicableTo: string[] }) =>
  prisma.leaveTypeMaster.create({ data });
export const updateLeaveType = (id: string, data: { name?: string; code?: string; applicableTo?: string[]; isActive?: boolean }) =>
  prisma.leaveTypeMaster.update({ where: { id }, data });
