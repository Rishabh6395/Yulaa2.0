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

// ── New Application Modal ─────────────────────────────────────────────────────

interface ChildEntry { name: string; grade: string; dob: string }

function NewApplicationModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [parentName,  setParentName]  = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [children,    setChildren]    = useState<ChildEntry[]>([{ name: '', grade: '', dob: '' }]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  const addChild    = () => setChildren(c => [...c, { name: '', grade: '', dob: '' }]);
  const removeChild = (i: number) => setChildren(c => c.filter((_, idx) => idx !== i));
  const updateChild = (i: number, field: keyof ChildEntry, val: string) =>
    setChildren(c => c.map((ch, idx) => idx === i ? { ...ch, [field]: val } : ch));

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user     = JSON.parse(localStorage.getItem('user') || '{}');
      const token    = localStorage.getItem('token');
      const schoolId = user.schoolId;
      if (!schoolId) { setError('School ID not found. Please log in again.'); return; }

      const res  = await fetch('/api/admission/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          schoolId,
          parentName,
          parentPhone,
          parentEmail,
          children: children.map(c => ({
            name:  c.name,
            class: c.grade,
            dob:   c.dob || undefined,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Submission failed'); return; }
      onSuccess();
      onClose();
    } catch { setError('Network error. Please try again.'); }
    finally   { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-900 px-6 pt-6 pb-4 border-b border-surface-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-lg font-display font-bold text-gray-900 dark:text-gray-100">New Admission Application</h3>
          <button onClick={onClose} className="text-surface-400 hover:text-gray-700 dark:hover:text-gray-300">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 px-3 py-2 rounded-lg">{error}</p>}

          <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Parent / Guardian</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name *</label>
              <input className="input-field" value={parentName} onChange={e => setParentName(e.target.value)}
                placeholder="Parent full name" required />
            </div>
            <div>
              <label className="label">Phone *</label>
              <input className="input-field" type="tel" value={parentPhone} onChange={e => setParentPhone(e.target.value)}
                placeholder="10-digit mobile" required />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Email</label>
              <input className="input-field" type="email" value={parentEmail} onChange={e => setParentEmail(e.target.value)}
                placeholder="parent@email.com" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Children</p>
            <button type="button" onClick={addChild}
              className="text-xs text-brand-600 dark:text-brand-400 font-medium hover:underline flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
              Add child
            </button>
          </div>

          {children.map((ch, i) => (
            <div key={i} className="p-4 rounded-xl border border-surface-200 dark:border-gray-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Child {i + 1}</span>
                {children.length > 1 && (
                  <button type="button" onClick={() => removeChild(i)} className="text-red-500 hover:text-red-700">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Name *</label>
                  <input className="input-field" value={ch.name} onChange={e => updateChild(i, 'name', e.target.value)}
                    placeholder="Child name" required />
                </div>
                <div>
                  <label className="label">Applying for Class *</label>
                  <input className="input-field" value={ch.grade} onChange={e => updateChild(i, 'grade', e.target.value)}
                    placeholder="e.g. Grade 5" required />
                </div>
                <div className="col-span-2">
                  <label className="label">Date of Birth</label>
                  <input className="input-field" type="date" value={ch.dob} onChange={e => updateChild(i, 'dob', e.target.value)} />
                </div>
              </div>
            </div>
          ))}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary py-2.5">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 btn-primary py-2.5">
              {loading ? 'Submitting…' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdmissionsPage() {
  const [page,         setPage]         = useState(1);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showNewApp,   setShowNewApp]   = useState(false);

  const params = new URLSearchParams({ page: page.toString(), limit: '20' });
  if (search)       params.set('search', search);
  if (statusFilter) params.set('status', statusFilter);

  const { data, isLoading, mutate } = useApi<{ applications: any[]; total: number; totalPages: number }>(`/api/admission/applications?${params}`);
  const applications = data?.applications ?? [];
  const total        = data?.total ?? 0;
  const totalPages   = data?.totalPages ?? 1;

  return (
    <div className="space-y-6 animate-fade-in">
      {showNewApp && (
        <NewApplicationModal
          onClose={() => setShowNewApp(false)}
          onSuccess={() => mutate()}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Admissions</h1>
          <p className="text-sm text-surface-400 mt-0.5">{total} applications total</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewApp(true)}
            className="btn-primary text-sm flex items-center gap-2"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            New Application
          </button>
          <Link href="/dashboard/admissions/workflow" className="btn-secondary text-sm flex items-center gap-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            Workflow Config
          </Link>
        </div>
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
