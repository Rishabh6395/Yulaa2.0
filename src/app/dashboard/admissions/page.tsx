'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useApi } from '@/hooks/useApi';

const STATUS_COLORS: Record<string, string> = {
  submitted:    'badge-warning',
  under_review: 'badge-info',
  approved:     'badge-success',
  rejected:     'badge-danger',
};

const RISK_COLOR = (score: number) =>
  score >= 60 ? 'text-red-600 dark:text-red-400' :
  score >= 30 ? 'text-amber-600 dark:text-amber-400' :
  'text-emerald-600 dark:text-emerald-400';

export default function AdmissionsPage() {
  const [page,         setPage]         = useState(1);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const params = new URLSearchParams({ page: page.toString(), limit: '20' });
  if (search)       params.set('search', search);
  if (statusFilter) params.set('status', statusFilter);

  const { data, isLoading, mutate } = useApi<{ applications: any[]; total: number; totalPages: number }>(`/api/admission/applications?${params}`);
  const applications = data?.applications ?? [];
  const total        = data?.total ?? 0;
  const totalPages   = data?.totalPages ?? 1;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Admissions</h1>
          <p className="text-sm text-surface-400 mt-0.5">{total} applications total</p>
        </div>
        <Link href="/dashboard/admissions/workflow" className="btn-secondary text-sm flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          Workflow Config
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text" placeholder="Search by name or phone…" className="input-field max-w-xs"
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        <select className="input-field max-w-[170px]" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr><th>Parent</th><th>Children</th><th>Classes</th><th>Risk</th><th>Status</th><th>Submitted</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                    <td key={j}><div className="h-4 bg-surface-100 rounded animate-pulse w-20"/></td>
                  ))}</tr>
                ))
              ) : applications.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-surface-400">No applications found</td></tr>
              ) : applications.map((app) => (
                <tr key={app.id}>
                  <td>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{app.parent_name}</p>
                    <p className="text-xs text-surface-400">{app.parent_phone}</p>
                  </td>
                  <td><span className="font-medium">{app.children_count}</span></td>
                  <td className="text-xs text-surface-400 max-w-[120px] truncate">
                    {app.children?.map((c: any) => c.class).join(', ') || '—'}
                  </td>
                  <td>
                    <span className={`text-xs font-bold ${RISK_COLOR(app.risk_score)}`}>
                      {app.risk_score}
                    </span>
                  </td>
                  <td><span className={STATUS_COLORS[app.status] || 'badge-neutral'}>{app.status.replace('_', ' ')}</span></td>
                  <td className="text-xs text-surface-400">
                    {new Date(app.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td>
                    <Link href={`/dashboard/admissions/${app.id}`} className="text-xs bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400 px-2.5 py-1 rounded-lg hover:bg-brand-100 font-medium transition-colors">
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-100">
            <p className="text-xs text-surface-400">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs py-1.5 px-3">Previous</button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs py-1.5 px-3">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
