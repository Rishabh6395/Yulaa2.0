'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const MASTER_SECTIONS = [
  {
    title: 'Student & Staff',
    items: [
      { label: 'Gender',          href: '/dashboard/masters/gender',         icon: 'Users',         desc: 'Gender options for students and staff' },
      { label: 'Blood Groups',    href: '/dashboard/masters/blood-groups',   icon: 'Heart',         desc: 'Blood group options' },
      { label: 'Qualifications',  href: '/dashboard/masters/qualifications', icon: 'GraduationCap', desc: 'Staff qualification types' },
      { label: 'Streams',         href: '/dashboard/masters/streams',        icon: 'BookMarked',    desc: 'Academic streams available' },
    ],
  },
  {
    title: 'Academic',
    items: [
      { label: 'Grades',          href: '/dashboard/masters/grades',        icon: 'ListOrdered',    desc: 'Grade / class levels used across forms' },
      { label: 'Exam Types',      href: '/dashboard/masters/exam-types',    icon: 'ClipboardCheck', desc: 'Types of exams / terms' },
      { label: 'Grading Types',   href: '/dashboard/masters/grading-types', icon: 'BarChart',       desc: 'Grade scales per exam type' },
    ],
  },
  {
    title: 'Communication',
    items: [
      { label: 'Announcement Types', href: '/dashboard/masters/announcement-types', icon: 'Megaphone', desc: 'Categories for announcements' },
      { label: 'Event Types',        href: '/dashboard/masters/event-types',        icon: 'CalendarStar', desc: 'Categories for school events' },
    ],
  },
  {
    title: 'Location',
    items: [
      { label: 'Countries',        href: '/dashboard/masters/countries',        icon: 'Globe',    desc: 'Countries list' },
      { label: 'States',           href: '/dashboard/masters/states',           icon: 'Map',      desc: 'States per country' },
      { label: 'Districts',        href: '/dashboard/masters/districts',        icon: 'MapPin',   desc: 'Districts per state' },
      { label: 'School Locations', href: '/dashboard/masters/school-location',  icon: 'Building', desc: 'Physical school addresses' },
    ],
  },
  {
    title: 'School Structure',
    items: [
      { label: 'School Hierarchy', href: '/dashboard/masters/school-hierarchy', icon: 'Network',  desc: 'Organizational hierarchy (Trust → Campus → Wing)' },
    ],
  },
  {
    title: 'Forms & Leaves',
    items: [
      { label: 'Leave Types',    href: '/dashboard/masters/leave-types',    icon: 'Calendar',   desc: 'Leave categories for staff' },
      { label: 'Content Types',  href: '/dashboard/masters/content-types',  icon: 'FileText',   desc: 'Custom fields for school forms' },
    ],
  },
];

const icons: Record<string, React.ReactNode> = {
  Users: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Heart: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  GraduationCap: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
  BookMarked: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M9 7l2 2 4-4"/></svg>,
  ClipboardCheck: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="m9 14 2 2 4-4"/></svg>,
  BarChart: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
  Megaphone: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 19-9-9 19-2-8-8-2z"/></svg>,
  CalendarStar: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m12 14 1 2h2l-1.5 1.5.5 2L12 18.5l-2 1 .5-2L9 16h2z"/></svg>,
  Globe: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  Map: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>,
  MapPin: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Building: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 22V12h6v10"/><path d="M9 7h.01M12 7h.01M15 7h.01M9 11h.01M15 11h.01"/></svg>,
  Network: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M12 7v4M5.8 17.3l4.5-4M18.2 17.3l-4.5-4"/></svg>,
  Calendar: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  FileText: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  ListOrdered: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>,
};

export default function MastersPage() {
  const searchParams = useSearchParams();
  const schoolId = searchParams.get('schoolId');
  const suffix = schoolId ? `?schoolId=${schoolId}` : '';

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Masters</h1>
        <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">
          Configure lookup data used across forms and workflows
        </p>
      </div>

      {MASTER_SECTIONS.map((section) => (
        <div key={section.title}>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-gray-500 mb-3">
            {section.title}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={`${item.href}${suffix}`}
                className="card p-4 flex items-start gap-3 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-500 dark:text-blue-400 shrink-0 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                  {icons[item.icon]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {item.label}
                  </p>
                  <p className="text-xs text-surface-400 dark:text-gray-500 mt-0.5 leading-snug">
                    {item.desc}
                  </p>
                </div>
                <svg className="ml-auto shrink-0 text-surface-300 dark:text-gray-600 group-hover:text-blue-400 transition-colors" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
