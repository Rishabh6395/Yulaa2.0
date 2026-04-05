// ─── Global master types ────────────────────────────────────────────────────

export interface GlobalMasterRow {
  id:        string;
  name:      string;
  isActive:  boolean;
  sortOrder: number;
  createdAt: Date;
}

export interface EventTypeMasterRow extends GlobalMasterRow {
  code: string;
}

export interface CountryMasterRow extends GlobalMasterRow {
  code: string;
}

export interface StateMasterRow extends GlobalMasterRow {
  countryId: string;
  code:      string | null;
}

export interface DistrictMasterRow extends GlobalMasterRow {
  stateId: string;
}

// ─── School-specific master types ───────────────────────────────────────────

export interface SchoolLocationMasterRow {
  id:         string;
  schoolId:   string;
  address:    string;
  city:       string | null;
  pincode:    string | null;
  countryId:  string | null;
  stateId:    string | null;
  districtId: string | null;
  isActive:   boolean;
  createdAt:  Date;
  updatedAt:  Date;
}

export interface SchoolHierarchyMasterRow {
  id:        string;
  schoolId:  string;
  name:      string;
  level:     number;
  parentId:  string | null;
  isActive:  boolean;
  createdAt: Date;
}

export interface ExamTypeMasterRow {
  id:        string;
  schoolId:  string;
  name:      string;
  code:      string;
  termOrder: number;
  isActive:  boolean;
  createdAt: Date;
}

export interface GradingTypeMasterRow {
  id:          string;
  schoolId:    string;
  examTypeId:  string;
  grade:       string;
  minPercent:  number;
  maxPercent:  number;
  gradePoints: number | null;
  description: string | null;
  isActive:    boolean;
  createdAt:   Date;
}

export interface AnnouncementTypeMasterRow {
  id:        string;
  schoolId:  string;
  name:      string;
  code:      string;
  isActive:  boolean;
  createdAt: Date;
}

export interface ContentTypeMasterRow {
  id:        string;
  schoolId:  string;
  formName:  string;
  fieldSlot: string;
  fieldType: 'text' | 'dropdown';
  label:     string;
  options:   string[];
  isActive:  boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Form names enum ─────────────────────────────────────────────────────────

export const FORM_NAMES = [
  'admission_form',
  'add_class_form',
  'add_student_form',
  'add_teacher_form',
  'add_parent_form',
  'create_exam_form',
  'profile_information_form',
  'query_form',
] as const;

export type FormName = (typeof FORM_NAMES)[number];
