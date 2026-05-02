// Single source of truth for role-based access control groups.
// Import the right constant and alias it locally if needed:
//   import { CORE_ADMIN_ROLES as ADMIN_ROLES } from '@/lib/roles';

/** Platform-level + school admin only — master data, bulk imports, core config */
export const CORE_ADMIN_ROLES: readonly string[] = ['super_admin', 'school_admin'];

/** Admin + principal — oversight, exports, events, school config */
export const PRINCIPAL_ADMIN_ROLES: readonly string[] = ['super_admin', 'school_admin', 'principal'];

/** Full management chain — leave admin, syllabus, announcements, timetable */
export const MANAGEMENT_ROLES: readonly string[] = ['super_admin', 'school_admin', 'principal', 'hod'];

/** Can review / approve workflow items (management + teachers) */
export const REVIEWER_ROLES: readonly string[] = ['super_admin', 'school_admin', 'principal', 'hod', 'teacher'];

/** Staff who hold leave balances and can submit leave */
export const EMPLOYEE_ROLES: readonly string[] = ['teacher', 'school_admin', 'principal', 'hod', 'employee'];

/** Roles that can view or manage timetable reassignments */
export const TIMETABLE_ROLES: readonly string[] = ['teacher', 'school_admin', 'principal', 'hod'];

export type RoleCode =
  | 'super_admin'
  | 'school_admin'
  | 'principal'
  | 'hod'
  | 'teacher'
  | 'employee'
  | 'parent'
  | 'student';
