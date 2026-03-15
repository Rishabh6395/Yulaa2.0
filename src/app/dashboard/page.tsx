'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Shared helpers ───────────────────────────────────────────────────────────

function AnnouncementTypeIcon({ type }: { type: string }) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    event: { bg: 'bg-blue-100', text: 'text-blue-600', label: 'Event' },
    fee_reminder: { bg: 'bg-amber-100', text: 'text-amber-600', label: 'Fee' },
    holiday: { bg: 'bg-emerald-100', text: 'text-emerald-600', label: 'Holiday' },
    urgent: { bg: 'bg-red-100', text: 'text-red-600', label: 'Urgent' },
    general: { bg: 'bg-surface-100', text: 'text-surface-500', label: 'General' },
    exam: { bg: 'bg-purple-100', text: 'text-purple-600', label: 'Exam' },
  };
  const s = styles[type] || styles.general;
  return <span className={`${s.bg} ${s.text} text-[10px] font-bold px-2 py-0.5 rounded-md uppercase`}>{s.label}</span>;
}

// ─── Admin / Teacher dashboard ────────────────────────────────────────────────

function StatCard({ title, value, subtext, icon, color, trend }: {
  title: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  color: string;
  trend?: number;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="card p-5 hover:shadow-card-hover transition-shadow">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-display font-bold text-gray-900">{value}</p>
          {subtext && <p className="text-xs text-surface-400">{subtext}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl ${colorMap[color] || colorMap.blue} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      {trend !== undefined && (
        <div className={`mt-3 flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            {trend >= 0 ? <polyline points="18,15 12,9 6,15"/> : <polyline points="6,9 12,15 18,9"/>}
          </svg>
          {Math.abs(trend)}% from last week
        </div>
      )}
    </div>
  );
}

function AttendanceBar({ present, absent, late, total }: { present: number; absent: number; late: number; total: number }) {
  if (total === 0) return <p className="text-sm text-surface-400">No data for today</p>;
  const pPct = (present / total) * 100;
  const lPct = (late / total) * 100;
  const aPct = (absent / total) * 100;
  return (
    <div className="space-y-3">
      <div className="h-3 rounded-full overflow-hidden bg-surface-100 flex">
        <div className="bg-emerald-400 transition-all" style={{ width: `${pPct}%` }}/>
        <div className="bg-amber-400 transition-all" style={{ width: `${lPct}%` }}/>
        <div className="bg-red-400 transition-all" style={{ width: `${aPct}%` }}/>
      </div>
      <div className="flex gap-4 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400"/> Present: {present}</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"/> Late: {late}</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400"/> Absent: {absent}</span>
      </div>
    </div>
  );
}

function AdminDashboard({ data }: { data: any }) {
  const stats = data?.stats;
  const announcements = data?.recentAnnouncements || [];
  const homework = data?.recentHomework || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-surface-400 mt-0.5">Welcome back. Here&apos;s your school overview.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Students" value={stats?.totalStudents || 0} subtext={`${stats?.pendingAdmissions || 0} pending admissions`} color="blue"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>}
        />
        <StatCard title="Today's Attendance" value={`${stats?.todayAttendance?.rate || 0}%`} subtext={`${stats?.todayAttendance?.present || 0} / ${stats?.todayAttendance?.total || 0} present`} color="green" trend={3}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="m9 16 2 2 4-4"/></svg>}
        />
        <StatCard title="Fee Collection" value={`₹${((stats?.fees?.collected || 0) / 1000).toFixed(0)}K`} subtext={`₹${((stats?.fees?.pending || 0) / 1000).toFixed(0)}K pending`} color="amber"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>}
        />
        <StatCard title="Teachers" value={stats?.totalTeachers || 0} subtext={`${stats?.totalClasses || 0} active classes`} color="purple"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Today&apos;s Attendance Overview</h3>
          <AttendanceBar
            present={stats?.todayAttendance?.present || 0}
            absent={stats?.todayAttendance?.absent || 0}
            late={stats?.todayAttendance?.late || 0}
            total={stats?.todayAttendance?.total || 0}
          />
        </div>
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Fee Collection Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-surface-400">Collected</span>
              <span className="text-sm font-semibold text-emerald-600">₹{(stats?.fees?.collected || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="h-2.5 rounded-full bg-surface-100 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all"
                style={{ width: `${stats?.fees?.totalFees > 0 ? (stats.fees.collected / stats.fees.totalFees * 100) : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-surface-400">
              <span>₹{(stats?.fees?.pending || 0).toLocaleString('en-IN')} pending</span>
              <span>{stats?.fees?.overdueCount || 0} overdue invoices</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnnouncementsCard announcements={announcements} />
        <HomeworkCard homework={homework} />
      </div>
    </div>
  );
}

// ─── Parent dashboard ─────────────────────────────────────────────────────────

const todayStatusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  present: { label: 'Present', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  absent:  { label: 'Absent',  bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500' },
  late:    { label: 'Late',    bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  half_day:{ label: 'Half Day',bg: 'bg-orange-100',  text: 'text-orange-700',  dot: 'bg-orange-500' },
  excused: { label: 'Excused', bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500' },
};

const hwSubmissionConfig: Record<string, { label: string; cls: string }> = {
  submitted: { label: 'Submitted', cls: 'text-emerald-600' },
  graded:    { label: 'Graded',    cls: 'text-blue-600' },
  late:      { label: 'Late',      cls: 'text-amber-600' },
  pending:   { label: 'Pending',   cls: 'text-surface-400' },
};

function ParentDashboard({ data, childName }: { data: any; childName: string }) {
  const { stats, recentAnnouncements: announcements = [], recentHomework: homework = [] } = data;

  const todayCfg = stats?.todayStatus ? todayStatusConfig[stats.todayStatus] : null;
  const att = stats?.monthAttendance;
  const fees = stats?.fees;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">
          {childName}&apos;s Dashboard
        </h1>
        <p className="text-sm text-surface-400 mt-0.5">Viewing data for the selected child.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Today attendance */}
        <div className="card p-5">
          <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Today&apos;s Attendance</p>
          {todayCfg ? (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl ${todayCfg.bg}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${todayCfg.dot}`}/>
              <span className={`text-sm font-semibold ${todayCfg.text}`}>{todayCfg.label}</span>
            </div>
          ) : (
            <p className="text-sm text-surface-400">Not marked yet</p>
          )}
        </div>

        {/* Monthly attendance */}
        <div className="card p-5">
          <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-1">This Month</p>
          <p className="text-2xl font-display font-bold text-gray-900">{att?.rate ?? 0}%</p>
          <p className="text-xs text-surface-400 mt-1">
            {att?.present ?? 0} present · {att?.absent ?? 0} absent · {att?.late ?? 0} late
          </p>
          {att?.total > 0 && (
            <div className="mt-3 h-2 rounded-full bg-surface-100 overflow-hidden flex">
              <div className="bg-emerald-400" style={{ width: `${(att.present / att.total) * 100}%` }}/>
              <div className="bg-amber-400"   style={{ width: `${(att.late    / att.total) * 100}%` }}/>
              <div className="bg-red-400"     style={{ width: `${(att.absent  / att.total) * 100}%` }}/>
            </div>
          )}
        </div>

        {/* Fee dues */}
        <div className="card p-5">
          <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-1">Fee Dues</p>
          {fees?.pending > 0 ? (
            <>
              <p className="text-2xl font-display font-bold text-amber-600">
                ₹{parseFloat(fees.pending).toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-surface-400 mt-1">
                {fees.dueCount} invoice{fees.dueCount !== 1 ? 's' : ''} pending
                {fees.overdueCount > 0 ? ` · ${fees.overdueCount} overdue` : ''}
              </p>
              <a href="/dashboard/fees" className="mt-2 inline-block text-xs text-brand-500 font-medium hover:underline">
                View invoices →
              </a>
            </>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500">
                <polyline points="20,6 9,17 4,12"/>
              </svg>
              <p className="text-sm font-semibold text-emerald-600">All fees paid</p>
            </div>
          )}
        </div>
      </div>

      {/* Homework & Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming homework */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Upcoming Homework</h3>
            <a href="/dashboard/homework" className="text-xs text-brand-500 font-medium hover:underline">View all</a>
          </div>
          <div className="space-y-3">
            {homework.length === 0 && <p className="text-sm text-surface-400">No pending homework.</p>}
            {homework.map((hw: any) => {
              const subCfg = hwSubmissionConfig[hw.submission_status] || hwSubmissionConfig.pending;
              const isOverdue = hw.submission_status !== 'submitted' && hw.submission_status !== 'graded' && new Date(hw.due_date) < new Date();
              return (
                <div key={hw.id} className="flex gap-3 p-3 rounded-xl hover:bg-surface-50 transition-colors">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isOverdue ? 'bg-red-50 text-red-500' : 'bg-brand-50 text-brand-500'}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{hw.title}</p>
                    <p className="text-xs text-surface-400 mt-0.5">
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
        </div>

        <AnnouncementsCard announcements={announcements} />
      </div>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function AnnouncementsCard({ announcements }: { announcements: any[] }) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Recent Announcements</h3>
        <a href="/dashboard/announcements" className="text-xs text-brand-500 font-medium hover:underline">View all</a>
      </div>
      <div className="space-y-3">
        {announcements.length === 0 && <p className="text-sm text-surface-400">No announcements yet.</p>}
        {announcements.map((a: any) => (
          <div key={a.id} className="flex gap-3 p-3 rounded-xl hover:bg-surface-50 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <AnnouncementTypeIcon type={a.type} />
                <span className="text-[10px] text-surface-400">
                  {new Date(a.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
              <p className="text-xs text-surface-400 line-clamp-1 mt-0.5">{a.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HomeworkCard({ homework }: { homework: any[] }) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Recent Homework</h3>
        <a href="/dashboard/homework" className="text-xs text-brand-500 font-medium hover:underline">View all</a>
      </div>
      <div className="space-y-3">
        {homework.length === 0 && <p className="text-sm text-surface-400">No homework assigned yet.</p>}
        {homework.map((hw: any) => (
          <div key={hw.id} className="flex gap-3 p-3 rounded-xl hover:bg-surface-50 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-500 flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{hw.title}</p>
              <p className="text-xs text-surface-400 mt-0.5">
                {hw.subject} · {hw.grade} {hw.section} · Due {new Date(hw.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── "No child selected" prompt ───────────────────────────────────────────────

function NoChildPrompt() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-400">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </div>
      <div>
        <h2 className="text-lg font-display font-bold text-gray-900">No child selected</h2>
        <p className="text-sm text-surface-400 mt-1 max-w-xs">
          Use the child switcher in the top bar to select one of your children and view their dashboard.
        </p>
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-surface-200 rounded-lg animate-pulse"/>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="card p-5 h-28 animate-pulse bg-surface-100"/>)}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeChild, setActiveChild] = useState<any>(null);
  const [isParent, setIsParent] = useState(false);

  const fetchDashboard = useCallback((child: any) => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const url = child
      ? `/api/dashboard?student_id=${child.id}`
      : '/api/dashboard';

    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        const parentRole = user.primaryRole === 'parent';
        setIsParent(parentRole);

        if (parentRole) {
          const stored = localStorage.getItem('activeChild');
          const child = stored ? JSON.parse(stored) : null;
          setActiveChild(child);
          fetchDashboard(child);
        } else {
          fetchDashboard(null);
        }
      } catch {
        fetchDashboard(null);
      }
    } else {
      fetchDashboard(null);
    }
  }, [fetchDashboard]);

  // React to child switch events (from ChildSwitcher in Header)
  useEffect(() => {
    const handler = (e: Event) => {
      const child = (e as CustomEvent).detail;
      setActiveChild(child);
      fetchDashboard(child);
    };
    window.addEventListener('activeChildChanged', handler);
    return () => window.removeEventListener('activeChildChanged', handler);
  }, [fetchDashboard]);

  if (loading) return <LoadingSkeleton />;

  if (isParent) {
    if (!activeChild) return <NoChildPrompt />;
    const childName = `${activeChild.first_name} ${activeChild.last_name}`;
    return <ParentDashboard data={data || {}} childName={childName} />;
  }

  return <AdminDashboard data={data || {}} />;
}
