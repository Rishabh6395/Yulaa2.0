'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import PageError from '@/components/ui/PageError';
import AttendanceLegend, { ATTENDANCE_STATUS_CFG, type AttendanceStatus } from '@/components/attendance/AttendanceLegend';
import AttendanceSidebarStats from '@/components/attendance/AttendanceSidebarStats';
import AttendanceDetailsDrawer, { type DayRecord } from '@/components/attendance/AttendanceDetailsDrawer';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonthlyRecord extends DayRecord {
  day_of_week: number;
}

interface Summary {
  present: number; absent: number; late: number; half_day: number;
  excused: number; leave: number; holidays: number; weekoffs: number;
  working_days: number; attendance_rate: number;
}

interface MonthlyData {
  month: string;
  records: MonthlyRecord[];
  summary: Summary;
}

interface Teacher {
  teacher_id: string;
  first_name: string;
  last_name: string;
  employee_id: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getToken() {
  return typeof window !== 'undefined' ? (localStorage.getItem('token') ?? '') : '';
}

function apiFetch<T>(url: string): Promise<T> {
  return fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } }).then(r => {
    if (!r.ok) throw new Error('API error');
    return r.json() as Promise<T>;
  });
}

function getUser() {
  try { return typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') ?? '{}') : {}; }
  catch { return {}; }
}

// ─── Calendar Day Cell ────────────────────────────────────────────────────────

function CalendarCell({ record, isToday, onClick }: {
  record: MonthlyRecord | null;
  isToday: boolean;
  day: number;
  onClick: (r: MonthlyRecord) => void;
}) {
  if (!record) return <div className="aspect-square" />;

  const status = record.status as AttendanceStatus;
  const cfg = ATTENDANCE_STATUS_CFG[status] ?? ATTENDANCE_STATUS_CFG.future;
  const day = new Date(record.date).getUTCDate();
  const isFuture   = record.status === 'future';
  const isWeekoff  = record.is_weekoff;
  const isInactive = isFuture || isWeekoff;

  return (
    <button
      onClick={() => !isFuture && onClick(record)}
      disabled={isFuture}
      className={`
        aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-medium
        transition-all duration-150 relative group
        ${isToday ? 'ring-2 ring-brand-500 ring-offset-1 dark:ring-offset-gray-900' : ''}
        ${isInactive
          ? 'text-surface-300 dark:text-gray-700 cursor-default'
          : `${cfg.bg} ${cfg.text} hover:scale-105 hover:shadow-sm cursor-pointer active:scale-95`
        }
      `}
    >
      <span className={`text-sm leading-none ${isToday ? 'font-bold' : ''}`}>{day}</span>
      {!isFuture && !isWeekoff && (
        <span className={`text-[9px] mt-0.5 font-semibold opacity-70`}>{cfg.label}</span>
      )}
      {/* Punch times tooltip on hover */}
      {record.punch_in_time && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-10 hidden group-hover:flex flex-col items-center pointer-events-none">
          <div className="bg-gray-900 dark:bg-gray-700 text-white text-[10px] rounded-lg px-2 py-1 whitespace-nowrap shadow-lg">
            {record.punch_in_time} {record.punch_out_time ? `→ ${record.punch_out_time}` : ''}
          </div>
          <div className="w-1.5 h-1.5 bg-gray-900 dark:bg-gray-700 rotate-45 -mt-0.5" />
        </div>
      )}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AttendanceCalendarPage() {
  const today    = new Date();
  const [year,   setYear]   = useState(today.getFullYear());
  const [month,  setMonth]  = useState(today.getMonth()); // 0-indexed
  const [data,   setData]   = useState<MonthlyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,  setError]  = useState(false);
  const [selectedDay,  setSelectedDay]  = useState<DayRecord | null>(null);
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [checking,     setChecking]     = useState<'in' | 'out' | null>(null);
  const [punchMsg,     setPunchMsg]     = useState<{ ok: boolean; msg: string } | null>(null);
  const [teacherFilter, setTeacherFilter] = useState<string>('');
  const [teachers,      setTeachers]      = useState<Teacher[]>([]);

  const user    = getUser();
  const role    = user.primaryRole ?? '';
  const userId  = user.id ?? '';
  const isAdmin = ['school_admin', 'principal', 'hod', 'super_admin'].includes(role);

  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

  // Fetch teachers list for admin filtering
  useEffect(() => {
    if (!isAdmin) return;
    apiFetch<{ report: Teacher[] }>(`/api/attendance?type=employee&month=${monthStr}`)
      .then(d => setTeachers(d.report ?? []))
      .catch(() => {});
  }, [isAdmin, monthStr]);

  // Resolve which userId to fetch for
  const targetUserId = isAdmin && teacherFilter ? teacherFilter : userId;

  const fetchMonth = useCallback(async () => {
    if (!targetUserId) return;
    setLoading(true); setError(false);
    try {
      const qs = new URLSearchParams({ month: monthStr });
      if (isAdmin && teacherFilter) qs.set('user_id', teacherFilter);
      const res = await apiFetch<MonthlyData>(`/api/attendance/monthly?${qs}`);
      setData(res);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [monthStr, isAdmin, teacherFilter, targetUserId]);

  useEffect(() => { fetchMonth(); }, [fetchMonth]);

  // Build calendar grid: map of dateStr -> record
  const recordMap = useMemo(() => {
    const m: Record<string, MonthlyRecord> = {};
    data?.records.forEach(r => { m[r.date] = r; });
    return m;
  }, [data]);

  // Calendar grid: first day offset + days in month
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth    = new Date(year, month + 1, 0).getDate();

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  function openDay(r: MonthlyRecord) {
    setSelectedDay(r);
    setDrawerOpen(true);
  }

  async function handlePunch(action: 'in' | 'out') {
    setChecking(action);
    setPunchMsg(null);
    try {
      const endpoint = action === 'in' ? '/api/attendance/checkin' : '/api/attendance/checkout';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Failed');
      setPunchMsg({ ok: true, msg: `${action === 'in' ? 'Checked in' : 'Checked out'} at ${body.time ? new Date(body.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'now'}` });
      fetchMonth();
    } catch (e: any) {
      setPunchMsg({ ok: false, msg: e.message ?? 'Error' });
    } finally {
      setChecking(null);
    }
  }

  // Today's record
  const todayStr    = today.toISOString().split('T')[0];
  const todayRecord = recordMap[todayStr];
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  const monthName = new Date(year, month, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Attendance Calendar</h1>
          <p className="text-sm text-surface-400 mt-0.5">
            {isAdmin ? 'Employee attendance overview' : 'Your monthly attendance history'}
          </p>
        </div>

        {/* Check-in / Check-out — employee only, current month */}
        {!isAdmin && isCurrentMonth && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePunch('in')}
              disabled={!!checking || !!todayRecord?.punch_in_time}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              {checking === 'in' ? 'Checking in…' : todayRecord?.punch_in_time ? `In: ${todayRecord.punch_in_time}` : 'Check In'}
            </button>
            <button
              onClick={() => handlePunch('out')}
              disabled={!!checking || !todayRecord?.punch_in_time || !!todayRecord?.punch_out_time}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              {checking === 'out' ? 'Checking out…' : todayRecord?.punch_out_time ? `Out: ${todayRecord.punch_out_time}` : 'Check Out'}
            </button>
          </div>
        )}
      </div>

      {/* Punch message */}
      {punchMsg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm border ${punchMsg.ok ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'}`}>
          {punchMsg.ok
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
          {punchMsg.msg}
          <button onClick={() => setPunchMsg(null)} className="ml-auto opacity-60 hover:opacity-100">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6 items-start">
        {/* Calendar column */}
        <div className="space-y-4">
          {/* Month nav + employee filter */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <button onClick={prevMonth}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-100 dark:bg-gray-800 hover:bg-surface-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span className="text-base font-semibold text-gray-900 dark:text-gray-100 min-w-[140px] text-center">{monthName}</span>
              <button onClick={nextMonth}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-100 dark:bg-gray-800 hover:bg-surface-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              <button
                onClick={() => { setMonth(today.getMonth()); setYear(today.getFullYear()); }}
                className="ml-1 px-3 py-1.5 text-xs rounded-lg bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-400 font-medium hover:bg-brand-100 transition-colors"
              >Today</button>
            </div>

            {/* Employee filter (admin) */}
            {isAdmin && teachers.length > 0 && (
              <select
                value={teacherFilter}
                onChange={e => setTeacherFilter(e.target.value)}
                className="input-field text-sm py-2 max-w-[220px]"
              >
                <option value="">All Employees</option>
                {teachers.map(t => (
                  <option key={t.teacher_id} value={t.teacher_id}>
                    {t.first_name} {t.last_name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Calendar card */}
          {error ? (
            <PageError message="Failed to load attendance data." onRetry={fetchMonth} />
          ) : (
            <div className="card overflow-hidden">
              {/* Day header row */}
              <div className="grid grid-cols-7 border-b border-surface-100 dark:border-gray-800">
                {DAY_HEADERS.map(d => (
                  <div key={d} className="py-2.5 text-center text-xs font-semibold text-surface-400 uppercase tracking-wide">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="p-3">
                {loading ? (
                  <div className="grid grid-cols-7 gap-1.5">
                    {Array.from({ length: 35 }).map((_, i) => (
                      <div key={i} className="aspect-square rounded-xl bg-surface-50 dark:bg-gray-800 animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-7 gap-1.5">
                    {/* Empty cells before first day */}
                    {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                      <div key={`pad-${i}`} className="aspect-square" />
                    ))}
                    {/* Day cells */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const d      = i + 1;
                      const ds     = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                      const rec    = recordMap[ds] ?? null;
                      const isToday = ds === todayStr;
                      return (
                        <CalendarCell
                          key={ds}
                          record={rec}
                          isToday={isToday}
                          day={d}
                          onClick={openDay}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Legend */}
              <div className="px-4 pb-4 pt-1 border-t border-surface-100 dark:border-gray-800">
                <AttendanceLegend compact />
              </div>
            </div>
          )}

          {/* Quick stats row (mobile-friendly) */}
          {data?.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:hidden">
              {[
                { label: 'Present',  val: data.summary.present,  color: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
                { label: 'Absent',   val: data.summary.absent,   color: 'text-red-600 dark:text-red-400',         border: 'border-red-200 dark:border-red-800' },
                { label: 'Late',     val: data.summary.late,     color: 'text-amber-600 dark:text-amber-400',     border: 'border-amber-200 dark:border-amber-800' },
                { label: 'Rate',     val: `${data.summary.attendance_rate}%`, color: 'text-brand-600 dark:text-brand-400', border: 'border-brand-200 dark:border-brand-800' },
              ].map(({ label, val, color, border }) => (
                <div key={label} className={`card p-4 text-center border ${border}`}>
                  <p className={`text-2xl font-bold ${color}`}>{val}</p>
                  <p className="text-xs text-surface-400 mt-1">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar stats (desktop) */}
        <div className="hidden lg:block">
          <AttendanceSidebarStats
            summary={data?.summary ?? null}
            isLoading={loading}
            month={monthStr}
          />
        </div>
      </div>

      {/* Details Drawer */}
      <AttendanceDetailsDrawer
        record={drawerOpen ? selectedDay : null}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
