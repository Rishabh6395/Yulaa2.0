export interface MenuItem {
  label: string;
  href: string;
  icon: string;
  key: string;
  children?: MenuItem[];
}

export const menuItems: Record<string, MenuItem[]> = {
  super_admin: [
    { label: 'School Library',          href: '/dashboard/schools',                       icon: 'Building',      key: 'schools' },
    { label: 'Default School Settings', href: '/dashboard/schools/default',               icon: 'Settings',      key: 'schools_default' },
    { label: 'All Consultants',         href: '/dashboard/super-admin/consultants',        icon: 'Briefcase',     key: 'super_consultants' },
    { label: 'All Vendors',             href: '/dashboard/super-admin/vendors',            icon: 'ShoppingBag',   key: 'super_vendors' },
    { label: 'Online Class Config',     href: '/dashboard/super-admin/online-class-config', icon: 'Monitor',      key: 'super_online_class' },
    { label: 'Course Approvals',        href: '/dashboard/super-admin/courses',            icon: 'BookOpen',      key: 'super_courses' },
    { label: 'School Admin Queries',    href: '/dashboard/super-admin/queries',            icon: 'MessageSquare', key: 'super_queries' },
    { label: 'Form Configuration',      href: '/dashboard/super-admin/form-config',         icon: 'Layout',        key: 'super_form_config' },
  ],
  school_admin: [
    { label: 'Dashboard', href: '/dashboard',         icon: 'LayoutDashboard', key: 'dashboard' },
    { label: 'Masters',   href: '/dashboard/masters', icon: 'Database',        key: 'masters' },
    {
      label: 'Admissions', href: '', icon: 'ClipboardList', key: 'admissions_group',
      children: [
        { label: 'Admissions', href: '/dashboard/admissions', icon: 'ClipboardList', key: 'admissions' },
        { label: 'Fees',       href: '/dashboard/fees',       icon: 'CreditCard',    key: 'fees' },
      ],
    },
    { label: 'Classes', href: '/dashboard/classes', icon: 'LayoutGrid', key: 'classes' },
    {
      label: 'Users', href: '', icon: 'Users', key: 'users_group',
      children: [
        { label: 'Students', href: '/dashboard/students', icon: 'Users',         key: 'students' },
        { label: 'Teachers', href: '/dashboard/teachers', icon: 'GraduationCap', key: 'teachers' },
        { label: 'Parents',  href: '/dashboard/parents',  icon: 'Heart',         key: 'parents' },
      ],
    },
    {
      label: 'Attendance', href: '', icon: 'CalendarCheck', key: 'attendance_group',
      children: [
        { label: 'Attendance', href: '/dashboard/attendance', icon: 'CalendarCheck', key: 'attendance' },
        { label: 'Leave',      href: '/dashboard/leave',      icon: 'Calendar',      key: 'leave' },
      ],
    },
    {
      label: 'Academic', href: '', icon: 'CalendarDays', key: 'academic_group',
      children: [
        { label: 'Scheduling',     href: '/dashboard/scheduling',     icon: 'CalendarDays', key: 'scheduling' },
        { label: 'Syllabus',       href: '/dashboard/syllabus',       icon: 'BookMarked',   key: 'syllabus' },
        { label: 'Online Classes', href: '/dashboard/online-classes', icon: 'Monitor',      key: 'online_classes' },
      ],
    },
    {
      label: 'Events', href: '', icon: 'CalendarStar', key: 'events_group',
      children: [
        { label: 'Events',        href: '/dashboard/events',        icon: 'CalendarStar', key: 'events' },
        { label: 'Announcements', href: '/dashboard/announcements', icon: 'Megaphone',    key: 'announcements' },
      ],
    },
    {
      label: 'Assessment', href: '', icon: 'ClipboardCheck', key: 'assessment_group',
      children: [
        { label: 'Exam',        href: '/dashboard/exam',           icon: 'ClipboardCheck', key: 'exam' },
        { label: 'Performance', href: '/dashboard/performance',    icon: 'TrendingUp',     key: 'performance' },
        { label: 'Courses',     href: '/dashboard/courses/manage', icon: 'BookOpen',       key: 'courses' },
      ],
    },
    { label: 'School Inventory',     href: '/dashboard/school-inventory',      icon: 'Archive',       key: 'school_inventory' },
    { label: 'Letter Templates',     href: '/dashboard/letter-templates',      icon: 'FileTemplate',  key: 'letter_templates' },
    { label: 'Queries',              href: '/dashboard/queries',               icon: 'MessageSquare', key: 'queries' },
    { label: 'Transport',            href: '/dashboard/transport',             icon: 'Bus',           key: 'transport' },
    { label: 'Career Sessions',      href: '/dashboard/career-sessions/manage', icon: 'Briefcase',   key: 'sessions' },
    { label: 'Vendor / Marketplace', href: '/dashboard/vendor/manage',          icon: 'ShoppingBag', key: 'vendor' },
    { label: 'Compliance',           href: '/dashboard/compliance',            icon: 'ShieldCheck',   key: 'compliance' },
    { label: 'Reports',              href: '/dashboard/reports',               icon: 'BarChart',      key: 'reports' },
    { label: 'Profile',              href: '/dashboard/settings',              icon: 'UserCircle',    key: 'settings' },
  ],
  teacher: [
    { label: 'Dashboard', href: '/dashboard',          icon: 'LayoutDashboard', key: 'dashboard' },
    {
      label: 'Attendance', href: '', icon: 'CalendarCheck', key: 'attendance_group',
      children: [
        { label: 'Attendance', href: '/dashboard/attendance', icon: 'CalendarCheck', key: 'attendance' },
        { label: 'Leave',      href: '/dashboard/leave',      icon: 'Calendar',      key: 'leave' },
      ],
    },
    { label: 'Homework', href: '/dashboard/homework', icon: 'BookOpen', key: 'homework' },
    {
      label: 'Academic', href: '', icon: 'CalendarDays', key: 'academic_group',
      children: [
        { label: 'Timetable',      href: '/dashboard/timetable',      icon: 'CalendarList', key: 'timetable' },
        { label: 'Syllabus',       href: '/dashboard/syllabus',       icon: 'BookMarked',   key: 'syllabus' },
        { label: 'Online Classes', href: '/dashboard/online-classes', icon: 'Monitor',      key: 'online_classes' },
      ],
    },
    {
      label: 'Assessment', href: '', icon: 'ClipboardCheck', key: 'assessment_group',
      children: [
        { label: 'Performance', href: '/dashboard/performance',    icon: 'TrendingUp',     key: 'performance' },
        { label: 'Exam',        href: '/dashboard/exam',           icon: 'ClipboardCheck', key: 'exam' },
        { label: 'Courses',     href: '/dashboard/courses/manage', icon: 'BookOpen',       key: 'courses' },
      ],
    },
    { label: 'Events',  href: '/dashboard/events',   icon: 'CalendarStar',  key: 'events' },
    { label: 'Queries', href: '/dashboard/queries',  icon: 'MessageSquare', key: 'queries' },
    { label: 'Profile', href: '/dashboard/settings', icon: 'UserCircle',    key: 'settings' },
  ],
  student: [
    { label: 'Dashboard',  href: '/dashboard',            icon: 'LayoutDashboard', key: 'dashboard' },
    { label: 'Attendance', href: '/dashboard/attendance', icon: 'CalendarCheck',   key: 'attendance' },
    { label: 'Fees',       href: '/dashboard/fees',       icon: 'CreditCard',      key: 'fees' },
    { label: 'Homework',   href: '/dashboard/homework',   icon: 'BookOpen',        key: 'homework' },
    {
      label: 'Academic', href: '', icon: 'CalendarDays', key: 'academic_group',
      children: [
        { label: 'Timetable',      href: '/dashboard/timetable',      icon: 'CalendarList', key: 'timetable' },
        { label: 'Syllabus',       href: '/dashboard/syllabus',       icon: 'BookMarked',   key: 'syllabus' },
        { label: 'Online Classes', href: '/dashboard/online-classes', icon: 'Monitor',      key: 'online_classes' },
      ],
    },
    {
      label: 'Assessment', href: '', icon: 'ClipboardCheck', key: 'assessment_group',
      children: [
        { label: 'Exam Schedule', href: '/dashboard/exam',     icon: 'ClipboardCheck', key: 'exam' },
        { label: 'Courses',       href: '/dashboard/courses',  icon: 'BookOpen',       key: 'courses' },
      ],
    },
    {
      label: 'Events', href: '', icon: 'CalendarStar', key: 'events_group',
      children: [
        { label: 'Events',        href: '/dashboard/events',        icon: 'CalendarStar', key: 'events' },
        { label: 'Announcements', href: '/dashboard/announcements', icon: 'Megaphone',    key: 'announcements' },
      ],
    },
    { label: 'Queries', href: '/dashboard/queries', icon: 'MessageSquare', key: 'queries' },
  ],
  parent: [
    { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard', key: 'dashboard' },
    {
      label: 'Admissions', href: '', icon: 'ClipboardList', key: 'admissions_group',
      children: [
        { label: 'Admissions', href: '/dashboard/admissions', icon: 'ClipboardList', key: 'admissions' },
        { label: 'Fees',       href: '/dashboard/fees',       icon: 'CreditCard',    key: 'fees' },
      ],
    },
    {
      label: 'Attendance', href: '', icon: 'CalendarCheck', key: 'attendance_group',
      children: [
        { label: 'Attendance', href: '/dashboard/attendance', icon: 'CalendarCheck', key: 'attendance' },
        { label: 'Leave',      href: '/dashboard/leave',      icon: 'Calendar',      key: 'leave' },
      ],
    },
    { label: 'Homework', href: '/dashboard/homework', icon: 'BookOpen', key: 'homework' },
    {
      label: 'Academic', href: '', icon: 'CalendarDays', key: 'academic_group',
      children: [
        { label: 'Timetable',      href: '/dashboard/timetable',      icon: 'CalendarList', key: 'timetable' },
        { label: 'Syllabus',       href: '/dashboard/syllabus',       icon: 'BookMarked',   key: 'syllabus' },
        { label: 'Online Classes', href: '/dashboard/online-classes', icon: 'Monitor',      key: 'online_classes' },
      ],
    },
    {
      label: 'Assessment', href: '', icon: 'ClipboardCheck', key: 'assessment_group',
      children: [
        { label: 'Exam Schedule', href: '/dashboard/exam',        icon: 'ClipboardCheck', key: 'exam' },
        { label: 'Performance',   href: '/dashboard/performance', icon: 'TrendingUp',     key: 'performance' },
        { label: 'Courses',       href: '/dashboard/courses',     icon: 'BookOpen',       key: 'courses' },
      ],
    },
    {
      label: 'Events', href: '', icon: 'CalendarStar', key: 'events_group',
      children: [
        { label: 'Events',        href: '/dashboard/events',        icon: 'CalendarStar', key: 'events' },
        { label: 'Announcements', href: '/dashboard/announcements', icon: 'Megaphone',    key: 'announcements' },
      ],
    },
    { label: 'Queries',              href: '/dashboard/queries',         icon: 'MessageSquare', key: 'queries' },
    { label: 'Career Sessions',      href: '/dashboard/career-sessions', icon: 'Briefcase',     key: 'sessions' },
    { label: 'Vendor / Marketplace', href: '/dashboard/vendor',          icon: 'ShoppingBag',   key: 'vendor' },
    { label: 'Transport',            href: '/dashboard/transport',       icon: 'Bus',           key: 'transport' },
  ],
  hod: [
    { label: 'Dashboard',  href: '/dashboard',            icon: 'LayoutDashboard', key: 'dashboard' },
    { label: 'Students',   href: '/dashboard/students',   icon: 'Users',           key: 'students' },
    { label: 'Teachers',   href: '/dashboard/teachers',   icon: 'GraduationCap',   key: 'teachers' },
    { label: 'Classes',  href: '/dashboard/classes',  icon: 'LayoutGrid', key: 'classes' },
    {
      label: 'Attendance', href: '', icon: 'CalendarCheck', key: 'attendance_group',
      children: [
        { label: 'Attendance', href: '/dashboard/attendance', icon: 'CalendarCheck', key: 'attendance' },
        { label: 'Leave',      href: '/dashboard/leave',      icon: 'Calendar',      key: 'leave' },
      ],
    },
    { label: 'Homework', href: '/dashboard/homework', icon: 'BookOpen', key: 'homework' },
    {
      label: 'Academic', href: '', icon: 'CalendarDays', key: 'academic_group',
      children: [
        { label: 'Syllabus',       href: '/dashboard/syllabus',       icon: 'BookMarked', key: 'syllabus' },
        { label: 'Online Classes', href: '/dashboard/online-classes', icon: 'Monitor',    key: 'online_classes' },
      ],
    },
    {
      label: 'Assessment', href: '', icon: 'ClipboardCheck', key: 'assessment_group',
      children: [
        { label: 'Exam',        href: '/dashboard/exam',        icon: 'ClipboardCheck', key: 'exam' },
        { label: 'Performance', href: '/dashboard/performance', icon: 'TrendingUp',     key: 'performance' },
      ],
    },
    {
      label: 'Events', href: '', icon: 'CalendarStar', key: 'events_group',
      children: [
        { label: 'Events',        href: '/dashboard/events',        icon: 'CalendarStar', key: 'events' },
        { label: 'Announcements', href: '/dashboard/announcements', icon: 'Megaphone',    key: 'announcements' },
      ],
    },
    { label: 'Queries', href: '/dashboard/queries',  icon: 'MessageSquare', key: 'queries' },
    { label: 'Reports', href: '/dashboard/reports',  icon: 'BarChart',      key: 'reports' },
    { label: 'Profile', href: '/dashboard/settings', icon: 'UserCircle',    key: 'settings' },
  ],
  principal: [
    { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard', key: 'dashboard' },
    {
      label: 'Admissions', href: '', icon: 'ClipboardList', key: 'admissions_group',
      children: [
        { label: 'Admissions', href: '/dashboard/admissions', icon: 'ClipboardList', key: 'admissions' },
        { label: 'Fees',       href: '/dashboard/fees',       icon: 'CreditCard',    key: 'fees' },
      ],
    },
    { label: 'Classes',  href: '/dashboard/classes',  icon: 'LayoutGrid',      key: 'classes' },
    { label: 'Students', href: '/dashboard/students', icon: 'Users',           key: 'students' },
    { label: 'Teachers', href: '/dashboard/teachers', icon: 'GraduationCap',   key: 'teachers' },
    {
      label: 'Attendance', href: '', icon: 'CalendarCheck', key: 'attendance_group',
      children: [
        { label: 'Attendance', href: '/dashboard/attendance', icon: 'CalendarCheck', key: 'attendance' },
        { label: 'Leave',      href: '/dashboard/leave',      icon: 'Calendar',      key: 'leave' },
      ],
    },
    {
      label: 'Academic', href: '', icon: 'CalendarDays', key: 'academic_group',
      children: [
        { label: 'Syllabus',       href: '/dashboard/syllabus',       icon: 'BookMarked', key: 'syllabus' },
        { label: 'Online Classes', href: '/dashboard/online-classes', icon: 'Monitor',    key: 'online_classes' },
      ],
    },
    {
      label: 'Events', href: '', icon: 'CalendarStar', key: 'events_group',
      children: [
        { label: 'Events',        href: '/dashboard/events',        icon: 'CalendarStar', key: 'events' },
        { label: 'Announcements', href: '/dashboard/announcements', icon: 'Megaphone',    key: 'announcements' },
      ],
    },
    {
      label: 'Assessment', href: '', icon: 'ClipboardCheck', key: 'assessment_group',
      children: [
        { label: 'Exam',    href: '/dashboard/exam',           icon: 'ClipboardCheck', key: 'exam' },
        { label: 'Courses', href: '/dashboard/courses/manage', icon: 'BookOpen',       key: 'courses' },
      ],
    },
    { label: 'School Inventory', href: '/dashboard/school-inventory',      icon: 'Archive',       key: 'school_inventory' },
    { label: 'Letter Templates', href: '/dashboard/letter-templates',      icon: 'FileTemplate',  key: 'letter_templates' },
    { label: 'Queries',          href: '/dashboard/queries',               icon: 'MessageSquare', key: 'queries' },
    { label: 'Transport',        href: '/dashboard/transport',             icon: 'Bus',           key: 'transport' },
    { label: 'Career Sessions',  href: '/dashboard/career-sessions/manage', icon: 'Briefcase',   key: 'sessions' },
    { label: 'Compliance',       href: '/dashboard/compliance',            icon: 'ShieldCheck',   key: 'compliance' },
    { label: 'Reports',          href: '/dashboard/reports',               icon: 'BarChart',      key: 'reports' },
    { label: 'Profile',          href: '/dashboard/settings',              icon: 'UserCircle',    key: 'settings' },
  ],
  employee: [
    { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard', key: 'dashboard' },
    {
      label: 'Attendance', href: '', icon: 'CalendarCheck', key: 'attendance_group',
      children: [
        { label: 'Attendance', href: '/dashboard/attendance', icon: 'CalendarCheck', key: 'attendance' },
        { label: 'Leave',      href: '/dashboard/leave',      icon: 'Calendar',      key: 'leave' },
      ],
    },
    { label: 'Queries', href: '/dashboard/queries',  icon: 'MessageSquare', key: 'queries' },
    { label: 'Profile', href: '/dashboard/settings', icon: 'UserCircle',    key: 'settings' },
  ],
  vendor: [
    { label: 'Dashboard',   href: '/dashboard',                 icon: 'LayoutDashboard', key: 'dashboard' },
    { label: 'Products',    href: '/dashboard/vendor/products', icon: 'ShoppingBag',     key: 'products' },
    { label: 'Orders',      href: '/dashboard/vendor/orders',   icon: 'Package',         key: 'orders' },
    { label: 'Ratings',     href: '/dashboard/vendor/ratings',  icon: 'Star',            key: 'ratings' },
    { label: 'My Contract', href: '/dashboard/contracts',       icon: 'FileText',        key: 'contracts' },
    { label: 'Profile',     href: '/dashboard/settings',        icon: 'UserCircle',      key: 'settings' },
  ],
  consultant: [
    { label: 'Dashboard',    href: '/dashboard',                         icon: 'LayoutDashboard', key: 'dashboard' },
    { label: 'Sessions',     href: '/dashboard/consultant/sessions',     icon: 'Briefcase',       key: 'sessions' },
    { label: 'Availability', href: '/dashboard/consultant/availability', icon: 'CalendarDays',    key: 'availability' },
    { label: 'Bookings',     href: '/dashboard/consultant/bookings',     icon: 'CalendarCheck',   key: 'bookings' },
    { label: 'My Contract',  href: '/dashboard/contracts',               icon: 'FileText',        key: 'contracts' },
    { label: 'Profile',      href: '/dashboard/settings',                icon: 'UserCircle',      key: 'settings' },
  ],
};

/** Returns all keys for a role in their default order (groups before their children). */
export function getDefaultOrderedKeys(role: string): string[] {
  const items = menuItems[role] ?? [];
  const keys: string[] = [];
  let order = 0;
  for (const item of items) {
    keys.push(item.key);
    order++;
    if (item.children) {
      for (const child of item.children) {
        keys.push(child.key);
        order++;
      }
    }
  }
  return keys;
}
