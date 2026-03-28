'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface MenuItem {
  label: string;
  href: string;
  icon: string;
  key: string;   // matches the menuKey stored in MenuPermission table
}

// All possible menu items per role — key is used for permission lookup
const menuItems: Record<string, MenuItem[]> = {
  super_admin: [
    { label: 'School Library',          href: '/dashboard/schools',         icon: 'Building',        key: 'schools' },
    { label: 'Default School Settings', href: '/dashboard/schools/default', icon: 'Settings',        key: 'schools_default' },
  ],
  school_admin: [
    { label: 'Dashboard',      href: '/dashboard',               icon: 'LayoutDashboard', key: 'dashboard' },
    { label: 'Admissions',     href: '/dashboard/admissions',    icon: 'ClipboardList',   key: 'admissions' },
    { label: 'Classes',        href: '/dashboard/classes',       icon: 'LayoutGrid',      key: 'classes' },
    { label: 'Students',       href: '/dashboard/students',      icon: 'Users',           key: 'students' },
    { label: 'Teachers',       href: '/dashboard/teachers',      icon: 'GraduationCap',   key: 'teachers' },
    { label: 'Parents',        href: '/dashboard/parents',       icon: 'Heart',           key: 'parents' },
    { label: 'Attendance',     href: '/dashboard/attendance',    icon: 'CalendarCheck',   key: 'attendance' },
    { label: 'Fees',           href: '/dashboard/fees',          icon: 'CreditCard',      key: 'fees' },
    { label: 'Scheduling',     href: '/dashboard/scheduling',    icon: 'CalendarDays',    key: 'scheduling' },
    { label: 'Announcements',  href: '/dashboard/announcements', icon: 'Megaphone',       key: 'announcements' },
    { label: 'Leave',          href: '/dashboard/leave',         icon: 'Calendar',        key: 'leave' },
    { label: 'Queries',        href: '/dashboard/queries',       icon: 'MessageSquare',   key: 'queries' },
    { label: 'Transport',      href: '/dashboard/transport',     icon: 'Bus',             key: 'transport' },
    { label: 'Compliance',     href: '/dashboard/compliance',    icon: 'ShieldCheck',     key: 'compliance' },
    { label: 'Reports',        href: '/dashboard/reports',       icon: 'BarChart',        key: 'reports' },
    { label: 'Profile',        href: '/dashboard/settings',      icon: 'UserCircle',      key: 'settings' },
  ],
  teacher: [
    { label: 'Dashboard',      href: '/dashboard',               icon: 'LayoutDashboard', key: 'dashboard' },
    { label: 'Attendance',     href: '/dashboard/attendance',    icon: 'CalendarCheck',   key: 'attendance' },
    { label: 'Performance',    href: '/dashboard/performance',   icon: 'TrendingUp',      key: 'performance' },
    { label: 'Homework',       href: '/dashboard/homework',      icon: 'BookOpen',        key: 'homework' },
    { label: 'Leave',          href: '/dashboard/leave',         icon: 'Calendar',        key: 'leave' },
    { label: 'Queries',        href: '/dashboard/queries',       icon: 'MessageSquare',   key: 'queries' },
    { label: 'Profile',        href: '/dashboard/settings',      icon: 'UserCircle',      key: 'settings' },
  ],
  student: [
    { label: 'Dashboard',      href: '/dashboard',               icon: 'LayoutDashboard', key: 'dashboard' },
    { label: 'Attendance',     href: '/dashboard/attendance',    icon: 'CalendarCheck',   key: 'attendance' },
    { label: 'Fees',           href: '/dashboard/fees',          icon: 'CreditCard',      key: 'fees' },
    { label: 'Homework',       href: '/dashboard/homework',      icon: 'BookOpen',        key: 'homework' },
    { label: 'Announcements',  href: '/dashboard/announcements', icon: 'Megaphone',       key: 'announcements' },
    { label: 'Queries',        href: '/dashboard/queries',       icon: 'MessageSquare',   key: 'queries' },
  ],
  parent: [
    { label: 'Dashboard',       href: '/dashboard',                icon: 'LayoutDashboard', key: 'dashboard' },
    { label: 'Attendance',      href: '/dashboard/attendance',     icon: 'CalendarCheck',   key: 'attendance' },
    { label: 'Fees',            href: '/dashboard/fees',           icon: 'CreditCard',      key: 'fees' },
    { label: 'Performance',     href: '/dashboard/performance',    icon: 'TrendingUp',      key: 'performance' },
    { label: 'Homework',        href: '/dashboard/homework',       icon: 'BookOpen',        key: 'homework' },
    { label: 'Announcements',   href: '/dashboard/announcements',  icon: 'Megaphone',       key: 'announcements' },
    { label: 'Leave',           href: '/dashboard/leave',          icon: 'Calendar',        key: 'leave' },
    { label: 'Queries',         href: '/dashboard/queries',        icon: 'MessageSquare',   key: 'queries' },
    { label: 'Career Sessions', href: '/dashboard/sessions',       icon: 'Briefcase',       key: 'sessions' },
    { label: 'Online Classes',  href: '/dashboard/online-classes', icon: 'Monitor',         key: 'online_classes' },
    { label: 'Transport',       href: '/dashboard/transport',      icon: 'Bus',             key: 'transport' },
  ],
  // HOD and Principal use school_admin items but filtered by their own permissions
  hod: [
    { label: 'Dashboard',      href: '/dashboard',               icon: 'LayoutDashboard', key: 'dashboard' },
    { label: 'Students',       href: '/dashboard/students',      icon: 'Users',           key: 'students' },
    { label: 'Teachers',       href: '/dashboard/teachers',      icon: 'GraduationCap',   key: 'teachers' },
    { label: 'Classes',        href: '/dashboard/classes',       icon: 'LayoutGrid',      key: 'classes' },
    { label: 'Attendance',     href: '/dashboard/attendance',    icon: 'CalendarCheck',   key: 'attendance' },
    { label: 'Homework',       href: '/dashboard/homework',      icon: 'BookOpen',        key: 'homework' },
    { label: 'Performance',    href: '/dashboard/performance',   icon: 'TrendingUp',      key: 'performance' },
    { label: 'Announcements',  href: '/dashboard/announcements', icon: 'Megaphone',       key: 'announcements' },
    { label: 'Leave',          href: '/dashboard/leave',         icon: 'Calendar',        key: 'leave' },
    { label: 'Queries',        href: '/dashboard/queries',       icon: 'MessageSquare',   key: 'queries' },
    { label: 'Reports',        href: '/dashboard/reports',       icon: 'BarChart',        key: 'reports' },
    { label: 'Profile',        href: '/dashboard/settings',      icon: 'UserCircle',      key: 'settings' },
  ],
  principal: [
    { label: 'Dashboard',      href: '/dashboard',               icon: 'LayoutDashboard', key: 'dashboard' },
    { label: 'Admissions',     href: '/dashboard/admissions',    icon: 'ClipboardList',   key: 'admissions' },
    { label: 'Classes',        href: '/dashboard/classes',       icon: 'LayoutGrid',      key: 'classes' },
    { label: 'Students',       href: '/dashboard/students',      icon: 'Users',           key: 'students' },
    { label: 'Teachers',       href: '/dashboard/teachers',      icon: 'GraduationCap',   key: 'teachers' },
    { label: 'Attendance',     href: '/dashboard/attendance',    icon: 'CalendarCheck',   key: 'attendance' },
    { label: 'Fees',           href: '/dashboard/fees',          icon: 'CreditCard',      key: 'fees' },
    { label: 'Announcements',  href: '/dashboard/announcements', icon: 'Megaphone',       key: 'announcements' },
    { label: 'Leave',          href: '/dashboard/leave',         icon: 'Calendar',        key: 'leave' },
    { label: 'Queries',        href: '/dashboard/queries',       icon: 'MessageSquare',   key: 'queries' },
    { label: 'Transport',      href: '/dashboard/transport',     icon: 'Bus',             key: 'transport' },
    { label: 'Compliance',     href: '/dashboard/compliance',    icon: 'ShieldCheck',     key: 'compliance' },
    { label: 'Reports',        href: '/dashboard/reports',       icon: 'BarChart',        key: 'reports' },
    { label: 'Profile',        href: '/dashboard/settings',      icon: 'UserCircle',      key: 'settings' },
  ],
  employee: [
    { label: 'Dashboard',      href: '/dashboard',               icon: 'LayoutDashboard', key: 'dashboard' },
    { label: 'Attendance',     href: '/dashboard/attendance',    icon: 'CalendarCheck',   key: 'attendance' },
    { label: 'Leave',          href: '/dashboard/leave',         icon: 'Calendar',        key: 'leave' },
    { label: 'Queries',        href: '/dashboard/queries',       icon: 'MessageSquare',   key: 'queries' },
    { label: 'Profile',        href: '/dashboard/settings',      icon: 'UserCircle',      key: 'settings' },
  ],
  vendor: [
    { label: 'Dashboard', href: '/dashboard',           icon: 'LayoutDashboard', key: 'dashboard' },
    { label: 'Inventory', href: '/dashboard/inventory', icon: 'ShoppingBag',     key: 'inventory' },
  ],
  consultant: [
    { label: 'Dashboard',       href: '/dashboard',           icon: 'LayoutDashboard', key: 'dashboard' },
    { label: 'Career Sessions', href: '/dashboard/sessions',  icon: 'Briefcase',       key: 'sessions' },
    { label: 'My Contract',     href: '/dashboard/contracts', icon: 'FileText',        key: 'contracts' },
  ],
};

const icons: Record<string, React.ReactNode> = {
  ClipboardList: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1"/>
      <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
    </svg>
  ),
  LayoutGrid: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3h7v5H3zM14 3h7v5h-7zM14 10h7v11h-7zM3 10h7v11H3z"/>
    </svg>
  ),
  LayoutDashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  Users: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  GraduationCap: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
    </svg>
  ),
  CalendarCheck: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
      <path d="m9 16 2 2 4-4"/>
    </svg>
  ),
  CreditCard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  BookOpen: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  ),
  Megaphone: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 11 18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
    </svg>
  ),
  Calendar: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  ),
  MessageSquare: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  Settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
    </svg>
  ),
  ShoppingBag: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  ),
  Briefcase: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
    </svg>
  ),
  FileText: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14,2 14,8 20,8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  Building: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M9 22V12h6v10M3 9h18M9 3v6M15 3v6"/>
    </svg>
  ),
  UserCog: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4"/>
      <circle cx="19" cy="19" r="2"/>
      <path d="M19 15v2M19 21v2M15.5 17.27l1.73 1M20.77 15.73l1.73 1M15.5 20.73l1.73-1M20.77 22.27l1.73-1"/>
    </svg>
  ),
  ShieldCheck: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  ),
  BarChart: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  ),
  CalendarDays: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
      <circle cx="8" cy="15" r="1" fill="currentColor"/><circle cx="12" cy="15" r="1" fill="currentColor"/>
      <circle cx="16" cy="15" r="1" fill="currentColor"/>
    </svg>
  ),
  Monitor: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
    </svg>
  ),
  Bus: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6v6M15 6v6M2 12h19.6M18 18h2a1 1 0 0 0 1-1v-5H3v5a1 1 0 0 0 1 1h2"/>
      <path d="M4 12V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5"/>
      <circle cx="7" cy="18" r="1"/><circle cx="17" cy="18" r="1"/>
    </svg>
  ),
  TrendingUp: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/>
      <polyline points="17,6 23,6 23,12"/>
    </svg>
  ),
  Heart: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  UserCircle: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="10" r="3"/>
      <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/>
    </svg>
  ),
};

interface SidebarProps {
  user: any;
  collapsed: boolean;
  onToggle: () => void;
}

const roleLabels: Record<string, string> = {
  super_admin:  'Super Admin',
  school_admin: 'School Admin',
  teacher:      'Teacher',
  parent:       'Parent',
  student:      'Student',
  hod:          'Head of Department',
  principal:    'Principal',
  employee:     'Employee',
  vendor:       'Vendor',
  consultant:   'Consultant',
};

export default function Sidebar({ user, collapsed }: SidebarProps) {
  const pathname = usePathname();
  const role  = user?.primaryRole || 'school_admin';
  const items = menuItems[role] || menuItems.school_admin;

  const [allowedKeys, setAllowedKeys] = useState<string[] | null>(null);

  // Clear any previously-cached stale permission keys on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      Object.keys(sessionStorage)
        .filter(k => k.startsWith('menu_perms_'))
        .forEach(k => sessionStorage.removeItem(k));
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // super_admin menu is not school-specific, skip permission filtering
    if (role === 'super_admin') { setAllowedKeys(null); return; }
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch('/api/menu-permissions', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setAllowedKeys(Array.isArray(d.menuKeys) ? d.menuKeys : null); })
      .catch(() => setAllowedKeys(null));
  }, [role]);

  // null = no filter applied (fallback: show all items)
  const visibleItems = allowedKeys === null
    ? items
    : items.filter(item => allowedKeys.includes(item.key));

  return (
    <aside
      className={`
        fixed top-0 left-0 h-screen z-30
        bg-white dark:bg-gray-950
        border-r border-surface-200 dark:border-gray-800
        transition-all duration-300
        ${collapsed ? 'w-[68px]' : 'w-[240px]'}
      `}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-surface-100 dark:border-gray-800">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white flex-shrink-0 shadow-glow-brand">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
          </div>
          {!collapsed && (
            <span className="font-display font-bold text-lg text-brand-800 dark:text-brand-300 whitespace-nowrap">
              Yulaa
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav
        className="p-3 space-y-0.5 overflow-y-auto"
        style={{ height: 'calc(100vh - 64px - 80px)' }}
      >
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : ''}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-150
                ${isActive
                  ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400'
                  : 'text-surface-500 dark:text-gray-500 hover:bg-surface-50 dark:hover:bg-gray-800/60 hover:text-gray-700 dark:hover:text-gray-300'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              <span className={`flex-shrink-0 ${isActive ? 'text-brand-500 dark:text-brand-400' : ''}`}>
                {icons[item.icon]}
              </span>
              {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-surface-100 dark:border-gray-800">
        <div className={`flex items-center gap-2.5 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-950 flex items-center justify-center text-brand-600 dark:text-brand-400 text-xs font-bold flex-shrink-0">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-surface-400 dark:text-gray-600 truncate">
                {roleLabels[role] || role}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
