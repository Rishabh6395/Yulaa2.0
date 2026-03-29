'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/useApi';

const STATUS_COLORS: Record<string, string> = {
  submitted:    'badge-warning',
  under_review: 'badge-info',
  approved:     'badge-success',
  rejected:     'badge-danger',
};

const FLAG_COLORS: Record<string, string> = {
  error:   'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900',
  warning: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900',
};

export default function ApplicationDetailPage({ params }: { params: { id: string } }) {
  const router    = useRouter();
  const [comment, setComment] = useState('');
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState('');

  const { data, isLoading, mutate } = useApi<{ application: any }>(`/api/admission/applications/${params.id}`);
  const app     = data?.application;
  const flags   = (app?.validationFlags as any[]) ?? [];
  const actions = app?.actions ?? [];
  const steps   = app?.workflow?.steps ?? [];

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const handleAction = async (action: 'approve' | 'reject') => {
    setBusy(true); setError('');
    const res = await fetch(`/api/admission/applications/${params.id}/action`, {
      method: 'POST', headers, body: JSON.stringify({ action, comment }),
    });
    const d = await res.json();
    if (!res.ok) { setError(d.error || 'Action failed'); setBusy(false); return; }
    mutate();
    setBusy(false);
    setComment('');
  };

  if (isLoading) return <div className="card p-12 text-center text-surface-400 animate-pulse">Loading application…</div>;
  if (!app)      return <div className="card p-12 text-center text-surface-400">Application not found</div>;

  const isFinal = app.status === 'approved' || app.status === 'rejected';
  const riskColor = app.riskScore >= 60 ? 'text-red-600' : app.riskScore >= 30 ? 'text-amber-600' : 'text-emerald-600';

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => router.back()} className="text-sm text-surface-400 hover:text-gray-700 mb-2 flex items-center gap-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Back to queue
          </button>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">{app.parentName}</h1>
          <p className="text-sm text-surface-400 mt-0.5">{app.parentPhone} · {app.parentEmail}</p>
        </div>
        <div className="text-right">
          <span className={STATUS_COLORS[app.status] || 'badge-neutral'}>{app.status.replace('_', ' ')}</span>
          <p className={`text-2xl font-bold mt-2 ${riskColor}`}>{app.riskScore}<span className="text-sm font-normal text-surface-400">/100 risk</span></p>
        </div>
      </div>

      {/* AI flags */}
      {flags.length > 0 && (
        <div className="card p-5 space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            AI Validation Flags
          </h3>
          {flags.map((f: any, i: number) => (
            <div key={i} className={`text-xs px-3 py-2 rounded-lg border ${FLAG_COLORS[f.severity]}`}>
              <span className="font-bold uppercase mr-2">{f.severity}</span>
              Child {f.childIndex + 1}: {f.message}
            </div>
          ))}
        </div>
      )}

      {/* Children */}
      {app.children?.map((child: any, i: number) => (
        <div key={child.id} className="card p-5 space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Child {i + 1} — {child.firstName} {child.lastName}</h3>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div><p className="text-surface-400 text-xs">Date of Birth</p><p>{new Date(child.dateOfBirth).toLocaleDateString('en-IN')}</p></div>
            <div><p className="text-surface-400 text-xs">Gender</p><p className="capitalize">{child.gender}</p></div>
            <div><p className="text-surface-400 text-xs">Class Applying</p><p>{child.classApplying}</p></div>
            {child.aadhaarNo && <div><p className="text-surface-400 text-xs">Aadhaar</p><p className="font-mono">{child.aadhaarNo}</p></div>}
            {child.previousSchool && <div className="col-span-2"><p className="text-surface-400 text-xs">Previous School</p><p>{child.previousSchool}</p></div>}
            {child.studentId && <div><p className="text-surface-400 text-xs">Student ID</p><p className="text-brand-600 dark:text-brand-400 font-mono text-xs">{child.studentId}</p></div>}
          </div>
        </div>
      ))}

      {/* Workflow steps */}
      {steps.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Approval Workflow</h3>
          <div className="space-y-2">
            {steps.map((s: any) => {
              const done = app.currentStep > s.stepOrder || app.status === 'approved';
              const active = app.currentStep === s.stepOrder && !isFinal;
              return (
                <div key={s.id} className={`flex items-center gap-3 text-sm px-3 py-2 rounded-lg ${active ? 'bg-brand-50 dark:bg-brand-950/30' : ''}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${done ? 'bg-emerald-500 text-white' : active ? 'bg-brand-500 text-white' : 'bg-surface-100 text-surface-400'}`}>
                    {done ? '✓' : s.stepOrder}
                  </div>
                  <span className={active ? 'font-semibold text-brand-700 dark:text-brand-400' : done ? 'text-emerald-700 dark:text-emerald-400' : 'text-surface-400'}>{s.label}</span>
                  <span className="text-xs text-surface-400 ml-auto">{s.approverRole}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action timeline */}
      {actions.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Action History</h3>
          <div className="space-y-3">
            {actions.map((a: any) => (
              <div key={a.id} className="flex gap-3 text-sm">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${a.action === 'approve' ? 'bg-emerald-500' : a.action === 'reject' ? 'bg-red-500' : 'bg-surface-300'}`}/>
                <div>
                  <p>
                    <span className="font-medium capitalize">{a.action}d</span>
                    {a.actorUser && <span className="text-surface-400"> by {a.actorUser.firstName} {a.actorUser.lastName}</span>}
                  </p>
                  {a.comment && <p className="text-surface-400 text-xs mt-0.5">{a.comment}</p>}
                  <p className="text-surface-300 text-xs">{new Date(a.createdAt).toLocaleString('en-IN')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approve / Reject panel */}
      {!isFinal && (
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Take Action</h3>
          {error && <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-3 py-2 rounded-lg">{error}</div>}
          <textarea
            className="input-field"
            rows={2}
            placeholder="Add a comment (optional)…"
            value={comment}
            onChange={e => setComment(e.target.value)}
          />
          <div className="flex gap-3">
            <button onClick={() => handleAction('reject')} disabled={busy} className="flex-1 text-sm bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 px-4 py-2.5 rounded-xl hover:bg-red-100 font-medium transition-colors disabled:opacity-50">
              Reject
            </button>
            <button onClick={() => handleAction('approve')} disabled={busy} className="flex-2 btn-primary flex-1">
              {busy ? 'Processing…' : steps.length > 0 && app.currentStep < steps[steps.length - 1]?.stepOrder ? 'Advance to Next Step' : 'Final Approve'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
