'use client';

export default function SessionsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Career Sessions</h1>
        <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">Career guidance and counselling sessions for students</p>
      </div>

      <div className="card p-12 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-indigo-400">
            <rect x="2" y="7" width="20" height="14" rx="2"/>
            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
            <line x1="12" y1="12" x2="12" y2="16"/>
            <line x1="10" y1="14" x2="14" y2="14"/>
          </svg>
        </div>
        <div>
          <p className="text-lg font-display font-bold text-gray-900 dark:text-gray-100">Career Sessions</p>
          <p className="text-sm text-surface-400 mt-1">
            Live career counselling sessions, webinars, workshops, and 1-on-1 guidance for students.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-sm font-semibold border border-amber-200 dark:border-amber-800">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"/>
          Coming Soon
        </span>
      </div>
    </div>
  );
}
