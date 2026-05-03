'use client';

import { useEffect, useRef } from 'react';
import { ATTENDANCE_STATUS_CFG, type AttendanceStatus } from './AttendanceLegend';

export interface DayRecord {
  date: string;
  status: string | null;
  punch_in_time: string | null;
  punch_out_time: string | null;
  working_hours: number | null;
  is_holiday: boolean;
  holiday_name: string | null;
  is_leave: boolean;
  leave_type: string | null;
  is_weekoff: boolean;
}

interface AttendanceDetailsDrawerProps {
  record: DayRecord | null;
  onClose: () => void;
}

function InfoRow({ label, value, valueClass = '' }: { label: string; value: React.ReactNode; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-surface-100 dark:border-gray-800 last:border-0">
      <span className="text-sm text-surface-400">{label}</span>
      <span className={`text-sm font-medium text-gray-800 dark:text-gray-200 ${valueClass}`}>{value}</span>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline mr-1 opacity-60">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

export default function AttendanceDetailsDrawer({ record, onClose }: AttendanceDetailsDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Trap focus
  useEffect(() => {
    if (record) drawerRef.current?.focus();
  }, [record]);

  const show = !!record;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const status = record?.status as AttendanceStatus | null | undefined;
  const cfg = status && ATTENDANCE_STATUS_CFG[status] ? ATTENDANCE_STATUS_CFG[status] : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-200 ${show ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Attendance details"
        className={`fixed right-0 top-0 h-full w-full max-w-sm bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col outline-none transition-transform duration-300 ease-out ${show ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-base">Day Details</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:bg-surface-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        {record && (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Date */}
            <div>
              <p className="text-xs text-surface-400 font-medium uppercase tracking-wider">Date</p>
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-1">{formatDate(record.date)}</p>
            </div>

            {/* Status badge */}
            {cfg && (
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold ${cfg.bg} ${cfg.text}`}>
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                {cfg.full}
              </div>
            )}

            {/* Holiday / Leave banners */}
            {record.is_holiday && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-600 shrink-0"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <p className="text-sm text-violet-700 dark:text-violet-400 font-medium">{record.holiday_name ?? 'Public Holiday'}</p>
              </div>
            )}
            {record.is_leave && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-600 shrink-0"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.63 19.79 19.79 0 01.01 2a2 2 0 012-2.18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.18 6.18l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                <p className="text-sm text-cyan-700 dark:text-cyan-400 font-medium capitalize">{record.leave_type ?? 'Approved'} Leave</p>
              </div>
            )}

            {/* Punch times */}
            <div className="card p-4 space-y-0 divide-y divide-surface-100 dark:divide-gray-800">
              <InfoRow
                label="Check In"
                value={record.punch_in_time
                  ? <><ClockIcon />{record.punch_in_time}</>
                  : <span className="text-surface-300">—</span>}
                valueClass="font-mono"
              />
              <InfoRow
                label="Check Out"
                value={record.punch_out_time
                  ? <><ClockIcon />{record.punch_out_time}</>
                  : <span className="text-surface-300">—</span>}
                valueClass="font-mono"
              />
              <InfoRow
                label="Working Hours"
                value={record.working_hours != null
                  ? `${record.working_hours}h`
                  : <span className="text-surface-300">—</span>}
                valueClass={record.working_hours != null && record.working_hours >= 8 ? 'text-emerald-600 dark:text-emerald-400' : record.working_hours != null ? 'text-amber-600 dark:text-amber-400' : ''}
              />
            </div>

            {/* Working hours visual bar */}
            {record.working_hours != null && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-surface-400">
                  <span>Hours worked</span>
                  <span className="font-medium">{record.working_hours}h / 8h</span>
                </div>
                <div className="w-full h-2 bg-surface-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${record.working_hours >= 8 ? 'bg-emerald-500' : record.working_hours >= 4 ? 'bg-amber-400' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(100, (record.working_hours / 8) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-4 border-t border-surface-100 dark:border-gray-800">
          <button onClick={onClose} className="btn-secondary w-full">Close</button>
        </div>
      </div>
    </>
  );
}
