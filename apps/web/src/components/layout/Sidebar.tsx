'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { menuItems, type MenuItem } from '@/lib/menuConfig';

const icons: Record<string, React.ReactNode> = {
  Database: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
    </svg>
  ),
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
  Package: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
      <path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
    </svg>
  ),
  Star: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
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
  CalendarStar: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
      <path d="m12 13 1 2.5 2.5.5-1.8 1.7.4 2.5L12 19l-2.1 1.2.4-2.5L8.5 16l2.5-.5z"/>
    </svg>
  ),
  CalendarList: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
      <line x1="8" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="12" y2="18"/>
    </svg>
  ),
  BookMarked: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      <polyline points="10,2 10,9 13,6.5 16,9 16,2"/>
    </svg>
  ),
  ClipboardCheck: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1"/>
      <path d="m9 14 2 2 4-4"/>
    </svg>
  ),
  Archive: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5" rx="1"/>
      <line x1="10" y1="12" x2="14" y2="12"/>
    </svg>
  ),
  FileTemplate: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14,2 14,8 20,8"/>
      <line x1="8" y1="13" x2="16" y2="13"/>
      <line x1="8" y1="17" x2="13" y2="17"/>
      <circle cx="10" cy="9" r="1" fill="currentColor"/>
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

function sortByOrder(arr: MenuItem[], orderedKeys: string[]): MenuItem[] {
  return [...arr].sort((a, b) => {
    const ai = orderedKeys.indexOf(a.key);
    const bi = orderedKeys.indexOf(b.key);
    return (ai === -1 ? 9999 : ai) - (bi === -1 ? 9999 : bi);
  });
}

export default function Sidebar({ user, collapsed }: SidebarProps) {
  const pathname = usePathname();
  const role  = user?.primaryRole || 'school_admin';
  const items = menuItems[role] || menuItems.school_admin;

  // null = super_admin (no filtering), string[] = ordered enabled keys from DB
  const [allowedKeys, setAllowedKeys] = useState<string[] | null>(
    role === 'super_admin' ? null : []
  );
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      Object.keys(sessionStorage)
        .filter(k => k.startsWith('menu_perms_'))
        .forEach(k => sessionStorage.removeItem(k));
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (role === 'super_admin') { setAllowedKeys(null); return; }
    const token = localStorage.getItem('token');
    if (!token) { setAllowedKeys([]); return; }
    fetch('/api/menu-permissions', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setAllowedKeys(Array.isArray(d.menuKeys) ? d.menuKeys : []); })
      .catch(() => setAllowedKeys([]));
  }, [role]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // Apply stored order (allowedKeys is already sorted by sortOrder from the API)
  const orderedItems = allowedKeys !== null ? sortByOrder(items, allowedKeys) : items;

  const visibleItems = allowedKeys === null
    ? orderedItems
    : orderedItems.filter(item => {
        if (item.children) return item.children.some(c => allowedKeys.includes(c.key));
        return allowedKeys.includes(item.key);
      });

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
          // Group item with collapsible children
          if (item.children) {
            const rawChildren = allowedKeys === null
              ? item.children
              : item.children.filter(c => allowedKeys.includes(c.key));
            const visibleChildren = allowedKeys !== null
              ? sortByOrder(rawChildren, allowedKeys)
              : rawChildren;

            const hasActiveChild = visibleChildren.some(child =>
              pathname === child.href || (child.href !== '/dashboard' && pathname.startsWith(child.href))
            );
            const isExpanded = expandedGroups.includes(item.key) || hasActiveChild;
            return (
              <div key={item.key}>
                <button
                  onClick={() => toggleGroup(item.key)}
                  title={collapsed ? item.label : ''}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                    transition-all duration-150
                    ${hasActiveChild
                      ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400'
                      : 'text-surface-500 dark:text-gray-500 hover:bg-surface-50 dark:hover:bg-gray-800/60 hover:text-gray-700 dark:hover:text-gray-300'
                    }
                    ${collapsed ? 'justify-center' : ''}
                  `}
                >
                  <span className={`flex-shrink-0 ${hasActiveChild ? 'text-brand-500 dark:text-brand-400' : ''}`}>
                    {icons[item.icon]}
                  </span>
                  {!collapsed && (
                    <>
                      <span className="whitespace-nowrap flex-1 text-left">{item.label}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        className={`flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                        <polyline points="6,9 12,15 18,9"/>
                      </svg>
                    </>
                  )}
                </button>
                {isExpanded && !collapsed && (
                  <div className="ml-3 pl-3 border-l border-surface-100 dark:border-gray-800 mt-0.5 space-y-0.5">
                    {visibleChildren.map(child => {
                      const isChildActive = pathname === child.href || (child.href !== '/dashboard' && pathname.startsWith(child.href));
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`
                            flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium
                            transition-all duration-150
                            ${isChildActive
                              ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400'
                              : 'text-surface-500 dark:text-gray-500 hover:bg-surface-50 dark:hover:bg-gray-800/60 hover:text-gray-700 dark:hover:text-gray-300'
                            }
                          `}
                        >
                          <span className={`flex-shrink-0 ${isChildActive ? 'text-brand-500 dark:text-brand-400' : ''}`}>
                            {icons[child.icon]}
                          </span>
                          <span className="whitespace-nowrap">{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // Regular flat item
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
