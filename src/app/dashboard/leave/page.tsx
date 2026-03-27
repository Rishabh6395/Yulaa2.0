'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { useApi } from '@/hooks/useApi';

// ─── Leave type icon mapping (extended, fallback to 📋) ──────────────────────

const LEAVE_TYPE_ICON: Record<string, string> = {
  sick: '🤒', emergency: '🚨', casual: '☀️', other: '📋',
  earned: '🏖️', maternity: '👶', paternity: '👨‍👦', unpaid: '💸', comp: '🔄',
};
function leaveIcon(code: string) { return LEAVE_TYPE_ICON[code.toLowerCase()] ?? '📋'; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: any) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function dayCount(start: any, end: any) {
  const diff = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;
  return `${diff} day${diff !== 1 ? 's' : ''}`;
}

const STATUS_BADGE: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400',
  approved:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  rejected:  'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  withdrawn: 'bg-surface-100 text-surface-500 dark:bg-gray-700 dark:text-gray-400',
};

// ─── Workflow Step Progress ────────────────────────────────────────────────────

function WorkflowProgress({ steps, currentStep, status, actions }: {
  steps: any[]; currentStep: number; status: string; actions: any[];
}) {
  if (!steps?.length) return null;
  return (
    <div className="flex items-center gap-1 mt-2 flex-wrap">
      {steps.map((s, i) => {
        const action = actions?.find((a: any) => a.step_order === i);
        const isDone     = action?.action === 'approved';
        const isRejected = action?.action === 'rejected';
        const isCurrent  = !isDone && !isRejected && i === currentStep && status === 'pending';
        return (
          <div key={i} className="flex items-center gap-1">
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              isDone     ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' :
              isRejected ? 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400' :
              isCurrent  ? 'bg-brand-100 text-brand-700 dark:bg-brand-950/40 dark:text-brand-400 ring-1 ring-brand-400' :
                           'bg-surface-100 text-surface-400 dark:bg-gray-700 dark:text-gray-500'
            }`}>
              {isDone     && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>}
              {isRejected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
              {!isDone && !isRejected && <span className="w-3 h-3 flex items-center justify-center">{i + 1}</span>}
              <span>{s.label}</span>
            </div>
            {i < steps.length - 1 && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-surface-300 dark:text-gray-600 shrink-0"><polyline points="9,18 15,12 9,6"/></svg>}
          </div>
        );
      })}
    </div>
  );
}

// ─── Balance Cards ────────────────────────────────────────────────────────────

function BalanceCards({ balances }: { balances: any[] }) {
  if (!balances?.length) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {balances.filter(b => b.total_days > 0).map((b: any) => {
        const pct = b.total_days > 0 ? Math.round((b.remaining / b.total_days) * 100) : 0;
        const color = pct > 50 ? 'bg-emerald-500' : pct > 20 ? 'bg-amber-400' : 'bg-red-500';
        return (
          <div key={b.leave_type} className="card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-surface-400 capitalize">{b.leave_type} Leave</span>
              <span className="text-lg">{leaveIcon(b.leave_type ?? 'other')}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{b.remaining}
              <span className="text-sm font-normal text-surface-400 ml-1">/ {b.total_days}</span>
            </div>
            <div className="w-full bg-surface-100 dark:bg-gray-700 rounded-full h-1.5">
              <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <div className="text-xs text-surface-400">{b.used_days} used · {b.remaining} remaining</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LeavePage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [reviewModal,  setReviewModal]  = useState<any>(null);
  const [activeTab,    setActiveTab]    = useState<'all' | 'parent' | 'teacher'>('all');
  const [form, setForm] = useState({ leave_type: 'sick', start_date: '', end_date: '', reason: '' });
  const [reviewComment, setReviewComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [activeChild, setActiveChild] = useState<any>(null);

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const user    = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
  const role    = user.primaryRole ?? '';
  const isAdmin   = ['school_admin', 'super_admin', 'principal', 'hod'].includes(role);
  const isTeacher = role === 'teacher';
  const isParent  = role === 'parent';

  // Active child for parent
  useEffect(() => {
    if (!isParent) return;
    const stored = localStorage.getItem('activeChild');
    if (stored) setActiveChild(JSON.parse(stored));
    const handler = (e: Event) => setActiveChild((e as CustomEvent).detail);
    window.addEventListener('activeChildChanged', handler);
    return () => window.removeEventListener('activeChildChanged', handler);
  }, [isParent]);

  // Leave data
  const { data, isLoading, mutate } = useApi<{ leaves: any[]; workflows: any }>('/api/leave');
  const allLeaves = data?.leaves ?? [];
  const workflows = data?.workflows ?? {};

  // Teacher balance
  const { data: balanceData } = useApi<{ balances: any[] }>(isTeacher ? '/api/leave/balance' : null);
  const balances = balanceData?.balances ?? [];

  // Leave types from DB (synced with super admin master config)
  const { data: typesData } = useApi<{ types: { code: string; name: string }[] }>(
    !isAdmin ? '/api/leave/types' : null,
  );
  const leaveTypes = (typesData?.types ?? []).map(t => ({ value: t.code, label: t.name, icon: leaveIcon(t.code) }));

  // Filter leaves by tab / role
  const leaves = isAdmin
    ? activeTab === 'parent'  ? allLeaves.filter(l => l.role_code === 'parent')
    : activeTab === 'teacher' ? allLeaves.filter(l => l.role_code === 'teacher')
    : allLeaves
    : allLeaves;

  // Determine current workflow steps for a leave
  function getWorkflowSteps(leave: any) {
    const wf = leave.role_code === 'parent' ? workflows.parent : workflows.teacher;
    return leave.workflow_steps?.length ? leave.workflow_steps : wf?.steps ?? [];
  }

  // Pending leaves at my step (for admin reviewers)
  function canReview(leave: any) {
    if (!isAdmin && !isTeacher) return false;
    if (leave.status !== 'pending') return false;
    const steps = getWorkflowSteps(leave);
    if (!steps.length) return isAdmin; // no workflow = admin can approve directly
    const step = steps[leave.current_step];
    if (!step) return false;
    if (step.approver_role && step.approver_role !== role) return false;
    return true;
  }

  // Apply leave
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setSaveError('');
    try {
      const payload: any = { ...form };
      if (isParent && activeChild) payload.student_id = activeChild.id;
      const res  = await fetch('/api/leave', { method: 'POST', headers, body: JSON.stringify(payload) });
      const body = await res.json();
      if (!res.ok) { setSaveError(body.error || 'Failed to submit'); setSaving(false); return; }
      setShowAddModal(false);
      setForm({ leave_type: 'sick', start_date: '', end_date: '', reason: '' });
      mutate();
    } catch { setSaveError('Network error. Please try again.'); }
    setSaving(false);
  };

  // Withdraw a pending leave (submitter only)
  const handleWithdraw = async (id: string) => {
    setWithdrawing(id);
    await fetch('/api/leave', {
      method: 'PATCH', headers,
      body: JSON.stringify({ action: 'withdraw', id }),
    });
    setWithdrawing(null);
    mutate();
  };

  // Pre-fill apply modal for resubmit
  const handleResubmit = (l: any) => {
    setForm({ leave_type: l.leave_type, start_date: l.start_date?.split('T')[0] ?? '', end_date: l.end_date?.split('T')[0] ?? '', reason: l.reason ?? '' });
    setShowAddModal(true);
  };

  // Review leave step
  const handleReview = async (action: 'approved' | 'rejected') => {
    if (!reviewModal) return;
    setSaving(true);
    await fetch('/api/leave', {
      method: 'PATCH', headers,
      body: JSON.stringify({ id: reviewModal.id, action, comment: reviewComment }),
    });
    setSaving(false); setReviewModal(null); setReviewComment('');
    mutate();
  };

  // Guard: parent needs active child
  if (isParent && !activeChild) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-3">
        <p className="text-gray-900 dark:text-gray-100 font-semibold">No child selected</p>
        <p className="text-sm text-surface-400">Select a child from the top bar to apply or view leave.</p>
      </div>
    );
  }

  const childName = activeChild ? `${activeChild.first_name} ${activeChild.last_name}` : '';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Leave Requests</h1>
          <p className="text-sm text-surface-400 mt-0.5">
            {isParent  ? `Leave applications for ${childName}` :
             isTeacher ? 'Your leave applications' :
             'Manage all leave applications'}
          </p>
        </div>
        <button onClick={() => { setForm({ leave_type: leaveTypes[0]?.value ?? 'other', start_date: '', end_date: '', reason: '' }); setShowAddModal(true); }}
          className="btn-primary flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {isParent ? `Apply for ${childName}` : 'Apply Leave'}
        </button>
      </div>

      {/* Teacher balance cards */}
      {isTeacher && balances.length > 0 && <BalanceCards balances={balances} />}

      {/* Admin tab filter */}
      {isAdmin && (
        <div className="flex gap-1 p-1 bg-surface-100 dark:bg-gray-800 rounded-xl w-fit">
          {(['all', 'parent', 'teacher'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${activeTab === t ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-surface-400 hover:text-gray-700'}`}>
              {t === 'all' ? 'All' : `${t.charAt(0).toUpperCase() + t.slice(1)} Leaves`}
            </button>
          ))}
        </div>
      )}

      {/* Leave list */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse h-20 bg-surface-50 dark:bg-gray-700/40" />
          ))
        ) : leaves.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-4xl mb-3">🗓️</div>
            <p className="text-surface-400 text-sm">No leave requests found.</p>
          </div>
        ) : leaves.map((l: any) => {
          const steps    = getWorkflowSteps(l);
          const reviewable = canReview(l);
          return (
            <div key={l.id} className="card p-4 space-y-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">{leaveIcon(l.leave_type ?? 'other')}</span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 dark:text-gray-100 capitalize">{l.leave_type} Leave</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-md capitalize ${STATUS_BADGE[l.status] || STATUS_BADGE.pending}`}>
                        {l.status}
                      </span>
                      {isAdmin && l.role_code && (
                        <span className="text-xs bg-surface-100 dark:bg-gray-700 text-surface-400 px-2 py-0.5 rounded-md capitalize">{l.role_code}</span>
                      )}
                    </div>
                    <div className="text-xs text-surface-400 mt-0.5">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{l.requester_name}</span>
                      {l.student_name && <span> → {l.student_name}</span>}
                      <span className="mx-1">·</span>
                      {formatDate(l.start_date)} – {formatDate(l.end_date)}
                      <span className="mx-1">·</span>
                      {dayCount(l.start_date, l.end_date)}
                    </div>
                    {l.reason && <p className="text-xs text-surface-400 mt-0.5 line-clamp-1">{l.reason}</p>}
                    <WorkflowProgress steps={steps} currentStep={l.current_step} status={l.status} actions={l.actions} />
                  </div>
                </div>

                {/* Action buttons group */}
                <div className="flex flex-wrap gap-2 shrink-0">
                  {/* Review (admin/teacher reviewers) */}
                  {reviewable && (
                    <button onClick={() => { setReviewModal(l); setReviewComment(''); }}
                      className="btn btn-secondary text-sm">
                      Review
                    </button>
                  )}
                  {isAdmin && l.status === 'pending' && !reviewable && steps.length > 0 && (
                    <span className="text-xs text-surface-400 self-center">Awaiting step {l.current_step + 1}</span>
                  )}

                  {/* Withdraw (submitter — pending only) */}
                  {(isParent || isTeacher) && l.status === 'pending' && (
                    <button
                      onClick={() => handleWithdraw(l.id)}
                      disabled={withdrawing === l.id}
                      className="text-xs bg-red-50 dark:bg-red-950/30 text-red-600 border border-red-200 dark:border-red-800 px-3 py-1.5 rounded-lg hover:bg-red-100 font-medium transition-colors disabled:opacity-60"
                    >
                      {withdrawing === l.id ? 'Withdrawing…' : 'Withdraw'}
                    </button>
                  )}

                  {/* Resubmit (submitter — rejected or withdrawn) */}
                  {(isParent || isTeacher) && ['rejected', 'withdrawn'].includes(l.status) && (
                    <button
                      onClick={() => handleResubmit(l)}
                      className="text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-600 border border-amber-200 dark:border-amber-800 px-3 py-1.5 rounded-lg hover:bg-amber-100 font-medium transition-colors"
                    >
                      Resubmit
                    </button>
                  )}
                </div>
              </div>

              {/* Action history — show approver comments clearly */}
              {l.actions?.length > 0 && (
                <div className="border-t border-surface-100 dark:border-gray-700 pt-2 space-y-1">
                  {l.actions.map((a: any, i: number) => (
                    <div key={i} className={`flex items-start gap-2 text-xs rounded-lg px-2.5 py-1.5 ${
                      a.action === 'approved'
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400'
                        : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400'
                    }`}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0">
                        {a.action === 'approved'
                          ? <polyline points="20,6 9,17 4,12"/>
                          : <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}
                      </svg>
                      <span>
                        <span className="font-semibold">{a.actor_name || 'Admin'}</span>
                        {' '}{a.action} at Step {a.step_order + 1}
                        {a.comment && (
                          <span className="ml-1 opacity-80">· &ldquo;{a.comment}&rdquo;</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Apply Leave Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)}
        title={isParent ? `Apply Leave for ${childName}` : 'Apply for Leave'}>
        <form onSubmit={handleAdd} className="space-y-4">
          {isParent && activeChild && (
            <div className="p-3 rounded-xl bg-brand-50 dark:bg-brand-950/40 border border-brand-100 dark:border-brand-900">
              <p className="text-xs text-brand-600 dark:text-brand-400 font-medium">
                Applying leave for: <span className="font-bold">{childName}</span>
              </p>
              <p className="text-xs text-brand-500/70 mt-0.5">Students have no leave balance — all leave is approval-based.</p>
            </div>
          )}

          {/* Leave type */}
          <div>
            <label className="label">Leave Type</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {leaveTypes.map(lt => (
                <button key={lt.value} type="button"
                  onClick={() => setForm(f => ({ ...f, leave_type: lt.value }))}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${form.leave_type === lt.value ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30' : 'border-surface-200 dark:border-gray-700 hover:border-brand-300'}`}>
                  <div className="text-xl mb-1">{lt.icon}</div>
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300">{lt.label}</div>
                  {/* Show remaining balance for teacher */}
                  {isTeacher && (() => {
                    const b = balances.find(b => b.leave_type === lt.value);
                    return b && b.total_days > 0 ? (
                      <div className={`text-xs mt-0.5 font-semibold ${b.remaining > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {b.remaining} left
                      </div>
                    ) : null;
                  })()}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date *</label>
              <input type="date" className="input-field" required value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">End Date *</label>
              <input type="date" className="input-field" required value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="label">Reason</label>
            <textarea className="input-field" rows={3} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Reason for leave..." />
          </div>

          {saveError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{saveError}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Submitting...' : 'Submit'}</button>
          </div>
        </form>
      </Modal>

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Review Leave Request</h2>
              <p className="text-sm text-surface-400 mt-0.5">
                {reviewModal.requester_name} · <span className="capitalize">{reviewModal.leave_type}</span> Leave · {dayCount(reviewModal.start_date, reviewModal.end_date)}
              </p>
            </div>

            {/* Workflow step indicator */}
            {(() => {
              const steps = getWorkflowSteps(reviewModal);
              const step  = steps[reviewModal.current_step];
              return step ? (
                <div className="p-3 rounded-xl bg-brand-50 dark:bg-brand-950/30 border border-brand-100 dark:border-brand-800">
                  <p className="text-xs text-brand-600 dark:text-brand-400 font-medium">
                    Step {reviewModal.current_step + 1} of {steps.length}: <span className="font-bold">{step.label}</span>
                  </p>
                </div>
              ) : null;
            })()}

            <div className="p-3 bg-surface-50 dark:bg-gray-700/40 rounded-xl text-sm space-y-1">
              <div className="font-medium text-gray-800 dark:text-gray-200">{reviewModal.requester_name}</div>
              {reviewModal.student_name && <div className="text-surface-400 text-xs">For: {reviewModal.student_name}</div>}
              <div className="text-surface-400 text-xs">{formatDate(reviewModal.start_date)} – {formatDate(reviewModal.end_date)} · {dayCount(reviewModal.start_date, reviewModal.end_date)}</div>
              {reviewModal.reason && <div className="text-surface-400 text-xs mt-1">{reviewModal.reason}</div>}
            </div>

            <div>
              <label className="label">Comment (optional)</label>
              <textarea className="input-field" rows={2} placeholder="Add a comment..." value={reviewComment} onChange={e => setReviewComment(e.target.value)} />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setReviewModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleReview('rejected')} disabled={saving}
                className="flex-1 py-2 px-4 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 font-medium text-sm transition-colors">
                Reject
              </button>
              <button onClick={() => handleReview('approved')} disabled={saving}
                className="flex-1 py-2 px-4 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 font-medium text-sm transition-colors">
                {saving ? '...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
