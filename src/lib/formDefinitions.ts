/**
 * Single source of truth for all 8 form definitions.
 * Used by:
 *   - The form-config admin page (to render the config editor)
 *   - The useFormConfig hook (to resolve default labels when no custom label is set)
 *   - Every actual form page (to know what fields exist and in what order)
 *
 * Adding a field here automatically makes it available in the config editor
 * AND in the live form — no other file needs updating.
 */

export interface FieldDef {
  id:    string;
  label: string; // Default label — overridden by form config if set
  type:  'text' | 'email' | 'tel' | 'date' | 'number' | 'select' | 'textarea' | 'file' | 'password';
}

export interface RoleDef {
  id:    string;
  label: string;
  color: string;
}

export interface FormDef {
  id:              string;
  label:           string; // Display name for this form
  module:          string; // Which module it belongs to
  fieldSlotPrefix: string; // Content-Type-Master prefix, e.g. 'admission form'
  roles:           RoleDef[];
  fields:          FieldDef[];
}

// ─── Role colour palette ────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  applicant:    'text-violet-600 bg-violet-50 dark:bg-violet-950/30 dark:text-violet-400',
  admin:        'text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400',
  teacher:      'text-teal-600 bg-teal-50 dark:bg-teal-950/30 dark:text-teal-400',
  student:      'text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400',
  parent:       'text-orange-600 bg-orange-50 dark:bg-orange-950/30 dark:text-orange-400',
};

// ─── The 8 canonical forms ──────────────────────────────────────────────────────

export const FORM_DEFINITIONS: FormDef[] = [
  {
    id: 'admission_form',
    label: 'Admission Form',
    module: 'Admission',
    fieldSlotPrefix: 'admission form',
    roles: [
      { id: 'applicant', label: 'Applicant (Public /apply)', color: ROLE_COLORS.applicant },
      { id: 'admin',     label: 'School Admin / Principal', color: ROLE_COLORS.admin },
      { id: 'teacher',   label: 'Teacher',                  color: ROLE_COLORS.teacher },
    ],
    fields: [
      { id: 'parentName',       label: 'Parent / Guardian Name',  type: 'text' },
      { id: 'parentPhone',      label: 'Parent Phone',            type: 'tel' },
      { id: 'parentEmail',      label: 'Parent Email',            type: 'email' },
      { id: 'parentOccupation', label: 'Parent Occupation',       type: 'text' },
      { id: 'address',          label: 'Residential Address',     type: 'textarea' },
      { id: 'childName',        label: 'Child Full Name',         type: 'text' },
      { id: 'childDOB',         label: 'Child Date of Birth',     type: 'date' },
      { id: 'childGender',      label: 'Child Gender',            type: 'select' },
      { id: 'gradeApplying',    label: 'Grade Applying For',      type: 'select' },
      { id: 'aadhaarNo',        label: 'Aadhaar Number',          type: 'text' },
      { id: 'bloodGroup',       label: 'Blood Group',             type: 'select' },
      { id: 'previousSchool',   label: 'Previous School',         type: 'text' },
      { id: 'medicalNotes',     label: 'Medical / Allergy Notes', type: 'textarea' },
    ],
  },
  {
    id: 'add_class_form',
    label: 'Add Class Form',
    module: 'Classes',
    fieldSlotPrefix: 'class form',
    roles: [
      { id: 'admin',   label: 'School Admin / Principal', color: ROLE_COLORS.admin },
      { id: 'teacher', label: 'Teacher',                  color: ROLE_COLORS.teacher },
    ],
    fields: [
      { id: 'grade',        label: 'Grade',         type: 'text' },
      { id: 'section',      label: 'Section',       type: 'text' },
      { id: 'classTeacher', label: 'Class Teacher', type: 'select' },
      { id: 'academicYear', label: 'Academic Year', type: 'text' },
      { id: 'maxStudents',  label: 'Max Students',  type: 'number' },
    ],
  },
  {
    id: 'add_student_form',
    label: 'Add New Student',
    module: 'User Creation',
    fieldSlotPrefix: 'student form',
    roles: [
      { id: 'admin',   label: 'School Admin / Principal', color: ROLE_COLORS.admin },
      { id: 'teacher', label: 'Teacher',                  color: ROLE_COLORS.teacher },
    ],
    fields: [
      { id: 'firstName',        label: 'First Name',        type: 'text' },
      { id: 'lastName',         label: 'Last Name',         type: 'text' },
      { id: 'admissionNo',      label: 'Admission Number',  type: 'text' },
      { id: 'dob',              label: 'Date of Birth',     type: 'date' },
      { id: 'gender',           label: 'Gender',            type: 'select' },
      { id: 'classId',          label: 'Class',             type: 'select' },
      { id: 'aadhaarNo',        label: 'Aadhaar Number',    type: 'text' },
      { id: 'bloodGroup',       label: 'Blood Group',       type: 'select' },
      { id: 'address',          label: 'Address',           type: 'textarea' },
      { id: 'phone',            label: 'Phone',             type: 'tel' },
      { id: 'emergencyContact', label: 'Emergency Contact', type: 'tel' },
      { id: 'parentName',       label: 'Parent Name',       type: 'text' },
      { id: 'parentPhone',      label: 'Parent Phone',      type: 'tel' },
      { id: 'parentEmail',      label: 'Parent Email',      type: 'email' },
    ],
  },
  {
    id: 'add_teacher_form',
    label: 'Add Teacher Form',
    module: 'User Creation',
    fieldSlotPrefix: 'teacher form',
    roles: [
      { id: 'admin', label: 'School Admin / Principal', color: ROLE_COLORS.admin },
    ],
    fields: [
      { id: 'firstName',    label: 'First Name',    type: 'text' },
      { id: 'lastName',     label: 'Last Name',     type: 'text' },
      { id: 'email',        label: 'Email',         type: 'email' },
      { id: 'phone',        label: 'Phone',         type: 'tel' },
      { id: 'employeeId',   label: 'Employee ID',   type: 'text' },
      { id: 'designation',  label: 'Designation',   type: 'text' },
      { id: 'department',   label: 'Department',    type: 'text' },
      { id: 'qualification',label: 'Qualification', type: 'select' },
      { id: 'joiningDate',  label: 'Joining Date',  type: 'date' },
    ],
  },
  {
    id: 'add_parent_form',
    label: 'Add Parent / Guardian',
    module: 'User Creation',
    fieldSlotPrefix: 'parents form',
    roles: [
      { id: 'admin',   label: 'School Admin / Principal', color: ROLE_COLORS.admin },
      { id: 'teacher', label: 'Teacher',                  color: ROLE_COLORS.teacher },
    ],
    fields: [
      { id: 'firstName',    label: 'First Name',              type: 'text' },
      { id: 'lastName',     label: 'Last Name',               type: 'text' },
      { id: 'email',        label: 'Email',                   type: 'email' },
      { id: 'phone',        label: 'Phone',                   type: 'tel' },
      { id: 'password',     label: 'Login Password',          type: 'password' },
      { id: 'occupation',   label: 'Occupation',              type: 'text' },
      { id: 'relationship', label: 'Relationship to Student', type: 'select' },
      { id: 'address',      label: 'Address',                 type: 'textarea' },
    ],
  },
  {
    id: 'create_exam_form',
    label: 'Create New Exam',
    module: 'Exam',
    fieldSlotPrefix: 'exam form',
    roles: [
      { id: 'admin',   label: 'School Admin / Principal', color: ROLE_COLORS.admin },
      { id: 'teacher', label: 'Teacher',                  color: ROLE_COLORS.teacher },
    ],
    fields: [
      { id: 'name',         label: 'Exam Title',          type: 'text' },
      { id: 'examType',     label: 'Exam Type',           type: 'select' },
      { id: 'classId',      label: 'Class',               type: 'select' },
      { id: 'subject',      label: 'Subject',             type: 'text' },
      { id: 'maxMarks',     label: 'Maximum Marks',       type: 'number' },
      { id: 'passingMarks', label: 'Passing Marks',       type: 'number' },
      { id: 'examDate',     label: 'Exam Date',           type: 'date' },
      { id: 'duration',     label: 'Duration (minutes)',  type: 'number' },
    ],
  },
  {
    id: 'profile_information_form',
    label: 'Profile Information Form',
    module: 'Profile',
    fieldSlotPrefix: 'profile form',
    roles: [
      { id: 'admin',   label: 'School Admin / Principal', color: ROLE_COLORS.admin },
      { id: 'teacher', label: 'Teacher',                  color: ROLE_COLORS.teacher },
      { id: 'student', label: 'Student',                  color: ROLE_COLORS.student },
      { id: 'parent',  label: 'Parent',                   color: ROLE_COLORS.parent },
    ],
    fields: [
      { id: 'firstName', label: 'First Name',    type: 'text' },
      { id: 'lastName',  label: 'Last Name',     type: 'text' },
      { id: 'email',     label: 'Email',         type: 'email' },
      { id: 'phone',     label: 'Phone',         type: 'tel' },
      { id: 'avatar',    label: 'Profile Photo', type: 'file' },
      { id: 'address',   label: 'Address',       type: 'textarea' },
      { id: 'dob',       label: 'Date of Birth', type: 'date' },
      { id: 'gender',    label: 'Gender',        type: 'select' },
    ],
  },
  {
    id: 'query_form',
    label: 'Query Form',
    module: 'Query',
    fieldSlotPrefix: 'query form',
    roles: [
      { id: 'admin',   label: 'School Admin / Principal', color: ROLE_COLORS.admin },
      { id: 'teacher', label: 'Teacher',                  color: ROLE_COLORS.teacher },
      { id: 'student', label: 'Student',                  color: ROLE_COLORS.student },
      { id: 'parent',  label: 'Parent',                   color: ROLE_COLORS.parent },
    ],
    fields: [
      { id: 'subject',     label: 'Subject',     type: 'text' },
      { id: 'category',    label: 'Category',    type: 'select' },
      { id: 'message',     label: 'Message',     type: 'textarea' },
      { id: 'priority',    label: 'Priority',    type: 'select' },
      { id: 'attachments', label: 'Attachments', type: 'file' },
    ],
  },
];

/** Quick lookup: formId → field definitions */
export const FORM_FIELDS_MAP: Record<string, FieldDef[]> = Object.fromEntries(
  FORM_DEFINITIONS.map(f => [f.id, f.fields]),
);

/** Get the default label for a field from definitions. Falls back to the fieldId. */
export function getDefaultLabel(formId: string, fieldId: string): string {
  const field = FORM_FIELDS_MAP[formId]?.find(f => f.id === fieldId);
  return field?.label ?? fieldId;
}
