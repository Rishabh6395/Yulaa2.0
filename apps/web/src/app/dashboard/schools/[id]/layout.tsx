'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15,18 9,12 15,6"/>
    </svg>
  );
}

export default function SchoolLayout({ children, params }: { children: React.ReactNode; params: { id: string } }) {
  const { id } = params;
  const router  = useRouter();
  const pathname = usePathname();
  const [school, setSchool] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem('token');
    fetch(`/api/super-admin/schools?id=${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setSchool(d.school || null))
      .catch((err: unknown) => { if (process.env.NODE_ENV === 'development') console.error('[school-info]', err); });
  }, [id]);

  // Determine current module from pathname
  const segments = pathname.split('/').filter(Boolean);
  const moduleSegment = segments[segments.length - 1];
  const isRoot = moduleSegment === id;

  const moduleLabels: Record<string, string> = {
    'masters': 'Masters',
    'classes': 'Classes',
    'students': 'Students',
    'teachers': 'Teachers',
    'parents': 'Parents',
    'users-roles': 'Users & Roles',
    'attendance': 'Attendance',
    'fees': 'Fees',
    'homework': 'Homework',
    'transport': 'Transport',
    'announcements': 'Announcements',
    'leave': 'Leave',
    'queries': 'Queries',
    'compliance': 'Compliance',
    'reports': 'Reports',
    'menu-permissions': 'Menu Permissions',
    'performance': 'Performance',
    'admissions': 'Admissions',
    'workflow': 'Workflow',
    'form-config': 'Form Configuration',
    'year-cycle': 'Academic Year Cycle',
    'timetable': 'Timetable',
  };

  const currentModuleLabel = moduleLabels[moduleSegment] || null;

  return (
    <div className="space-y-0">
      {/* Breadcrumb bar */}
      <nav className="flex items-center gap-2 text-sm mb-6">
        <button
          onClick={() => router.push('/dashboard/schools')}
          className="text-surface-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center gap-1"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
          Schools
        </button>

        <span className="text-surface-300 dark:text-gray-600">/</span>

        {school ? (
          <button
            onClick={() => router.push(`/dashboard/schools/${id}`)}
            className={`transition-colors ${isRoot ? 'text-gray-900 dark:text-gray-100 font-semibold pointer-events-none' : 'text-surface-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            {school.name}
          </button>
        ) : (
          <span className="text-surface-400">Loading...</span>
        )}

        {currentModuleLabel && (
          <>
            <span className="text-surface-300 dark:text-gray-600">/</span>
            <span className="text-gray-900 dark:text-gray-100 font-semibold">{currentModuleLabel}</span>
          </>
        )}
      </nav>

      {children}
    </div>
  );
}
