/**
 * Single source of truth for all form definitions.
 * Used by:
 *   - The form-config admin page (to render the config editor)
 *   - The useFormConfig hook (to resolve default labels when no custom label is set)
 *   - Every actual form page (to know what fields exist and in what order)
 *
 * Adding a field here automatically makes it available in the config editor
 * AND in the live form — no other file needs updating.
 */

export interface FieldDef {
  id:         string;
  label:      string; // Default label — overridden by form config if set
  type:       'text' | 'email' | 'tel' | 'date' | 'number' | 'select' | 'textarea' | 'file' | 'password' | 'checkbox' | 'time' | 'datetime-local';
  fromMaster?: string; // If set, select options come from this master table — field type is locked
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

// ─── Form definitions ──────────────────────────────────────────────────────────

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
      { id: 'parentName',           label: 'Parent / Guardian Name',      type: 'text' },
      { id: 'parentPhone',          label: 'Parent Phone',                type: 'tel' },
      { id: 'parentEmail',          label: 'Parent Email',                type: 'email' },
      { id: 'parentOccupation',     label: 'Parent Occupation',           type: 'text' },
      { id: 'fatherName',           label: "Father's Full Name",          type: 'text' },
      { id: 'fatherPhone',          label: "Father's Phone",              type: 'tel' },
      { id: 'fatherEmail',          label: "Father's Email",              type: 'email' },
      { id: 'fatherOccupation',     label: "Father's Occupation",         type: 'text' },
      { id: 'motherName',           label: "Mother's Full Name",          type: 'text' },
      { id: 'motherPhone',          label: "Mother's Phone",              type: 'tel' },
      { id: 'motherEmail',          label: "Mother's Email",              type: 'email' },
      { id: 'motherOccupation',     label: "Mother's Occupation",         type: 'text' },
      { id: 'address',              label: 'Residential Address',         type: 'textarea' },
      { id: 'childName',            label: 'Child Full Name',             type: 'text' },
      { id: 'childPhoto',           label: 'Child Photo',                 type: 'file' },
      { id: 'childDOB',             label: 'Child Date of Birth',         type: 'date' },
      { id: 'childGender',          label: 'Child Gender',                type: 'select', fromMaster: 'gender' },
      { id: 'gradeApplying',        label: 'Grade Applying For',          type: 'select', fromMaster: 'grade' },
      { id: 'aadhaarNo',            label: 'Aadhaar Number',              type: 'text' },
      { id: 'bloodGroup',           label: 'Blood Group',                 type: 'select', fromMaster: 'bloodGroup' },
      { id: 'category',             label: 'Category',                    type: 'select', fromMaster: 'category' },
      { id: 'religion',             label: 'Religion',                    type: 'select', fromMaster: 'religion' },
      { id: 'nationality',          label: 'Nationality',                 type: 'text' },
      { id: 'motherTongue',         label: 'Mother Tongue',               type: 'select', fromMaster: 'mother_tongue' },
      { id: 'admissionCategory',    label: 'Admission Category',          type: 'select', fromMaster: 'admission_category' },
      { id: 'previousSchool',       label: 'Previous School',             type: 'text' },
      { id: 'previousSchoolBoard',  label: 'Previous School Board',       type: 'select', fromMaster: 'board' },
      { id: 'previousClass',        label: 'Class Last Studied',          type: 'text' },
      { id: 'siblingAdmissionNo',   label: 'Sibling Admission No.',       type: 'text' },
      { id: 'boardingType',         label: 'Boarding Type',               type: 'select', fromMaster: 'boarding_type' },
      { id: 'dietType',             label: 'Dietary Preference',          type: 'select', fromMaster: 'diet_type' },
      { id: 'disabilityType',       label: 'Disability / Special Need',   type: 'select', fromMaster: 'disability_type' },
      { id: 'learningSupport',      label: 'Learning Support Required',   type: 'select', fromMaster: 'learning_support' },
      { id: 'transportRequired',    label: 'Transport Required',          type: 'select' },
      { id: 'entranceTestScore',    label: 'Entrance Test Score',         type: 'number' },
      { id: 'passportNo',           label: 'Passport Number',             type: 'text' },
      { id: 'medicalNotes',         label: 'Medical / Allergy Notes',     type: 'textarea' },
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
      { id: 'classTeacher', label: 'Class Teacher', type: 'select', fromMaster: 'teacher' },
      { id: 'academicYear', label: 'Academic Year', type: 'text' },
      { id: 'maxStudents',  label: 'Max Students',  type: 'number' },
      { id: 'stream',       label: 'Stream',        type: 'select', fromMaster: 'streams' },
      { id: 'houseId',      label: 'House',         type: 'select', fromMaster: 'house' },
      { id: 'roomNo',       label: 'Room / Classroom No.', type: 'text' },
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
      { id: 'photo',              label: 'Profile Photo',           type: 'file' },
      { id: 'firstName',          label: 'First Name',              type: 'text' },
      { id: 'middleName',         label: 'Middle Name',             type: 'text' },
      { id: 'lastName',           label: 'Last Name',               type: 'text' },
      { id: 'admissionNo',        label: 'Admission Number',        type: 'text' },
      { id: 'rollNo',             label: 'Roll Number',             type: 'text' },
      { id: 'srNo',               label: 'Scholar Register No.',    type: 'text' },
      { id: 'dob',                label: 'Date of Birth',           type: 'date' },
      { id: 'gender',             label: 'Gender',                  type: 'select', fromMaster: 'gender' },
      { id: 'classId',            label: 'Class',                   type: 'select', fromMaster: 'class' },
      { id: 'aadhaarNo',          label: 'Aadhaar Number',          type: 'text' },
      { id: 'bloodGroup',         label: 'Blood Group',             type: 'select', fromMaster: 'bloodGroup' },
      { id: 'category',           label: 'Category',                type: 'select', fromMaster: 'category' },
      { id: 'religion',           label: 'Religion',                type: 'select', fromMaster: 'religion' },
      { id: 'nationality',        label: 'Nationality',             type: 'text' },
      { id: 'motherTongue',       label: 'Mother Tongue',           type: 'select', fromMaster: 'mother_tongue' },
      { id: 'houseId',            label: 'House',                   type: 'select', fromMaster: 'house' },
      { id: 'stream',             label: 'Stream',                  type: 'select', fromMaster: 'streams' },
      { id: 'admissionCategory',  label: 'Admission Category',      type: 'select', fromMaster: 'admission_category' },
      { id: 'boardingType',       label: 'Boarding Type',           type: 'select', fromMaster: 'boarding_type' },
      { id: 'dietType',           label: 'Diet Type',               type: 'select', fromMaster: 'diet_type' },
      { id: 'disabilityType',     label: 'Disability Type',         type: 'select', fromMaster: 'disability_type' },
      { id: 'transportRouteId',   label: 'Transport Route',         type: 'select', fromMaster: 'transport_stop' },
      { id: 'busStop',            label: 'Bus Stop',                type: 'text' },
      { id: 'doctorName',         label: 'Family Doctor',           type: 'text' },
      { id: 'doctorPhone',        label: 'Doctor Phone',            type: 'tel' },
      { id: 'insuranceProvider',  label: 'Health Insurance Provider', type: 'text' },
      { id: 'passportNo',         label: 'Passport Number',         type: 'text' },
      { id: 'address',            label: 'Address',                 type: 'textarea' },
      { id: 'phone',              label: 'Phone',                   type: 'tel' },
      { id: 'emergencyContact',   label: 'Emergency Contact',       type: 'tel' },
      { id: 'parentName',         label: 'Parent Name',             type: 'text' },
      { id: 'parentPhone',        label: 'Parent Phone',            type: 'tel' },
      { id: 'parentEmail',        label: 'Parent Email',            type: 'email' },
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
      { id: 'photo',               label: 'Profile Photo',           type: 'file' },
      { id: 'firstName',           label: 'First Name',              type: 'text' },
      { id: 'lastName',            label: 'Last Name',               type: 'text' },
      { id: 'email',               label: 'Email',                   type: 'email' },
      { id: 'phone',               label: 'Phone',                   type: 'tel' },
      { id: 'employeeId',          label: 'Employee ID',             type: 'text' },
      { id: 'designation',         label: 'Designation',             type: 'text' },
      { id: 'department',          label: 'Department',              type: 'text' },
      { id: 'qualification',       label: 'Qualification',           type: 'select', fromMaster: 'qualification' },
      { id: 'joiningDate',         label: 'Joining Date',            type: 'date' },
      { id: 'dateOfBirth',         label: 'Date of Birth',           type: 'date' },
      { id: 'gender',              label: 'Gender',                  type: 'select', fromMaster: 'gender' },
      { id: 'aadhaarNo',           label: 'Aadhaar Number',          type: 'text' },
      { id: 'panNo',               label: 'PAN Number',              type: 'text' },
      { id: 'category',            label: 'Category',                type: 'select', fromMaster: 'category' },
      { id: 'employmentType',      label: 'Employment Type',         type: 'select', fromMaster: 'employment_type' },
      { id: 'designationType',     label: 'Designation Type',        type: 'select', fromMaster: 'designation_type' },
      { id: 'teacherCertification',label: 'Teaching Certification',  type: 'select', fromMaster: 'teacher_cert' },
      { id: 'experienceYears',     label: 'Years of Experience',     type: 'number' },
      { id: 'languagesKnown',      label: 'Languages Known',         type: 'text' },
      { id: 'pfAccountNo',         label: 'PF Account No.',          type: 'text' },
      { id: 'bankAccountNo',       label: 'Bank Account No.',        type: 'text' },
      { id: 'bankIfsc',            label: 'Bank IFSC Code',          type: 'text' },
      { id: 'ibCertified',         label: 'IB Certified',            type: 'select' },
      { id: 'workPermitType',      label: 'Work Permit Type',        type: 'select', fromMaster: 'visa_type' },
      { id: 'passportNo',          label: 'Passport No.',            type: 'text' },
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
      { id: 'photo',             label: 'Profile Photo',              type: 'file' },
      { id: 'firstName',         label: 'First Name',                 type: 'text' },
      { id: 'lastName',          label: 'Last Name',                  type: 'text' },
      { id: 'email',             label: 'Email',                      type: 'email' },
      { id: 'phone',             label: 'Phone',                      type: 'tel' },
      { id: 'alternatePhone',    label: 'Alternate Phone',            type: 'tel' },
      { id: 'password',          label: 'Login Password',             type: 'password' },
      { id: 'occupation',        label: 'Occupation',                 type: 'text' },
      { id: 'organization',      label: 'Organization / Employer',    type: 'text' },
      { id: 'relationship',      label: 'Relationship to Student',    type: 'select', fromMaster: 'relationship' },
      { id: 'dateOfBirth',       label: 'Date of Birth',              type: 'date' },
      { id: 'gender',            label: 'Gender',                     type: 'select', fromMaster: 'gender' },
      { id: 'aadhaarNo',         label: 'Aadhaar Number',             type: 'text' },
      { id: 'panNo',             label: 'PAN Number',                 type: 'text' },
      { id: 'nationality',       label: 'Nationality',                type: 'text' },
      { id: 'annualIncome',      label: 'Annual Income',              type: 'select', fromMaster: 'income_bracket' },
      { id: 'highestEducation',  label: 'Highest Education',          type: 'select', fromMaster: 'qualification' },
      { id: 'address',           label: 'Address',                    type: 'textarea' },
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
      { id: 'examType',     label: 'Exam Type',           type: 'select', fromMaster: 'examType' },
      { id: 'classId',      label: 'Class',               type: 'select', fromMaster: 'class' },
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
      { id: 'gender',    label: 'Gender',        type: 'select', fromMaster: 'gender' },
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
  {
    id: 'vendor_form',
    label: 'Vendor / Product Form',
    module: 'Vendor',
    fieldSlotPrefix: 'vendor form',
    roles: [
      { id: 'admin', label: 'School Admin / Principal', color: ROLE_COLORS.admin },
    ],
    fields: [
      { id: 'company_name',  label: 'Company Name',     type: 'text' },
      { id: 'category',      label: 'Product Category', type: 'select' },
      { id: 'contact_name',  label: 'Contact Name',     type: 'text' },
      { id: 'email',         label: 'Email',            type: 'email' },
      { id: 'phone',         label: 'Phone',            type: 'tel' },
      { id: 'gst_no',        label: 'GST Number',       type: 'text' },
      { id: 'address',       label: 'Address',          type: 'textarea' },
      { id: 'contract_end',  label: 'Contract End Date',type: 'date' },
    ],
  },
  {
    id: 'register_school_form',
    label: 'Register School Form',
    module: 'School Management',
    fieldSlotPrefix: 'register school form',
    roles: [
      { id: 'admin', label: 'Super Admin', color: ROLE_COLORS.admin },
    ],
    fields: [
      { id: 'name',             label: 'School Name',       type: 'text' },
      { id: 'email',            label: 'Admin Email',       type: 'email' },
      { id: 'phone',            label: 'Phone',             type: 'tel' },
      { id: 'address',          label: 'Address',           type: 'textarea' },
      { id: 'state',            label: 'State',             type: 'select', fromMaster: 'state' },
      { id: 'district',         label: 'District',          type: 'select', fromMaster: 'district' },
      { id: 'city',             label: 'City',              type: 'text' },
      { id: 'website',          label: 'Website',           type: 'text' },
      { id: 'latitude',         label: 'Latitude',          type: 'number' },
      { id: 'longitude',        label: 'Longitude',         type: 'number' },
      { id: 'boardType',        label: 'Board Type',        type: 'select' },
      { id: 'subscriptionPlan', label: 'Subscription Plan', type: 'select' },
    ],
  },
  // ─── Leave ───────────────────────────────────────────────────────────────────
  {
    id: 'leave_request',
    label: 'Leave Request',
    module: 'Leave',
    fieldSlotPrefix: 'leave form',
    roles: [
      { id: 'teacher',  label: 'Teacher / Employee', color: ROLE_COLORS.teacher },
      { id: 'student',  label: 'Student',            color: ROLE_COLORS.student },
      { id: 'admin',    label: 'School Admin',        color: ROLE_COLORS.admin },
    ],
    fields: [
      { id: 'leaveType',  label: 'Leave Type',  type: 'select' },
      { id: 'startDate',  label: 'Start Date',  type: 'date' },
      { id: 'endDate',    label: 'End Date',    type: 'date' },
      { id: 'reason',     label: 'Reason',      type: 'textarea' },
    ],
  },
  // ─── Fees ────────────────────────────────────────────────────────────────────
  {
    id: 'add_fee_type_form',
    label: 'Add Fee Type',
    module: 'Fees',
    fieldSlotPrefix: 'fee type form',
    roles: [
      { id: 'admin', label: 'School Admin / Principal', color: ROLE_COLORS.admin },
    ],
    fields: [
      { id: 'name',      label: 'Fee Name',   type: 'text' },
      { id: 'amount',    label: 'Amount (₹)', type: 'number' },
      { id: 'frequency', label: 'Frequency',  type: 'select' },
      { id: 'classId',   label: 'Class',      type: 'select', fromMaster: 'class' },
    ],
  },
  {
    id: 'apply_fees_form',
    label: 'Apply Fees to Students',
    module: 'Fees',
    fieldSlotPrefix: 'apply fees form',
    roles: [
      { id: 'admin', label: 'School Admin / Principal', color: ROLE_COLORS.admin },
    ],
    fields: [
      { id: 'applyTo',        label: 'Apply To',   type: 'select' },
      { id: 'classId',        label: 'Class',      type: 'select', fromMaster: 'class' },
      { id: 'feeStructureId', label: 'Fee Type',   type: 'select' },
      { id: 'amount',         label: 'Amount (₹)', type: 'number' },
      { id: 'dueDate',        label: 'Due Date',   type: 'date' },
    ],
  },
  // ─── Homework ─────────────────────────────────────────────────────────────────
  {
    id: 'add_homework_form',
    label: 'Add Homework',
    module: 'Homework',
    fieldSlotPrefix: 'homework form',
    roles: [
      { id: 'teacher', label: 'Teacher',                   color: ROLE_COLORS.teacher },
      { id: 'admin',   label: 'School Admin / Principal',  color: ROLE_COLORS.admin },
    ],
    fields: [
      { id: 'classId',     label: 'Class',       type: 'select', fromMaster: 'class' },
      { id: 'subject',     label: 'Subject',     type: 'text' },
      { id: 'title',       label: 'Title',       type: 'text' },
      { id: 'description', label: 'Description', type: 'textarea' },
      { id: 'dueDate',     label: 'Due Date',    type: 'date' },
      { id: 'attachments', label: 'Attachments', type: 'file' },
    ],
  },
  // ─── Announcements ────────────────────────────────────────────────────────────
  {
    id: 'new_announcement_form',
    label: 'New Announcement',
    module: 'Announcements',
    fieldSlotPrefix: 'announcement form',
    roles: [
      { id: 'admin',   label: 'School Admin / Principal', color: ROLE_COLORS.admin },
      { id: 'teacher', label: 'Teacher',                  color: ROLE_COLORS.teacher },
    ],
    fields: [
      { id: 'title',    label: 'Title',    type: 'text' },
      { id: 'message',  label: 'Message',  type: 'textarea' },
      { id: 'type',     label: 'Type',     type: 'select' },
      { id: 'audience', label: 'Audience', type: 'select' },
      { id: 'classIds', label: 'Classes',  type: 'select', fromMaster: 'class' },
    ],
  },
  // ─── Events ───────────────────────────────────────────────────────────────────
  {
    id: 'create_event_form',
    label: 'Create Event',
    module: 'Events',
    fieldSlotPrefix: 'event form',
    roles: [
      { id: 'admin',   label: 'School Admin / Principal', color: ROLE_COLORS.admin },
      { id: 'teacher', label: 'Teacher',                  color: ROLE_COLORS.teacher },
    ],
    fields: [
      { id: 'title',        label: 'Title',         type: 'text' },
      { id: 'eventType',    label: 'Event Type',    type: 'select' },
      { id: 'startDate',    label: 'Start Date',    type: 'date' },
      { id: 'endDate',      label: 'End Date',      type: 'date' },
      { id: 'venue',        label: 'Venue',         type: 'text' },
      { id: 'description',  label: 'Description',   type: 'textarea' },
      { id: 'academicYear', label: 'Academic Year', type: 'text' },
    ],
  },
  // ─── Vendor Inventory ────────────────────────────────────────────────────────
  {
    id: 'add_inventory_item_form',
    label: 'Add Inventory Item',
    module: 'Inventory',
    fieldSlotPrefix: 'inventory item form',
    roles: [
      { id: 'admin', label: 'School Admin / Principal', color: ROLE_COLORS.admin },
    ],
    fields: [
      { id: 'name',        label: 'Item Name',   type: 'text' },
      { id: 'category',    label: 'Category',    type: 'select' },
      { id: 'description', label: 'Description', type: 'textarea' },
      { id: 'price',       label: 'Price (₹)',   type: 'number' },
      { id: 'quantity',    label: 'Quantity',    type: 'number' },
      { id: 'unit',        label: 'Unit',        type: 'select' },
      { id: 'status',      label: 'Status',      type: 'select' },
    ],
  },
  // ─── Timetable ────────────────────────────────────────────────────────────────
  {
    id: 'class_log_form',
    label: 'Class Log / Diary',
    module: 'Timetable',
    fieldSlotPrefix: 'class log form',
    roles: [
      { id: 'teacher', label: 'Teacher', color: ROLE_COLORS.teacher },
    ],
    fields: [
      { id: 'topic',      label: 'Topic Taught',      type: 'text' },
      { id: 'notes',      label: 'Teacher Notes',     type: 'textarea' },
      { id: 'hwTitle',    label: 'Homework Title',    type: 'text' },
      { id: 'hwDueDate',  label: 'Homework Due Date', type: 'date' },
      { id: 'hwMaxMarks', label: 'Max Marks',         type: 'number' },
      { id: 'hwDesc',     label: 'Homework Details',  type: 'textarea' },
    ],
  },
  {
    id: 'reassign_class_form',
    label: 'Reassign / Substitute Class',
    module: 'Timetable',
    fieldSlotPrefix: 'reassign class form',
    roles: [
      { id: 'admin',   label: 'School Admin / Principal', color: ROLE_COLORS.admin },
      { id: 'teacher', label: 'Teacher / HOD',            color: ROLE_COLORS.teacher },
    ],
    fields: [
      { id: 'substituteTeacherId', label: 'Substitute Teacher', type: 'select', fromMaster: 'teacher' },
      { id: 'startDate',           label: 'From Date',          type: 'date' },
      { id: 'endDate',             label: 'To Date',            type: 'date' },
      { id: 'reason',              label: 'Reason',             type: 'textarea' },
    ],
  },
  // ─── Compliance ───────────────────────────────────────────────────────────────
  {
    id: 'add_compliance_form',
    label: 'Add Compliance Item',
    module: 'Compliance',
    fieldSlotPrefix: 'compliance form',
    roles: [
      { id: 'admin', label: 'School Admin / Principal', color: ROLE_COLORS.admin },
    ],
    fields: [
      { id: 'category',    label: 'Category',    type: 'select' },
      { id: 'title',       label: 'Title',       type: 'text' },
      { id: 'description', label: 'Description', type: 'textarea' },
      { id: 'status',      label: 'Status',      type: 'select' },
      { id: 'dueDate',     label: 'Due Date',    type: 'date' },
      { id: 'notes',       label: 'Notes',       type: 'textarea' },
    ],
  },
  // ─── School Inventory ─────────────────────────────────────────────────────────
  {
    id: 'school_inventory_form',
    label: 'Add School Inventory Item',
    module: 'School Inventory',
    fieldSlotPrefix: 'school inventory form',
    roles: [
      { id: 'admin', label: 'School Admin / Principal', color: ROLE_COLORS.admin },
    ],
    fields: [
      { id: 'name',        label: 'Item Name',   type: 'text' },
      { id: 'category',    label: 'Category',    type: 'select' },
      { id: 'unit',        label: 'Unit',        type: 'text' },
      { id: 'minStock',    label: 'Min Stock',   type: 'number' },
      { id: 'description', label: 'Description', type: 'textarea' },
    ],
  },
  {
    id: 'record_purchase_form',
    label: 'Record Stock Purchase',
    module: 'School Inventory',
    fieldSlotPrefix: 'purchase form',
    roles: [
      { id: 'admin', label: 'School Admin / Principal', color: ROLE_COLORS.admin },
    ],
    fields: [
      { id: 'vendorName',   label: 'Vendor Name',   type: 'text' },
      { id: 'quantity',     label: 'Quantity',       type: 'number' },
      { id: 'unitPrice',    label: 'Unit Price (₹)', type: 'number' },
      { id: 'purchaseDate', label: 'Purchase Date',  type: 'date' },
      { id: 'invoiceNo',    label: 'Invoice Number', type: 'text' },
    ],
  },
  {
    id: 'record_issue_form',
    label: 'Record Stock Issue',
    module: 'School Inventory',
    fieldSlotPrefix: 'issue form',
    roles: [
      { id: 'admin', label: 'School Admin / Principal', color: ROLE_COLORS.admin },
    ],
    fields: [
      { id: 'issuedToId',         label: 'Issued To (User ID)',   type: 'text' },
      { id: 'issuedToName',       label: 'Issued To Name',        type: 'text' },
      { id: 'quantity',           label: 'Quantity',              type: 'number' },
      { id: 'purpose',            label: 'Purpose',               type: 'textarea' },
      { id: 'expectedReturnDate', label: 'Expected Return Date',  type: 'date' },
    ],
  },
  // ─── User Management (Super Admin) ───────────────────────────────────────────
  {
    id: 'create_user_form',
    label: 'Create User',
    module: 'User Management',
    fieldSlotPrefix: 'create user form',
    roles: [
      { id: 'admin', label: 'Super Admin', color: ROLE_COLORS.admin },
    ],
    fields: [
      { id: 'firstName', label: 'First Name', type: 'text' },
      { id: 'lastName',  label: 'Last Name',  type: 'text' },
      { id: 'email',     label: 'Email',      type: 'email' },
      { id: 'phone',     label: 'Phone',      type: 'tel' },
      { id: 'password',  label: 'Password',   type: 'password' },
      { id: 'roleId',    label: 'Role',       type: 'select' },
      { id: 'schoolId',  label: 'School',     type: 'select' },
    ],
  },
  // ─── Masters ──────────────────────────────────────────────────────────────────
  {
    id: 'add_subject_form',
    label: 'Add Subject',
    module: 'Masters',
    fieldSlotPrefix: 'subject form',
    roles: [
      { id: 'admin',   label: 'School Admin / Principal', color: ROLE_COLORS.admin },
      { id: 'teacher', label: 'Teacher',                  color: ROLE_COLORS.teacher },
    ],
    fields: [
      { id: 'classId',   label: 'Class',        type: 'select', fromMaster: 'class' },
      { id: 'name',      label: 'Subject Name', type: 'text' },
      { id: 'sortOrder', label: 'Sort Order',   type: 'number' },
    ],
  },
  // ─── Letter Templates ─────────────────────────────────────────────────────────
  {
    id: 'letter_template_form',
    label: 'Letter Template',
    module: 'Letter Templates',
    fieldSlotPrefix: 'letter template form',
    roles: [
      { id: 'admin', label: 'School Admin / Principal', color: ROLE_COLORS.admin },
    ],
    fields: [
      { id: 'name',         label: 'Template Name', type: 'text' },
      { id: 'templateType', label: 'Template Type', type: 'select' },
      { id: 'htmlContent',  label: 'HTML Content',  type: 'textarea' },
    ],
  },
  // ─── Masters – Grading Types ──────────────────────────────────────────────────
  {
    id: 'add_grading_type_form',
    label: 'Add Grading Scale',
    module: 'Masters',
    fieldSlotPrefix: 'grading type form',
    roles: [
      { id: 'admin', label: 'School Admin / Principal', color: ROLE_COLORS.admin },
    ],
    fields: [
      { id: 'grade',       label: 'Grade',        type: 'text' },
      { id: 'minPercent',  label: 'Min %',         type: 'number' },
      { id: 'maxPercent',  label: 'Max %',         type: 'number' },
      { id: 'gradePoints', label: 'Grade Points',  type: 'number' },
      { id: 'description', label: 'Description',   type: 'text' },
    ],
  },
  // ─── Syllabus ─────────────────────────────────────────────────────────────────
  {
    id: 'add_syllabus_item_form',
    label: 'Add Syllabus Item',
    module: 'Syllabus',
    fieldSlotPrefix: 'syllabus form',
    roles: [
      { id: 'admin',   label: 'School Admin / Principal', color: ROLE_COLORS.admin },
      { id: 'teacher', label: 'Teacher',                  color: ROLE_COLORS.teacher },
    ],
    fields: [
      { id: 'classId',      label: 'Class',         type: 'select', fromMaster: 'class' },
      { id: 'subject',      label: 'Subject',        type: 'select' },
      { id: 'chapter',      label: 'Chapter',        type: 'text' },
      { id: 'topic',        label: 'Topic',          type: 'text' },
      { id: 'orderNo',      label: 'Order No.',      type: 'number' },
      { id: 'academicYear', label: 'Academic Year',  type: 'text' },
      { id: 'startDate',    label: 'Start Date',     type: 'date' },
      { id: 'endDate',      label: 'End Date',       type: 'date' },
    ],
  },
  // ─── Transport ────────────────────────────────────────────────────────────────
  {
    id: 'add_transport_route_form',
    label: 'Add Transport Route',
    module: 'Transport',
    fieldSlotPrefix: 'transport route form',
    roles: [
      { id: 'admin', label: 'School Admin / Principal', color: ROLE_COLORS.admin },
    ],
    fields: [
      { id: 'name',             label: 'Route Name',        type: 'text' },
      { id: 'driverName',       label: 'Driver Name',       type: 'text' },
      { id: 'driverPhone',      label: 'Driver Phone',      type: 'tel' },
      { id: 'vehicleNo',        label: 'Vehicle No.',       type: 'text' },
      { id: 'capacity',         label: 'Capacity',          type: 'number' },
      { id: 'morningDeparture', label: 'Morning Departure', type: 'time' },
      { id: 'eveningDeparture', label: 'Evening Departure', type: 'time' },
    ],
  },
  {
    id: 'add_transport_bus_form',
    label: 'Add Bus',
    module: 'Transport',
    fieldSlotPrefix: 'transport bus form',
    roles: [
      { id: 'admin', label: 'School Admin / Principal', color: ROLE_COLORS.admin },
    ],
    fields: [
      { id: 'busNumber',  label: 'Bus Number',  type: 'text' },
      { id: 'capacity',   label: 'Capacity',    type: 'number' },
      { id: 'gpsEnabled', label: 'GPS Enabled', type: 'checkbox' },
    ],
  },
  // ─── Exams (schedule) ─────────────────────────────────────────────────────────
  {
    id: 'create_exam_schedule_form',
    label: 'Create Exam Schedule',
    module: 'Exams',
    fieldSlotPrefix: 'exam schedule form',
    roles: [
      { id: 'admin',   label: 'School Admin / Principal', color: ROLE_COLORS.admin },
      { id: 'teacher', label: 'Teacher',                  color: ROLE_COLORS.teacher },
    ],
    fields: [
      { id: 'title',     label: 'Exam Title',  type: 'text' },
      { id: 'examType',  label: 'Exam Type',   type: 'text' },
      { id: 'classId',   label: 'Class',       type: 'select', fromMaster: 'class' },
      { id: 'startDate', label: 'Start Date',  type: 'date' },
      { id: 'endDate',   label: 'End Date',    type: 'date' },
    ],
  },
  // ─── Courses ──────────────────────────────────────────────────────────────────
  {
    id: 'create_course_form',
    label: 'Create Course',
    module: 'Courses',
    fieldSlotPrefix: 'course form',
    roles: [
      { id: 'admin',   label: 'School Admin / Principal', color: ROLE_COLORS.admin },
      { id: 'teacher', label: 'Teacher',                  color: ROLE_COLORS.teacher },
    ],
    fields: [
      { id: 'title',              label: 'Course Title',  type: 'text' },
      { id: 'description',        label: 'Description',   type: 'textarea' },
      { id: 'type',               label: 'Type',          type: 'select' },
      { id: 'price',              label: 'Price (₹)',      type: 'number' },
      { id: 'tags',               label: 'Tags',          type: 'text' },
      { id: 'isFree',             label: 'Free Course',   type: 'checkbox' },
      { id: 'certificateEnabled', label: 'Certificate',   type: 'checkbox' },
    ],
  },
  // ─── Online Classes ───────────────────────────────────────────────────────────
  {
    id: 'create_online_class_form',
    label: 'Create Online Class',
    module: 'Online Classes',
    fieldSlotPrefix: 'online class form',
    roles: [
      { id: 'admin',   label: 'School Admin / Principal', color: ROLE_COLORS.admin },
      { id: 'teacher', label: 'Teacher',                  color: ROLE_COLORS.teacher },
    ],
    fields: [
      { id: 'slotId',          label: 'Timetable Slot',     type: 'select' },
      { id: 'classId',         label: 'Class',              type: 'select', fromMaster: 'class' },
      { id: 'title',           label: 'Class Title',        type: 'text' },
      { id: 'subject',         label: 'Subject',            type: 'select' },
      { id: 'platform',        label: 'Platform',           type: 'select' },
      { id: 'meetingLink',     label: 'Meeting Link',       type: 'text' },
      { id: 'meetingId',       label: 'Meeting ID',         type: 'text' },
      { id: 'meetingPassword', label: 'Meeting Password',   type: 'text' },
      { id: 'scheduledAt',     label: 'Scheduled At',       type: 'datetime-local' },
      { id: 'durationMinutes', label: 'Duration (minutes)', type: 'number' },
    ],
  },
  // ─── Scheduling / Timetable Periods ───────────────────────────────────────────
  {
    id: 'add_timetable_period_form',
    label: 'Add Timetable Period',
    module: 'Scheduling',
    fieldSlotPrefix: 'timetable period form',
    roles: [
      { id: 'admin', label: 'School Admin / Principal', color: ROLE_COLORS.admin },
    ],
    fields: [
      { id: 'startTime', label: 'Start Time', type: 'time' },
      { id: 'endTime',   label: 'End Time',   type: 'time' },
    ],
  },
  // ─── Vendor Products ──────────────────────────────────────────────────────────
  {
    id: 'add_vendor_product_form',
    label: 'Add Vendor Product',
    module: 'Vendor',
    fieldSlotPrefix: 'vendor product form',
    roles: [
      { id: 'admin', label: 'School Admin / Principal', color: ROLE_COLORS.admin },
    ],
    fields: [
      { id: 'name',        label: 'Product Name', type: 'text' },
      { id: 'category',    label: 'Category',     type: 'select' },
      { id: 'price',       label: 'Price (₹)',     type: 'number' },
      { id: 'mrp',         label: 'MRP (₹)',        type: 'number' },
      { id: 'quantity',    label: 'Quantity',      type: 'number' },
      { id: 'unit',        label: 'Unit',          type: 'text' },
      { id: 'description', label: 'Description',   type: 'textarea' },
    ],
  },
  // ─── Super Admin – Consultants ────────────────────────────────────────────────
  {
    id: 'create_consultant_form',
    label: 'Create Consultant',
    module: 'Super Admin',
    fieldSlotPrefix: 'consultant form',
    roles: [
      { id: 'admin', label: 'Super Admin', color: ROLE_COLORS.admin },
    ],
    fields: [
      { id: 'firstName',       label: 'First Name',         type: 'text' },
      { id: 'lastName',        label: 'Last Name',          type: 'text' },
      { id: 'email',           label: 'Email',              type: 'email' },
      { id: 'phone',           label: 'Phone',              type: 'tel' },
      { id: 'password',        label: 'Password',           type: 'password' },
      { id: 'specialization',  label: 'Specialization',     type: 'text' },
      { id: 'sessionFee',      label: 'Session Fee (₹)',    type: 'number' },
      { id: 'experienceYears', label: 'Experience (years)', type: 'number' },
      { id: 'qualifications',  label: 'Qualifications',     type: 'text' },
      { id: 'bio',             label: 'Bio',                type: 'textarea' },
      { id: 'isExternal',      label: 'External Consultant', type: 'checkbox' },
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
