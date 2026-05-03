'use client';

export const ATTENDANCE_STATUS_CFG = {
  present:  { label: 'P', full: 'Present',  bg: 'bg-emerald-100 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  absent:   { label: 'A', full: 'Absent',   bg: 'bg-red-100 dark:bg-red-950/40',         text: 'text-red-700 dark:text-red-400',         dot: 'bg-red-500' },
  late:     { label: 'L', full: 'Late',     bg: 'bg-amber-100 dark:bg-amber-950/40',     text: 'text-amber-700 dark:text-amber-400',     dot: 'bg-amber-400' },
  half_day: { label: 'H', full: 'Half Day', bg: 'bg-orange-100 dark:bg-orange-950/40',   text: 'text-orange-700 dark:text-orange-400',   dot: 'bg-orange-400' },
  excused:  { label: 'E', full: 'Excused',  bg: 'bg-blue-100 dark:bg-blue-950/40',       text: 'text-blue-700 dark:text-blue-400',       dot: 'bg-blue-500' },
  holiday:  { label: 'H', full: 'Holiday',  bg: 'bg-violet-100 dark:bg-violet-950/40',   text: 'text-violet-700 dark:text-violet-400',   dot: 'bg-violet-500' },
  leave:    { label: 'L', full: 'Leave',    bg: 'bg-cyan-100 dark:bg-cyan-950/40',        text: 'text-cyan-700 dark:text-cyan-400',        dot: 'bg-cyan-500' },
  weekoff:  { label: 'W', full: 'Week Off', bg: 'bg-surface-100 dark:bg-gray-800',        text: 'text-surface-400 dark:text-gray-500',    dot: 'bg-gray-300 dark:bg-gray-600' },
  future:   { label: '·', full: 'Future',   bg: 'bg-transparent',                         text: 'text-surface-300 dark:text-gray-600',    dot: 'bg-transparent' },
} as const;

export type AttendanceStatus = keyof typeof ATTENDANCE_STATUS_CFG;

interface AttendanceLegendProps {
  compact?: boolean;
}

const VISIBLE_STATUSES: AttendanceStatus[] = ['present', 'absent', 'late', 'half_day', 'excused', 'leave', 'holiday', 'weekoff'];

export default function AttendanceLegend({ compact = false }: AttendanceLegendProps) {
  if (compact) {
    return (
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {VISIBLE_STATUSES.map(s => {
          const cfg = ATTENDANCE_STATUS_CFG[s];
          return (
            <div key={s} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
              <span className="text-xs text-surface-400 dark:text-gray-500">{cfg.full}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {VISIBLE_STATUSES.map(s => {
        const cfg = ATTENDANCE_STATUS_CFG[s];
        return (
          <div key={s} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${cfg.bg} ${cfg.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.full}
          </div>
        );
      })}
    </div>
  );
}
