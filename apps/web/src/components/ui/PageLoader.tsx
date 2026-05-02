'use client';

interface PageLoaderProps {
  rows?: number;
  cols?: number;
}

/** Full-page skeleton loader — mimics a table with rows × cols cells */
export default function PageLoader({ rows = 6, cols = 4 }: PageLoaderProps) {
  return (
    <div className="animate-pulse space-y-4 p-1">
      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between gap-3">
        <div className="h-9 w-48 rounded-lg bg-surface-100 dark:bg-gray-700" />
        <div className="h-9 w-28 rounded-lg bg-surface-100 dark:bg-gray-700" />
      </div>
      {/* Table skeleton */}
      <div className="rounded-xl border border-surface-100 dark:border-gray-700 overflow-hidden">
        {/* Header row */}
        <div className="flex gap-3 px-4 py-3 bg-surface-50 dark:bg-gray-800 border-b border-surface-100 dark:border-gray-700">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="h-3.5 rounded bg-surface-200 dark:bg-gray-600" style={{ flex: i === 0 ? 2 : 1 }} />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-3 px-4 py-3.5 border-b last:border-0 border-surface-100 dark:border-gray-700">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="h-3 rounded bg-surface-100 dark:bg-gray-700" style={{ flex: c === 0 ? 2 : 1, opacity: 1 - r * 0.08 }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
