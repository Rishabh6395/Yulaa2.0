// Single source of truth for role-based access control groups.
// Import the right constant and alias it locally if needed:
//   import { CORE_ADMIN_ROLES as ADMIN_ROLES } from '@/lib/roles';

/** Platform-level + school admin only — master data, bulk imports, core config */
export const CORE_ADMIN_ROLES = ['super_admin', 'school_admin'] as const;

/** Admin + principal — oversight, exports, events, school config */
export const PRINCIPAL_ADMIN_ROLES = ['super_admin', 'school_admin', 'principal'] as const;

/** Full management chain — leave admin, syllabus, announcements, timetable */
export const MANAGEMENT_ROLES = ['super_admin', 'school_admin', 'principal', 'hod'] as const;

/** Can review / approve workflow items (management + teachers) */
export const REVIEWER_ROLES = ['super_admin', 'school_admin', 'principal', 'hod', 'teacher'] as const;

/** Staff who hold leave balances and can submit leave */
export const EMPLOYEE_ROLES = ['teacher', 'school_admin', 'principal', 'hod', 'employee'] as const;

/** Roles that can view or manage timetable reassignments */
export const TIMETABLE_ROLES = ['teacher', 'school_admin', 'principal', 'hod'] as const;

export type RoleCode =
  | 'super_admin'
  | 'school_admin'
  | 'principal'
  | 'hod'
  | 'teacher'
  | 'employee'
  | 'parent'
  | 'student';
