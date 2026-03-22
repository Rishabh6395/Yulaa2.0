'use client';

export default function TransportPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Transport</h1>
        <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">School bus routes and tracking</p>
      </div>

      <div className="card p-12 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-blue-400">
            <path d="M8 6v6M15 6v6M2 12h19.6M18 18h2a1 1 0 0 0 1-1v-5H3v5a1 1 0 0 0 1 1h2"/>
            <path d="M4 12V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5"/>
            <circle cx="7" cy="18" r="1.5"/><circle cx="17" cy="18" r="1.5"/>
          </svg>
        </div>
        <div>
          <p className="text-lg font-display font-bold text-gray-900 dark:text-gray-100">Transport Management</p>
          <p className="text-sm text-surface-400 mt-1">
            Bus routes, stops, live tracking, and driver information.
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
