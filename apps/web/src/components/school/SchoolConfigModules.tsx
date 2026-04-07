'use client';

import { useRouter } from 'next/navigation';

interface ConfigModule {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  href?: string;
  status?: 'available' | 'coming_soon';
}

const makeModules = (schoolId: string): ConfigModule[] => [
  {
    id: 'masters',
    label: 'Masters',
    description: 'Configure master data: gender types, blood groups, qualifications, exam types, leave types, and more.',
    color: 'bg-slate-50 dark:bg-slate-950/50 text-slate-600 dark:text-slate-400',
    href: `/dashboard/masters?schoolId=${schoolId}`,
    status: 'available',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  },
  {
    id: 'users-roles',
    label: 'Users & Roles',
    description: 'Assign roles, create custom roles, manage access permissions for this school.',
    color: 'bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400',
    href: `/dashboard/schools/${schoolId}/users-roles`,
    status: 'available',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    id: 'menu-permissions',
    label: 'Menu Permissions',
    description: 'Control menu visibility and action-level permissions (view/edit/approve/export) per role.',
    color: 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400',
    href: `/dashboard/schools/${schoolId}/menu-permissions`,
    status: 'available',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="15" y2="18"/></svg>,
  },
  {
    id: 'workflow',
    label: 'Workflow Configuration',
    description: 'Configure multi-level approval workflows for Leave, Queries, and Admissions.',
    color: 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400',
    href: `/dashboard/schools/${schoolId}/workflow`,
    status: 'available',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  },
  {
    id: 'form-config',
    label: 'Form Configuration',
    description: 'Set field-level rules (mandatory/optional/visible/hidden) for all school forms.',
    color: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400',
    href: `/dashboard/schools/${schoolId}/form-config`,
    status: 'available',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 13h4"/></svg>,
  },
  {
    id: 'classes',
    label: 'Classes',
    description: 'Create and manage class structures, sections, capacity, and academic year settings.',
    color: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400',
    href: `/dashboard/schools/${schoolId}/classes`,
    status: 'available',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  },
  {
    id: 'students',
    label: 'Student Management',
    description: 'Onboard students, manage status, view academic history, and handle year-wise profiles.',
    color: 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400',
    href: `/dashboard/schools/${schoolId}/students`,
    status: 'available',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
  },
  {
    id: 'teachers',
    label: 'Teacher Management',
    description: 'Create teacher profiles, assign subjects, manage roles and qualifications.',
    color: 'bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400',
    href: `/dashboard/schools/${schoolId}/teachers`,
    status: 'available',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    id: 'parents',
    label: 'Parent Management',
    description: 'Register parents, link them to students, and manage parent accounts via CSV upload.',
    color: 'bg-pink-50 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400',
    href: `/dashboard/schools/${schoolId}/parents`,
    status: 'available',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  },
  {
    id: 'attendance',
    label: 'Attendance Configuration',
    description: 'Configure attendance types (class/daily/card/face recognition) per role. Hardware integration settings.',
    color: 'bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400',
    href: `/dashboard/schools/${schoolId}/attendance`,
    status: 'available',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="m9 16 2 2 4-4"/></svg>,
  },
  {
    id: 'fees',
    label: 'Fees & Payments',
    description: 'Configure fee structures, Razorpay gateway, installments, penalties, and payment rules.',
    color: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400',
    href: `/dashboard/schools/${schoolId}/fees`,
    status: 'available',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  },
  {
    id: 'homework',
    label: 'Homework',
    description: 'Configure subject-wise homework rules, teacher permissions, and student visibility.',
    color: 'bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400',
    href: `/dashboard/schools/${schoolId}/homework`,
    status: 'available',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  },
  {
    id: 'transport',
    label: 'Transport',
    description: 'Configure routes, GPS integration, pickup/drop mapping, and emergency overrides.',
    color: 'bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400',
    href: `/dashboard/schools/${schoolId}/transport`,
    status: 'available',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6v6M15 6v6M2 12h19.6M18 18h2a1 1 0 0 0 1-1v-5H3v5a1 1 0 0 0 1 1h2"/><path d="M4 12V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5"/><circle cx="7" cy="18" r="1"/><circle cx="17" cy="18" r="1"/></svg>,
  },
  {
    id: 'announcements',
    label: 'Announcements',
    description: 'Configure role/class-based broadcast rules, scheduled announcements, and mandatory expiry dates.',
    color: 'bg-pink-50 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400',
    href: `/dashboard/announcements`,
    status: 'available',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>,
  },
  {
    id: 'leave',
    label: 'Leave Management',
    description: 'Upload holiday calendar, configure leave entitlement per role, and set approval flows.',
    color: 'bg-lime-50 dark:bg-lime-950/50 text-lime-600 dark:text-lime-400',
    href: `/dashboard/schools/${schoolId}/leave`,
    status: 'available',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  },
  {
    id: 'queries',
    label: 'Queries',
    description: 'Configure query categories, auto-routing, SLA rules, and escalation policies.',
    color: 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400',
    href: `/dashboard/queries`,
    status: 'available',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 21 1.9-5.7A8.5 8.5 0 1 1 5.8 17.8z"/></svg>,
  },
  {
    id: 'compliance',
    label: 'Compliance',
    description: 'Configure board-wise report templates, data freeze windows, and audit-ready snapshots.',
    color: 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400',
    href: `/dashboard/compliance`,
    status: 'available',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  },
  {
    id: 'reports',
    label: 'Reports',
    description: 'Create custom Excel reports, schedule exports, and manage row-level access control.',
    color: 'bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400',
    href: `/dashboard/reports`,
    status: 'available',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  },
  {
    id: 'performance',
    label: 'Performance Management',
    description: 'Configure monthly, mid-term, and year-end evaluation logic with weightage-based scoring.',
    color: 'bg-green-50 dark:bg-green-950/50 text-green-600 dark:text-green-400',
    href: `/dashboard/performance`,
    status: 'available',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/><polyline points="17,6 23,6 23,12"/></svg>,
  },
  {
    id: 'year-cycle',
    label: 'Academic Year Cycle',
    description: 'Create academic cycles, promote students class-to-class, manage year transitions with approval flow.',
    color: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400',
    href: `/dashboard/schools/${schoolId}/year-cycle`,
    status: 'available',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>,
  },
  {
    id: 'scheduling',
    label: 'Scheduling',
    description: 'Upload timetables by class, section, and subject. Assign teachers to subjects per section.',
    color: 'bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400',
    href: `/dashboard/schools/${schoolId}/timetable`,
    status: 'available',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/></svg>,
  },
  {
    id: 'admissions',
    label: 'Admissions',
    description: 'Configure admission forms, approval workflow, and public portal settings.',
    color: 'bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400',
    href: `/dashboard/admissions`,
    status: 'available',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>,
  },
];

export default function SchoolConfigModules({ schoolId, isDefault }: { schoolId: string; isDefault?: boolean }) {
  const router = useRouter();
  const modules = makeModules(schoolId);

  const available   = modules.filter(m => m.status !== 'coming_soon');
  const comingSoon  = modules.filter(m => m.status === 'coming_soon');

  return (
    <div className="space-y-6">
      {/* Available Modules */}
      <div>
        <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-4">Configuration Modules</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {available.map(mod => (
            <button
              key={mod.id}
              onClick={() => mod.href && router.push(mod.href)}
              className="card p-5 text-left group hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${mod.color} group-hover:scale-110 transition-transform`}>
                  {mod.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      {mod.label}
                    </h3>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-surface-300 dark:text-gray-600 group-hover:text-brand-400 transition-colors flex-shrink-0">
                      <polyline points="9,18 15,12 9,6"/>
                    </svg>
                  </div>
                  <p className="text-xs text-surface-400 dark:text-gray-500 mt-1 leading-relaxed line-clamp-2">{mod.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Coming Soon */}
      {comingSoon.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-4">Coming Soon</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {comingSoon.map(mod => (
              <div key={mod.id} className="card p-5 opacity-60 cursor-not-allowed">
                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-surface-100 dark:bg-gray-800 text-surface-300 dark:text-gray-600`}>
                    {mod.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-500">{mod.label}</h3>
                      <span className="text-[10px] bg-surface-100 dark:bg-gray-800 text-surface-400 dark:text-gray-500 px-1.5 py-0.5 rounded font-medium">Soon</span>
                    </div>
                    <p className="text-xs text-surface-300 dark:text-gray-600 mt-1 leading-relaxed line-clamp-2">{mod.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
