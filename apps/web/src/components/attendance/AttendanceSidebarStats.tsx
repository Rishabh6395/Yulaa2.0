'use client';

interface Summary {
  present: number;
  absent: number;
  late: number;
  half_day: number;
  excused: number;
  leave: number;
  holidays: number;
  weekoffs: number;
  working_days: number;
  attendance_rate: number;
}

interface AttendanceSidebarStatsProps {
  summary: Summary | null;
  isLoading?: boolean;
  month: string; // YYYY-MM
}

function RateRing({ pct }: { pct: number }) {
  const r    = 36;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 85 ? '#10b981' : pct >= 65 ? '#f59e0b' : '#ef4444';
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" className="shrink-0">
      <circle cx="48" cy="48" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-surface-100 dark:text-gray-700" />
      <circle
        cx="48" cy="48" r={r} fill="none"
        stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 48 48)"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text x="48" y="52" textAnchor="middle" fontSize="15" fontWeight="700" fill={color}>{pct}%</text>
    </svg>
  );
}

const STAT_ROWS = [
  { key: 'present',  label: 'Present',   color: 'text-emerald-600 dark:text-emerald-400' },
  { key: 'absent',   label: 'Absent',    color: 'text-red-600 dark:text-red-400' },
  { key: 'late',     label: 'Late',      color: 'text-amber-600 dark:text-amber-400' },
  { key: 'half_day', label: 'Half Day',  color: 'text-orange-600 dark:text-orange-400' },
  { key: 'excused',  label: 'Excused',   color: 'text-blue-600 dark:text-blue-400' },
  { key: 'leave',    label: 'On Leave',  color: 'text-cyan-600 dark:text-cyan-400' },
  { key: 'holidays', label: 'Holidays',  color: 'text-violet-600 dark:text-violet-400' },
] as const;

export default function AttendanceSidebarStats({ summary, isLoading, month }: AttendanceSidebarStatsProps) {
  const [y, m] = month.split('-');
  const monthName = new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  if (isLoading) {
    return (
      <div className="card p-5 space-y-4 animate-pulse">
        <div className="h-4 w-24 bg-surface-100 dark:bg-gray-700 rounded" />
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-surface-100 dark:bg-gray-700" />
        </div>
        {[1,2,3,4].map(i => (
          <div key={i} className="flex justify-between">
            <div className="h-3 w-16 bg-surface-100 dark:bg-gray-700 rounded" />
            <div className="h-3 w-8 bg-surface-100 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="card p-5 text-center">
        <p className="text-sm text-surface-400">No data for {monthName}</p>
      </div>
    );
  }

  return (
    <div className="card p-5 space-y-5">
      <div>
        <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">{monthName}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{summary.working_days} working days</p>
      </div>

      {/* Attendance rate ring */}
      <div className="flex flex-col items-center gap-2">
        <RateRing pct={summary.attendance_rate} />
        <p className="text-xs text-surface-400">Attendance Rate</p>
      </div>

      {/* Stat rows */}
      <div className="space-y-2.5">
        {STAT_ROWS.map(({ key, label, color }) => {
          const val = summary[key] as number;
          if (val === 0 && key !== 'present' && key !== 'absent') return null;
          const pct = summary.working_days > 0 ? Math.round((val / summary.working_days) * 100) : 0;
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-surface-400">{label}</span>
                <span className={`text-xs font-semibold ${color}`}>{val} <span className="font-normal text-surface-300 dark:text-gray-600">({pct}%)</span></span>
              </div>
              <div className="w-full h-1 bg-surface-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    key === 'present'  ? 'bg-emerald-500' :
                    key === 'absent'   ? 'bg-red-500' :
                    key === 'late'     ? 'bg-amber-400' :
                    key === 'half_day' ? 'bg-orange-400' :
                    key === 'excused'  ? 'bg-blue-500' :
                    key === 'leave'    ? 'bg-cyan-500' :
                    'bg-violet-500'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Holidays & weekoffs footer */}
      <div className="pt-2 border-t border-surface-100 dark:border-gray-800 flex justify-between text-xs text-surface-400">
        <span>{summary.holidays} holiday{summary.holidays !== 1 ? 's' : ''}</span>
        <span>{summary.weekoffs} week-off{summary.weekoffs !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}
