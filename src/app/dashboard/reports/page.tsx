'use client';

import { useState, useEffect, useCallback } from 'react';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function StatCard({ title, value, sub, color = 'brand' }: { title: string; value: string | number; sub?: string; color?: string }) {
  const colors: Record<string, string> = {
    brand:   'bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
    amber:   'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
    red:     'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400',
    blue:    'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
  };
  return (
    <div className={`rounded-2xl border border-surface-100 dark:border-gray-800 p-5 ${colors[color] ?? colors.brand}`}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">{title}</p>
      <p className="text-2xl font-display font-bold">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h3>
      {children}
    </div>
  );
}

// Simple bar chart using div widths
function MiniBarChart({ data }: { data: { date: string; present: number; absent: number }[] }) {
  if (!data.length) return <p className="text-xs text-surface-400 dark:text-gray-500">No data</p>;
  const max = Math.max(...data.map(d => d.present + d.absent), 1);
  return (
    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
      {data.map(d => {
        const total = d.present + d.absent;
        const pct   = Math.round(total > 0 ? (d.present / total) * 100 : 0);
        return (
          <div key={d.date} className="flex items-center gap-2 text-xs">
            <span className="w-20 flex-shrink-0 text-surface-500 dark:text-gray-400">
              {new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
            </span>
            <div className="flex-1 h-4 bg-surface-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 dark:bg-emerald-600 rounded-full transition-all"
                style={{ width: `${(total / max) * 100}%` }} />
            </div>
            <span className="w-12 text-right font-medium text-gray-700 dark:text-gray-300">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

export default function ReportsPage() {
  const now = new Date();
  const [year,    setYear]    = useState(now.getFullYear());
  const [month,   setMonth]   = useState(now.getMonth() + 1);
  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [token,   setToken]   = useState('');

  useEffect(() => { setToken(localStorage.getItem('token') ?? ''); }, []);

  const fetchReport = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const res  = await fetch(`/api/reports/monthly?year=${year}&month=${month}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [token, year, month]);

  useEffect(() => { if (token) fetchReport(); }, [fetchReport]);

  const handleExportCSV = () => {
    if (!data) return;
    const rows = [
      ['Report', `${MONTHS[month - 1]} ${year}`],
      [],
      ['== Overview =='],
      ['Students', data.overview.studentCount],
      ['Teachers', data.overview.teacherCount],
      ['New Admissions', data.overview.newStudents],
      [],
      ['== Attendance =='],
      ['Total Records', data.attendance.total],
      ['Present', data.attendance.present],
      ['Absent', data.attendance.absent],
      ['Late', data.attendance.late],
      ['Rate %', data.attendance.rate],
      [],
      ['== Fees =='],
      ['Total Due', data.fees.totalDue],
      ['Collected', data.fees.collected],
      ['Pending Invoices', data.fees.pending],
      ['Overdue Invoices', data.fees.overdue],
      ['Collection Rate %', data.fees.collectionRate],
      [],
      ['== Homework =='],
      ['Assigned', data.homework.total],
      [],
      ['== Leave =='],
      ['Approved', data.leave.approved],
      ['Pending', data.leave.pending],
      ['Rejected', data.leave.rejected],
      [],
      ['== Queries =='],
      ['Open', data.queries.open],
      ['Resolved', data.queries.resolved],
    ];
    const csv  = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `report-${year}-${String(month).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Monthly Reports</h1>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">Module-wise summary for any month.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            className="px-3 py-2 rounded-xl border border-surface-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-300">
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="px-3 py-2 rounded-xl border border-surface-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-300">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {data && (
            <button onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-surface-200 dark:border-gray-700 text-sm font-medium text-surface-600 dark:text-gray-300 hover:bg-surface-50 dark:hover:bg-gray-800">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export CSV
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-2xl bg-surface-100 dark:bg-gray-800 animate-pulse"/>)}
        </div>
      )}

      {!loading && data && (
        <>
          {/* Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard title="Active Students"   value={data.overview.studentCount} color="brand" />
            <StatCard title="Active Teachers"   value={data.overview.teacherCount} color="blue" />
            <StatCard title="New Admissions"    value={data.overview.newStudents}  color="emerald" sub="This month" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Attendance */}
            <SectionCard title="Attendance">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <StatCard title="Attendance Rate" value={`${data.attendance.rate}%`} color="emerald" />
                <StatCard title="Total Records"   value={data.attendance.total}      color="brand"   />
                <StatCard title="Present"         value={data.attendance.present}    color="emerald" />
                <StatCard title="Absent"          value={data.attendance.absent}     color="red"     />
              </div>
              <h4 className="text-xs font-semibold text-surface-500 dark:text-gray-400 uppercase tracking-wider mb-2">Daily Breakdown</h4>
              <MiniBarChart data={data.attendance.byDay} />
            </SectionCard>

            {/* Fees */}
            <SectionCard title="Fee Collection">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <StatCard title="Collection Rate" value={`${data.fees.collectionRate}%`} color="emerald" />
                <StatCard title="Total Due"        value={`₹${(data.fees.totalDue / 1000).toFixed(1)}K`} color="brand" />
                <StatCard title="Collected"        value={`₹${(data.fees.collected / 1000).toFixed(1)}K`} color="emerald" />
                <StatCard title="Overdue"          value={data.fees.overdue} sub="invoices" color="red" />
              </div>
              <div className="h-3 bg-surface-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${data.fees.collectionRate >= 80 ? 'bg-emerald-500' : data.fees.collectionRate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${data.fees.collectionRate}%` }} />
              </div>
              <p className="text-xs text-surface-400 dark:text-gray-500 mt-1">
                ₹{data.fees.collected.toLocaleString()} collected of ₹{data.fees.totalDue.toLocaleString()}
              </p>
            </SectionCard>

            {/* Homework + Queries */}
            <SectionCard title="Homework & Queries">
              <div className="grid grid-cols-2 gap-3">
                <StatCard title="Homework Assigned" value={data.homework.total}      color="blue"  />
                <StatCard title="Queries Open"      value={data.queries.open}        color="amber" />
                <StatCard title="Queries Resolved"  value={data.queries.resolved}    color="emerald" />
              </div>
            </SectionCard>

            {/* Leave */}
            <SectionCard title="Leave Requests">
              <div className="grid grid-cols-3 gap-3">
                <StatCard title="Approved"  value={data.leave.approved}  color="emerald" />
                <StatCard title="Pending"   value={data.leave.pending}   color="amber"   />
                <StatCard title="Rejected"  value={data.leave.rejected}  color="red"     />
              </div>
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}
