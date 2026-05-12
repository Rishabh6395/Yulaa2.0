'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ── Announcement type badge ──────────────────────────────────────────────────

const ANNOUNCEMENT_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  event:        { bg: 'bg-blue-100   dark:bg-blue-950',    text: 'text-blue-600   dark:text-blue-400',   label: 'Event' },
  fee_reminder: { bg: 'bg-amber-100  dark:bg-amber-950',   text: 'text-amber-600  dark:text-amber-400',  label: 'Fee' },
  holiday:      { bg: 'bg-emerald-100 dark:bg-emerald-950',text: 'text-emerald-600 dark:text-emerald-400',label: 'Holiday' },
  urgent:       { bg: 'bg-red-100    dark:bg-red-950',     text: 'text-red-600    dark:text-red-400',    label: 'Urgent' },
  general:      { bg: 'bg-surface-100 dark:bg-gray-800',   text: 'text-surface-500 dark:text-gray-400',  label: 'General' },
  exam:         { bg: 'bg-purple-100 dark:bg-purple-950',  text: 'text-purple-600 dark:text-purple-400', label: 'Exam' },
};

function AnnouncementTypeBadge({ type }: { type: string }) {
  const s = ANNOUNCEMENT_STYLES[type] || ANNOUNCEMENT_STYLES.general;
  return (
    <span className={`${s.bg} ${s.text} text-[10px] font-bold px-2 py-0.5 rounded-md uppercase`}>
      {s.label}
    </span>
  );
}

// ── Time formatter ────────────────────────────────────────────────────────────

function fmtTime(dt: any) {
  if (!dt) return null;
  return new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// ── Attendance Calendar ───────────────────────────────────────────────────────

const ATT_DOT: Record<string, string> = {
  present:  'bg-emerald-500',
  absent:   'bg-red-500',
  late:     'bg-amber-500',
  half_day: 'bg-orange-400',
  excused:  'bg-blue-400',
};

function AttendanceCalendar({ userId, studentId, mode }: { userId?: string; studentId?: string; mode: 'employee' | 'student' }) {
  const now  = new Date();
  const [yr,  setYr]  = useState(now.getFullYear());
  const [mon, setMon] = useState(now.getMonth()); // 0-indexed
  const [map,  setMap]  = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    if (!token) return;
    const mmStr = `${yr}-${String(mon + 1).padStart(2, '0')}`;
    setLoading(true);

    let url = '';
    if (mode === 'employee' && userId) {
      url = `/api/attendance?type=employee&teacher_user_id=${userId}&month=${mmStr}`;
    } else if (mode === 'student' && studentId) {
      url = `/api/attendance?student_id=${studentId}&month=${mmStr}`;
    }
    if (!url) { setLoading(false); return; }

    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const records: any[] = d.attendance ?? d.records ?? [];
        const built: Record<string, string> = {};
        for (const r of records) {
          const day = (r.date ?? r.d ?? '').substring(0, 10);
          if (day) built[day] = r.status;
        }
        setMap(built);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [yr, mon, userId, studentId, mode]);

  const firstDay = new Date(yr, mon, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(yr, mon + 1, 0).getDate();
  const todayStr = new Date().toISOString().split('T')[0];
  const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function prev() { if (mon === 0) { setMon(11); setYr(y => y - 1); } else setMon(m => m - 1); }
  function next() { if (mon === 11) { setMon(0); setYr(y => y + 1); } else setMon(m => m + 1); }

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-surface-400 dark:text-gray-500 uppercase tracking-wider">Attendance</p>
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{MONTHS[mon]} {yr}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={prev} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-100 dark:hover:bg-gray-700 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15,18 9,12 15,6"/></svg>
          </button>
          <button onClick={next} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-100 dark:hover:bg-gray-700 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9,18 15,12 9,6"/></svg>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-36 rounded-xl bg-surface-100 dark:bg-gray-800 animate-pulse"/>
      ) : (
        <>
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-surface-400 dark:text-gray-500 py-1">{d}</div>
            ))}
          </div>
          {/* Day cells */}
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`}/>)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${yr}-${String(mon + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const status  = map[dateStr];
              const isToday = dateStr === todayStr;
              const dot     = status ? ATT_DOT[status] ?? 'bg-gray-400' : '';
              return (
                <div key={day} className={`relative flex flex-col items-center justify-center h-8 rounded-lg text-xs font-medium transition-colors
                  ${isToday ? 'ring-2 ring-brand-400 dark:ring-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-surface-50 dark:hover:bg-gray-800/60'}`}>
                  <span>{day}</span>
                  {status && <span className={`absolute bottom-0.5 w-1.5 h-1.5 rounded-full ${dot}`}/>}
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-surface-100 dark:border-gray-800">
            {[['present','emerald'],['absent','red'],['late','amber'],['excused','blue']].map(([s,c]) => (
              <span key={s} className="flex items-center gap-1 text-[10px] text-surface-500 dark:text-gray-400 capitalize">
                <span className={`w-2 h-2 rounded-full bg-${c}-500`}/>
                {s}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Employee Punch In / Out card ──────────────────────────────────────────────

function PunchCard({ userId }: { userId: string }) {
  const [todayRec,  setTodayRec]  = useState<any>(null);
  const [loading,   setLoading]   = useState(true);
  const [punching,  setPunching]  = useState<'in' | 'out' | null>(null);
  const [message,   setMessage]   = useState('');
  const today = new Date().toISOString().split('T')[0];

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    if (!userId || !token) { setLoading(false); return; }
    fetch(`/api/attendance?type=employee&teacher_user_id=${userId}&month=${today.substring(0,7)}&date=${today}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setTodayRec(d.today || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId, token, today]);

  const handlePunch = async (action: 'punch_in' | 'punch_out') => {
    setPunching(action === 'punch_in' ? 'in' : 'out');
    setMessage('');
    try {
      const res  = await fetch('/api/attendance', {
        method: 'POST', headers,
        body: JSON.stringify({ type: 'employee', action, user_id: userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage(`${action === 'punch_in' ? 'Punched In' : 'Punched Out'} at ${fmtTime(data.time) ?? ''}`);
        setTodayRec(data.record ?? null);
      } else {
        setMessage(`Error: ${data.error || 'Failed to record attendance'}`);
      }
    } catch { setMessage('Error: Network error'); }
    setPunching(null);
    setTimeout(() => setMessage(''), 5000);
  };

  const hasPunchIn  = !!todayRec?.punchInTime;
  const hasPunchOut = !!todayRec?.punchOutTime;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-semibold text-surface-400 dark:text-gray-500 uppercase tracking-wider">My Attendance — Today</p>
          <p className="text-xs text-surface-400 dark:text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
          </p>
        </div>
        {todayRec?.status && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 capitalize">
            {todayRec.status}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className={`p-3 rounded-xl border-2 space-y-2 transition-colors ${hasPunchIn ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20' : 'border-surface-100 dark:border-gray-700'}`}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-600">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10,17 15,12 10,7"/><line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
            </div>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">School In</span>
          </div>
          {loading ? (
            <div className="h-7 rounded-lg bg-surface-100 dark:bg-gray-700 animate-pulse"/>
          ) : hasPunchIn ? (
            <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{fmtTime(todayRec.punchInTime)}</p>
          ) : (
            <button onClick={() => handlePunch('punch_in')} disabled={punching !== null}
              className="w-full py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors disabled:opacity-60">
              {punching === 'in' ? 'Saving…' : 'Punch In'}
            </button>
          )}
        </div>

        <div className={`p-3 rounded-xl border-2 space-y-2 transition-colors ${hasPunchOut ? 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20' : 'border-surface-100 dark:border-gray-700'}`}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-red-600">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </div>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">School Out</span>
          </div>
          {loading ? (
            <div className="h-7 rounded-lg bg-surface-100 dark:bg-gray-700 animate-pulse"/>
          ) : hasPunchOut ? (
            <p className="text-base font-bold text-red-600 dark:text-red-400">{fmtTime(todayRec.punchOutTime)}</p>
          ) : (
            <button onClick={() => handlePunch('punch_out')} disabled={punching !== null || !hasPunchIn}
              title={!hasPunchIn ? 'Punch In first' : ''}
              className="w-full py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors disabled:opacity-60">
              {punching === 'out' ? 'Saving…' : 'Punch Out'}
            </button>
          )}
        </div>
      </div>

      {message && (
        <p className={`mt-2 text-xs font-medium ${message.startsWith('Error') ? 'text-red-600' : 'text-emerald-600'}`}>
          {message}
        </p>
      )}
    </div>
  );
}

// ── Shared stat card ─────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  iconBg: string;
  trend?: number;
}

function StatCard({ title, value, subtext, icon, iconBg, trend }: StatCardProps) {
  return (
    <div className="card p-4 hover:shadow-card-hover dark:hover:shadow-lg transition-all duration-200 group">
      <div className="flex items-center justify-between gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg} transition-transform duration-200 group-hover:scale-110`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0 text-right">
          <p className="text-[10px] font-semibold text-surface-400 dark:text-gray-500 uppercase tracking-wider truncate">{title}</p>
          <p className="text-xl font-display font-bold text-gray-900 dark:text-gray-100 leading-tight">{value}</p>
        </div>
      </div>
      {(subtext || trend !== undefined) && (
        <div className="mt-2.5 pt-2.5 border-t border-surface-100 dark:border-gray-800 flex items-center justify-between gap-2">
          {subtext && <p className="text-[11px] text-surface-400 dark:text-gray-500 truncate flex-1">{subtext}</p>}
          {trend !== undefined && (
            <div className={`flex items-center gap-0.5 text-[11px] font-semibold flex-shrink-0 ${trend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                {trend >= 0 ? <polyline points="18,15 12,9 6,15"/> : <polyline points="6,9 12,15 18,9"/>}
              </svg>
              {Math.abs(trend)}%
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Attendance stacked bar ────────────────────────────────────────────────────

function AttendanceBar({ present, absent, late, total }: { present: number; absent: number; late: number; total: number }) {
  if (total === 0) return <p className="text-sm text-surface-400 dark:text-gray-500">No data for today</p>;
  const pPct = (present / total) * 100;
  const lPct = (late    / total) * 100;
  const aPct = (absent  / total) * 100;
  return (
    <div className="space-y-3">
      <div className="h-3 rounded-full overflow-hidden bg-surface-100 dark:bg-gray-800 flex">
        <div className="bg-emerald-400 dark:bg-emerald-500 transition-all" style={{ width: `${pPct}%` }}/>
        <div className="bg-amber-400  dark:bg-amber-500  transition-all" style={{ width: `${lPct}%` }}/>
        <div className="bg-red-400    dark:bg-red-500    transition-all" style={{ width: `${aPct}%` }}/>
      </div>
      <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400"/> Present: {present}</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"/>  Late: {late}</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400"/>    Absent: {absent}</span>
      </div>
    </div>
  );
}

// ── Section card wrapper ──────────────────────────────────────────────────────

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`card p-6 ${className}`}>{children}</div>;
}

// ── Announcements card — full-width, bigger ───────────────────────────────────

function AnnouncementsCard({ announcements }: { announcements: any[] }) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/50 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-600 dark:text-brand-400">
              <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Announcements</h3>
          {announcements.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 text-xs font-bold">{announcements.length}</span>
          )}
        </div>
        <a href="/dashboard/announcements" className="text-xs text-brand-500 dark:text-brand-400 font-medium hover:underline">View all →</a>
      </div>

      {announcements.length === 0 ? (
        <p className="text-sm text-surface-400 dark:text-gray-500 text-center py-4">No announcements yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {announcements.map((a: any) => (
            <div key={a.id} className="flex gap-3 p-4 rounded-xl bg-surface-50 dark:bg-gray-800/50 hover:bg-surface-100 dark:hover:bg-gray-700/50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <AnnouncementTypeBadge type={a.type} />
                  {a.priority === 'urgent' && (
                    <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase">● Urgent</span>
                  )}
                  <span className="text-[10px] text-surface-400 dark:text-gray-500 ml-auto">
                    {new Date(a.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{a.title}</p>
                <p className="text-xs text-surface-500 dark:text-gray-400 mt-1 line-clamp-2">{a.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Pending Tasks — single consolidated card ──────────────────────────────────

function PendingTasksCard({ pending }: { pending: { admissions: any[]; leaves: any[] } | null }) {
  const [actioning, setActioning] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  if (!pending) return null;

  const items = [
    ...pending.admissions.map(a => ({ ...a, _kind: 'admission' })),
    ...pending.leaves.map(l => ({ ...l, _kind: 'leave' })),
  ].filter(i => !dismissed.has(i.id));

  if (items.length === 0) return null;

  async function act(item: any, action: 'approve' | 'reject') {
    const token = localStorage.getItem('token');
    setActioning(`${item.id}_${action}`);
    try {
      const endpoint = item._kind === 'admission' ? '/api/admissions/action' : '/api/leave';
      const body = item._kind === 'admission'
        ? { applicationId: item.id, action, comment: '' }
        : { id: item.id, action: action === 'approve' ? 'approved' : 'rejected' };
      await fetch(endpoint, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setDismissed(prev => new Set([...prev, item.id]));
    } catch {}
    setActioning(null);
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600 dark:text-amber-400">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Pending Tasks</h3>
          <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-xs font-bold animate-pulse">
            {items.length}
          </span>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
        {items.map(item => (
          <div key={item.id} className="p-4 rounded-xl border border-surface-100 dark:border-gray-700 border-l-4 border-l-amber-400 dark:border-l-amber-500">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                    item._kind === 'admission'
                      ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                      : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                  }`}>{item._kind}</span>
                  {item.stepLabel && <span className="text-[10px] text-surface-400 dark:text-gray-500">{item.stepLabel}</span>}
                  {item._kind === 'admission' && item.totalSteps > 0 && (
                    <span className="text-[10px] text-surface-400 ml-auto">Step {item.currentStep + 1}/{item.totalSteps}</span>
                  )}
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.title}</p>
                <p className="text-xs text-surface-400 dark:text-gray-500 mt-0.5 truncate">{item.subtitle}</p>
                {item.detail && <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{item.detail}</p>}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => act(item, 'approve')} disabled={!!actioning}
                className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 transition-colors">
                {actioning === `${item.id}_approve` ? '…' : 'Approve'}
              </button>
              <button onClick={() => act(item, 'reject')} disabled={!!actioning}
                className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 disabled:opacity-50 transition-colors">
                {actioning === `${item.id}_reject` ? '…' : 'Reject'}
              </button>
              <a href={item._kind === 'admission' ? '/dashboard/admissions' : '/dashboard/leave'}
                className="py-1.5 px-3 rounded-lg text-xs font-medium text-surface-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                View →
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Students on Leave Today ───────────────────────────────────────────────────

function StudentsOnLeaveCard() {
  const [leaveData, setLeaveData] = useState<{ total: number; students: any[] } | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    if (!t) { setLoading(false); return; }
    fetch('/api/leave/today', { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setLeaveData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01"/></svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Students on Leave Today</h3>
        </div>
        {!loading && leaveData && (
          <span className={`text-lg font-bold ${leaveData.total > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {leaveData.total}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-8 bg-surface-100 dark:bg-gray-800 rounded-lg animate-pulse"/>)}</div>
      ) : !leaveData || leaveData.total === 0 ? (
        <p className="text-xs text-surface-400 py-2 text-center">No students on leave today.</p>
      ) : (
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {leaveData.students.map((s: any) => (
            <div key={s.student_id} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-surface-50 dark:bg-gray-700/40">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400 text-xs font-bold shrink-0">
                  {(s.first_name?.[0] ?? '?').toUpperCase()}
                </div>
                <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{s.first_name} {s.last_name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {s.grade && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-sky-100 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 rounded font-medium">
                    {s.grade}{s.section ? `-${s.section}` : ''}
                  </span>
                )}
                <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded capitalize">{s.leave_type}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <a href="/dashboard/leave" className="text-xs text-brand-500 dark:text-brand-400 font-medium hover:underline">View all leave requests →</a>
    </div>
  );
}

// ── Admin dashboard ───────────────────────────────────────────────────────────

function AdminDashboard({ data, feedReady = true, allowed, pending, userId = '' }: { data: any; feedReady?: boolean; allowed: Set<string>; pending: { admissions: any[]; leaves: any[] } | null; userId?: string }) {
  const stats         = data?.stats;
  const announcements = data?.recentAnnouncements || [];

  const spotRef = useRef<HTMLDivElement>(null);
  function onSpotMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = spotRef.current;
    if (!el) return;
    const { left, top } = el.getBoundingClientRect();
    el.style.setProperty('--sx', `${e.clientX - left}px`);
    el.style.setProperty('--sy', `${e.clientY - top}px`);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Spotlight header */}
      <div ref={spotRef} onMouseMove={onSpotMove}
        className="group relative rounded-2xl border border-surface-100 dark:border-white/5 bg-gradient-to-br from-white to-surface-50 dark:from-gray-900 dark:to-gray-900/80 p-6 overflow-hidden"
        style={{ '--sx': '50%', '--sy': '50%' } as React.CSSProperties}>
        <div className="pointer-events-none absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: 'radial-gradient(600px circle at var(--sx) var(--sy), rgba(99,102,241,0.12) 0%, rgba(168,85,247,0.06) 40%, transparent 70%)' }}/>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Dashboard</h1>
            <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">Welcome back. Here&apos;s your school overview.</p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-brand-50 to-purple-50 dark:from-brand-950/50 dark:to-purple-950/50 border border-brand-100 dark:border-brand-900 text-xs font-medium text-brand-600 dark:text-brand-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
            Live data
          </div>
        </div>
      </div>

      {/* Stat cards — 4-column grid for density */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger-children">
        <a href="/dashboard/students" className="block">
          <StatCard title="Students" value={stats?.totalStudents || 0}
            subtext={`${stats?.pendingAdmissions || 0} pending`}
            iconBg="bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          />
        </a>
        <a href="/dashboard/teachers" className="block">
          <StatCard title="Teachers" value={stats?.totalTeachers || 0}
            subtext={`${stats?.totalClasses || 0} classes`}
            iconBg="bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>}
          />
        </a>
        <a href="/dashboard/attendance" className="block">
          <StatCard title="Attendance" value={`${stats?.todayAttendance?.rate ?? 0}%`}
            subtext={`${stats?.todayAttendance?.present ?? 0}/${stats?.todayAttendance?.total ?? 0} today`}
            iconBg="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="m9 16 2 2 4-4"/></svg>}
          />
        </a>
        <a href="/dashboard/admissions" className="block">
          <StatCard title="Admissions" value={stats?.pendingAdmissions || 0}
            subtext="pending review"
            iconBg="bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>}
          />
        </a>
      </div>

      {/* Calendar + Punch side by side */}
      {userId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AttendanceCalendar userId={userId} mode="employee" />
          <PunchCard userId={userId} />
        </div>
      )}

      {/* Admission pipeline */}
      <SectionCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Admission Applications</h3>
          <a href="/dashboard/admissions" className="text-xs text-brand-500 dark:text-brand-400 font-medium hover:underline">View all</a>
        </div>
        {(() => {
          const total    = (stats?.admissions?.approved || 0) + (stats?.admissions?.pending || 0) + (stats?.admissions?.rejected || 0);
          const approved = stats?.admissions?.approved || 0;
          const pending  = stats?.admissions?.pending  || 0;
          const rejected = stats?.admissions?.rejected || 0;
          const pctA = total > 0 ? Math.round((approved / total) * 100) : 0;
          const pctP = total > 0 ? Math.round((pending  / total) * 100) : 0;
          const pctR = total > 0 ? Math.round((rejected / total) * 100) : 0;
          return (
            <div className="space-y-3">
              <div className="flex gap-4 text-sm">
                <span className="font-bold text-2xl text-gray-900 dark:text-gray-100">{total}</span>
                <span className="text-xs text-surface-400 dark:text-gray-500 self-end mb-0.5">total applications</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden bg-surface-100 dark:bg-gray-800 flex">
                <div className="bg-emerald-400 dark:bg-emerald-500 transition-all" style={{ width: `${pctA}%` }}/>
                <div className="bg-amber-400  dark:bg-amber-500  transition-all" style={{ width: `${pctP}%` }}/>
                <div className="bg-red-400    dark:bg-red-500    transition-all" style={{ width: `${pctR}%` }}/>
              </div>
              <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400"/> Approved: {approved}</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"/>  Pending: {pending}</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400"/>    Rejected: {rejected}</span>
              </div>
            </div>
          );
        })()}
      </SectionCard>

      {/* Pending tasks — single card */}
      <PendingTasksCard pending={pending} />

      {/* Announcements — full width, bigger */}
      {allowed.has('announcements') && (feedReady
        ? <AnnouncementsCard announcements={announcements} />
        : <FeedSkeleton />)}
    </div>
  );
}

// ── Teacher dashboard ─────────────────────────────────────────────────────────

function TeacherDashboard({ data, feedReady = true, allowed, pending, userId = '' }: { data: any; feedReady?: boolean; allowed: Set<string>; pending: { admissions: any[]; leaves: any[] } | null; userId?: string }) {
  const stats = data?.stats;
  const allAnnouncements = data?.recentAnnouncements || [];
  const announcements = allAnnouncements.filter(
    (a: any) => !a.target_roles?.length || a.target_roles.includes('teacher') || a.audience === 'all' || a.audience === 'teacher',
  );
  const className   = stats?.className   ? ` · ${stats.className}`   : '';
  const sectionName = stats?.sectionName ? ` ${stats.sectionName}`   : '';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">Your classes and attendance overview.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger-children">
        <a href="/dashboard/students" className="block">
          <StatCard title="My Students" value={stats?.totalStudents || 0}
            subtext={`Class${className}${sectionName}`}
            iconBg="bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          />
        </a>
        <a href="/dashboard/attendance" className="block">
          <StatCard title="Attendance" value={`${stats?.todayAttendance?.rate || 0}%`}
            subtext={`${stats?.todayAttendance?.present || 0}/${stats?.todayAttendance?.total || 0} present`}
            iconBg="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="m9 16 2 2 4-4"/></svg>}
          />
        </a>
        <a href="/dashboard/homework" className="block">
          <StatCard title="Homework" value={stats?.pendingHomework || '—'}
            subtext="pending submissions"
            iconBg="bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>}
          />
        </a>
        <a href="/dashboard/exam" className="block">
          <StatCard title="Exams" value={stats?.upcomingExams || '—'}
            subtext="upcoming"
            iconBg="bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="m9 14 2 2 4-4"/></svg>}
          />
        </a>
      </div>

      {/* Calendar + Punch side by side */}
      {userId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AttendanceCalendar userId={userId} mode="employee" />
          <PunchCard userId={userId} />
        </div>
      )}

      {/* Today's attendance bar + Students on leave */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Today&apos;s Attendance</h3>
            <a href="/dashboard/attendance" className="text-xs text-brand-500 dark:text-brand-400 font-medium hover:underline">View all →</a>
          </div>
          <AttendanceBar
            present={stats?.todayAttendance?.present || 0}
            absent ={stats?.todayAttendance?.absent  || 0}
            late   ={stats?.todayAttendance?.late    || 0}
            total  ={stats?.todayAttendance?.total   || 0}
          />
        </SectionCard>
        <StudentsOnLeaveCard />
      </div>

      {/* Pending tasks — single card */}
      <PendingTasksCard pending={pending} />

      {/* Announcements — full width */}
      {allowed.has('announcements') && (feedReady
        ? <AnnouncementsCard announcements={announcements} />
        : <FeedSkeleton />)}
    </div>
  );
}

// ── Parent dashboard ──────────────────────────────────────────────────────────

const TODAY_STATUS_CFG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  present:  { label: 'Present',  bg: 'bg-emerald-100 dark:bg-emerald-950', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  absent:   { label: 'Absent',   bg: 'bg-red-100     dark:bg-red-950',     text: 'text-red-700     dark:text-red-400',     dot: 'bg-red-500' },
  late:     { label: 'Late',     bg: 'bg-amber-100   dark:bg-amber-950',   text: 'text-amber-700   dark:text-amber-400',   dot: 'bg-amber-500' },
  half_day: { label: 'Half Day', bg: 'bg-orange-100  dark:bg-orange-950',  text: 'text-orange-700  dark:text-orange-400',  dot: 'bg-orange-500' },
  excused:  { label: 'Excused',  bg: 'bg-blue-100    dark:bg-blue-950',    text: 'text-blue-700    dark:text-blue-400',    dot: 'bg-blue-500' },
};

const HW_SUBMISSION_CFG: Record<string, { label: string; cls: string }> = {
  submitted: { label: 'Submitted', cls: 'text-emerald-600 dark:text-emerald-400' },
  graded:    { label: 'Graded',    cls: 'text-blue-600    dark:text-blue-400' },
  late:      { label: 'Late',      cls: 'text-amber-600   dark:text-amber-400' },
  pending:   { label: 'Pending',   cls: 'text-surface-400 dark:text-gray-500' },
};

function ParentDashboard({ data, childName, childId, feedReady = true, allowed }: { data: any; childName: string; childId?: string; feedReady?: boolean; allowed: Set<string> }) {
  const { stats, recentAnnouncements: announcements = [], recentHomework: homework = [] } = data;
  const todayCfg = stats?.todayStatus ? TODAY_STATUS_CFG[stats.todayStatus] : null;
  const att  = stats?.monthAttendance;
  const fees = stats?.fees;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">
          {childName}&apos;s Dashboard
        </h1>
        <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">Viewing data for the selected child.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-children">
        <div className="card p-5">
          <p className="text-xs font-semibold text-surface-400 dark:text-gray-500 uppercase tracking-wider mb-3">Today&apos;s Attendance</p>
          {todayCfg ? (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl ${todayCfg.bg}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${todayCfg.dot}`}/>
              <span className={`text-sm font-semibold ${todayCfg.text}`}>{todayCfg.label}</span>
            </div>
          ) : (
            <p className="text-sm text-surface-400 dark:text-gray-500">Not marked yet</p>
          )}
        </div>

        <div className="card p-5">
          <p className="text-xs font-semibold text-surface-400 dark:text-gray-500 uppercase tracking-wider mb-1">This Month</p>
          <p className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">{att?.rate ?? 0}%</p>
          <p className="text-xs text-surface-400 dark:text-gray-500 mt-1">
            {att?.present ?? 0} present · {att?.absent ?? 0} absent · {att?.late ?? 0} late
          </p>
          {att?.total > 0 && (
            <div className="mt-3 h-2 rounded-full bg-surface-100 dark:bg-gray-800 overflow-hidden flex">
              <div className="bg-emerald-400 dark:bg-emerald-500" style={{ width: `${(att.present / att.total) * 100}%` }}/>
              <div className="bg-amber-400   dark:bg-amber-500"   style={{ width: `${(att.late    / att.total) * 100}%` }}/>
              <div className="bg-red-400     dark:bg-red-500"     style={{ width: `${(att.absent  / att.total) * 100}%` }}/>
            </div>
          )}
        </div>

        <div className="card p-5">
          <p className="text-xs font-semibold text-surface-400 dark:text-gray-500 uppercase tracking-wider mb-1">Fee Dues</p>
          {fees?.pending > 0 ? (
            <>
              <p className="text-2xl font-display font-bold text-amber-600 dark:text-amber-400">
                ₹{parseFloat(fees.pending).toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-surface-400 dark:text-gray-500 mt-1">
                {fees.dueCount} invoice{fees.dueCount !== 1 ? 's' : ''} pending
                {fees.overdueCount > 0 ? ` · ${fees.overdueCount} overdue` : ''}
              </p>
              <a href="/dashboard/fees" className="mt-2 inline-block text-xs text-brand-500 dark:text-brand-400 font-medium hover:underline">View invoices →</a>
            </>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500"><polyline points="20,6 9,17 4,12"/></svg>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">All fees paid</p>
            </div>
          )}
        </div>
      </div>

      {/* Child attendance calendar — full width */}
      {childId && <AttendanceCalendar studentId={childId} mode="student" />}

      {/* Homework + Announcements */}
      {(allowed.has('homework') || allowed.has('announcements')) && (feedReady ? (
        <>
          {allowed.has('homework') && (
            <SectionCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Upcoming Homework</h3>
                <a href="/dashboard/homework" className="text-xs text-brand-500 dark:text-brand-400 font-medium hover:underline">View all</a>
              </div>
              <div className="space-y-3">
                {homework.length === 0 && <p className="text-sm text-surface-400 dark:text-gray-500">No pending homework.</p>}
                {homework.map((hw: any) => {
                  const subCfg    = HW_SUBMISSION_CFG[hw.submission_status] || HW_SUBMISSION_CFG.pending;
                  const isOverdue = hw.submission_status !== 'submitted' && hw.submission_status !== 'graded' && new Date(hw.due_date) < new Date();
                  return (
                    <div key={hw.id} className="flex gap-3 p-3 rounded-xl hover:bg-surface-50 dark:hover:bg-gray-800/50 transition-colors">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isOverdue ? 'bg-red-50 dark:bg-red-950/50 text-red-500' : 'bg-brand-50 dark:bg-brand-950/50 text-brand-500'}`}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{hw.title}</p>
                        <p className="text-xs text-surface-400 dark:text-gray-500 mt-0.5">
                          {hw.subject} · Due {new Date(hw.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                        <p className={`text-xs font-medium mt-0.5 ${isOverdue ? 'text-red-500' : subCfg.cls}`}>
                          {isOverdue ? 'Overdue' : subCfg.label}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}
          {/* Announcements full width */}
          {allowed.has('announcements') && <AnnouncementsCard announcements={announcements} />}
        </>
      ) : (
        <FeedSkeleton />
      ))}
    </div>
  );
}

// ── Super admin dashboard ─────────────────────────────────────────────────────

function SuperAdminDashboard({ data }: { data: any }) {
  const s = data?.stats;
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Platform Overview</h1>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">Live stats across all schools.</p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-brand-50 to-purple-50 dark:from-brand-950/50 dark:to-purple-950/50 border border-brand-100 dark:border-brand-900 text-xs font-medium text-brand-600 dark:text-brand-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
          Super Admin
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger-children">
        <StatCard title="Schools"    value={s?.totalSchools || 0}
          subtext={`${s?.activeSchools || 0} active`}
          iconBg="bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 22V12h6v10M3 9h18M9 3v6M15 3v6"/></svg>}
        />
        <StatCard title="Students"   value={s?.totalStudents || 0}
          subtext="across all schools"
          iconBg="bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
        />
        <StatCard title="Teachers"   value={s?.totalTeachers || 0}
          subtext="across all schools"
          iconBg="bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>}
        />
        <StatCard title="Attendance" value={`${s?.todayAttendance?.rate || 0}%`}
          subtext={`${s?.todayAttendance?.present || 0}/${s?.todayAttendance?.total || 0} today`}
          iconBg="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="m9 16 2 2 4-4"/></svg>}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a href="/dashboard/schools" className="card p-5 hover:shadow-md transition-all group cursor-pointer block">
          <p className="text-xs font-semibold text-surface-400 dark:text-gray-500 uppercase tracking-wider mb-1">School Library</p>
          <p className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">{s?.totalSchools || 0} <span className="text-base font-normal text-surface-400">schools</span></p>
          <p className="text-xs text-brand-500 dark:text-brand-400 mt-2 font-medium group-hover:underline">Manage all schools →</p>
        </a>
        <a href="/dashboard/schools/default" className="card p-5 hover:shadow-md transition-all group cursor-pointer block">
          <p className="text-xs font-semibold text-surface-400 dark:text-gray-500 uppercase tracking-wider mb-1">Default School Settings</p>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-2">Configuration Template</p>
          <p className="text-xs text-surface-400 dark:text-gray-500 mt-1">Base config for new school onboarding</p>
          <p className="text-xs text-brand-500 dark:text-brand-400 mt-2 font-medium group-hover:underline">Configure →</p>
        </a>
      </div>
    </div>
  );
}

// ── No child prompt ───────────────────────────────────────────────────────────

function NoChildPrompt() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-950/50 flex items-center justify-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-400">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </div>
      <div>
        <h2 className="text-lg font-display font-bold text-gray-900 dark:text-gray-100">No child selected</h2>
        <p className="text-sm text-surface-400 dark:text-gray-500 mt-1 max-w-xs">
          Use the child switcher in the top bar to select one of your children and view their dashboard.
        </p>
      </div>
    </div>
  );
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function StatsSkeleton({ cols = 3 }: { cols?: number }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-${cols} gap-4`}>
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="card p-5 h-28 animate-pulse bg-surface-100 dark:bg-gray-800"/>
      ))}
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="card p-6 space-y-3">
      <div className="h-4 w-32 bg-surface-100 dark:bg-gray-800 rounded animate-pulse"/>
      {[1, 2, 3].map(j => (
        <div key={j} className="flex gap-3 animate-pulse">
          <div className="w-10 h-10 rounded-lg bg-surface-100 dark:bg-gray-800 shrink-0"/>
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-surface-100 dark:bg-gray-800 rounded w-3/4"/>
            <div className="h-2.5 bg-surface-100 dark:bg-gray-800 rounded w-1/2"/>
          </div>
        </div>
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-surface-200 dark:bg-gray-800 rounded-lg animate-pulse"/>
      <StatsSkeleton cols={3} />
      <FeedSkeleton />
    </div>
  );
}

// ── Default allowed keys ──────────────────────────────────────────────────────

const ALL_KEYS = new Set([
  'dashboard','admissions','classes','students','teachers','parents','attendance',
  'fees','scheduling','homework','performance','announcements','leave','queries',
  'transport','compliance','reports','settings',
]);

// ── Main export ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [stats,       setStats]       = useState<any>(null);
  const [feed,        setFeed]        = useState<any>(null);
  const [role,        setRole]        = useState<string | null>(null);
  const [userId,      setUserId]      = useState('');
  const [activeChild, setActiveChild] = useState<any>(null);
  const [isParent,    setIsParent]    = useState(false);
  const [allowed,     setAllowed]     = useState<Set<string>>(ALL_KEYS);
  const [pending,     setPending]     = useState<{ admissions: any[]; leaves: any[] } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const userRaw = localStorage.getItem('user');
    const userRole = userRaw ? (JSON.parse(userRaw).primaryRole ?? '') : '';
    if (userRole === 'super_admin') return;
    fetch('/api/menu-permissions', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.menuKeys)) setAllowed(new Set(d.menuKeys)); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const userRaw = localStorage.getItem('user');
    const userRole = userRaw ? (JSON.parse(userRaw).primaryRole ?? '') : '';
    if (['super_admin','parent','student'].includes(userRole)) return;
    fetch('/api/workflow/pending', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.admissions || d.leaves) setPending(d); })
      .catch(() => {});
  }, []);

  const fetchDashboard = useCallback((child: any) => {
    setStats(null);
    setFeed(null);
    const token = localStorage.getItem('token');
    const url   = child ? `/api/dashboard?student_id=${child.id}` : '/api/dashboard';

    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        setStats(d);
        setRole(d?.role ?? null);
        requestAnimationFrame(() => {
          setFeed({
            recentAnnouncements: d?.recentAnnouncements ?? [],
            recentHomework:      d?.recentHomework      ?? [],
          });
        });
      })
      .catch(() => {
        setStats({});
        setFeed({ recentAnnouncements: [], recentHomework: [] });
      });
  }, []);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) { fetchDashboard(null); return; }
    try {
      const user       = JSON.parse(userData);
      const parentRole = user.primaryRole === 'parent';
      setIsParent(parentRole);
      setUserId(user.id || '');
      if (parentRole) {
        const stored = localStorage.getItem('activeChild');
        const child  = stored ? JSON.parse(stored) : null;
        setActiveChild(child);
        fetchDashboard(child);
      } else {
        fetchDashboard(null);
      }
    } catch {
      fetchDashboard(null);
    }
  }, [fetchDashboard]);

  useEffect(() => {
    const handler = (e: Event) => {
      const child = (e as CustomEvent).detail;
      setActiveChild(child);
      fetchDashboard(child);
    };
    window.addEventListener('activeChildChanged', handler);
    return () => window.removeEventListener('activeChildChanged', handler);
  }, [fetchDashboard]);

  const data = stats ? { ...stats, ...(feed ?? {}) } : null;

  if (!stats) return <LoadingSkeleton />;

  if (isParent) {
    if (!activeChild) return <NoChildPrompt />;
    const childName = `${activeChild.first_name} ${activeChild.last_name}`;
    return <ParentDashboard data={data || {}} childName={childName} childId={activeChild.id} feedReady={!!feed} allowed={allowed} />;
  }

  if (data?.isSuperAdmin) return <SuperAdminDashboard data={data} />;
  if (role === 'teacher')  return <TeacherDashboard  data={data} feedReady={!!feed} allowed={allowed} pending={pending} userId={userId} />;
  return <AdminDashboard data={data} feedReady={!!feed} allowed={allowed} pending={pending} userId={userId} />;
}
