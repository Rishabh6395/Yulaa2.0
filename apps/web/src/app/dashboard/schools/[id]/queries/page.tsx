'use client';
import Link from 'next/link';

export default function SchoolQueriesConfigPage() {
  return (
    <div className="max-w-xl space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Query Configuration</h1>
        <p className="text-sm text-surface-400 mt-0.5">Per-school query workflow configuration has been removed.</p>
      </div>

      <div className="card p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Standardized Helpdesk Workflow</h2>
            <p className="text-sm text-surface-500 mt-1 leading-relaxed">
              All schools now follow a unified query workflow managed centrally by Super Admin.
              SLA rules, priority policies, and monitoring are configured globally — ensuring consistent
              service levels across every school.
            </p>
          </div>
        </div>

        <div className="border-t border-surface-100 dark:border-gray-700 pt-3 space-y-2">
          <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-gray-300">
            <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            Any school user (teacher, parent, student, HOD, etc.) can raise a query — goes to School Admin
          </div>
          <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-gray-300">
            <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            School Admin queries escalate automatically to Super Admin
          </div>
          <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-gray-300">
            <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            File attachments, status tracking, and reply threads are available to all roles
          </div>
        </div>
      </div>

      <p className="text-xs text-surface-400">
        To manage SLA rules and monitor resolution metrics, visit{' '}
        <Link href="/dashboard/super-admin/queries" className="text-brand-600 dark:text-brand-400 hover:underline">
          Query Management → SLA Rules
        </Link>{' '}
        in the Super Admin section.
      </p>
    </div>
  );
}
