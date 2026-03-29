'use client';

export default function OnlineClassesPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Online Classes</h1>
        <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">Live and recorded classes with performance tracking</p>
      </div>

      <div className="card p-12 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-purple-400">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <path d="M8 21h8M12 17v4"/>
            <path d="m10 8 5 3-5 3V8z" fill="currentColor" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <p className="text-lg font-display font-bold text-gray-900 dark:text-gray-100">Online Classes</p>
          <p className="text-sm text-surface-400 mt-1">
            Live sessions, recorded lectures, and individual child performance tracking.
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
