'use client';

import { useState, useEffect, useRef } from 'react';
import Modal from '@/components/ui/Modal';
import PageError from '@/components/ui/PageError';
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

// ─── Field-rule normaliser (supports legacy string + new object format) ───────

function leaveRule(rules: Record<string, any>, key: string): 'required' | 'optional' | 'hidden' {
  const v = rules[key];
  if (!v) return 'optional';
  if (typeof v === 'string') return v as any;
  if (!v.visible) return 'hidden';
  if (v.required) return 'required';
  return 'optional';
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LeavePage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [reviewModal,  setReviewModal]  = useState<any>(null);
  const [activeTab,    setActiveTab]    = useState<'employee' | 'student'>('employee');
  const [teacherTab,   setTeacherTab]   = useState<'employee' | 'student'>('employee');
  const [studentBalances, setStudentBalances] = useState<Record<string, { total_days: number; used_days: number; remaining: number }>>({});
  const [balLoading,   setBalLoading]   = useState(false);
  const fetchedStudentIds = useRef<Set<string>>(new Set());
  const [form, setForm] = useState({ leave_type: 'sick', start_date: '', end_date: '', reason: '' });
  const [reviewComment, setReviewComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [deleting,    setDeleting]    = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'withdrawn'>('all');
  const [effectiveDays, setEffectiveDays] = useState<{ effective: number; total: number; excluded: number; breakdown?: { date: string; reason: string; name: string }[] } | null>(null);
  const [effectiveLoading, setEffectiveLoading] = useState(false);
  const [activeChild, setActiveChild] = useState<any>(null);
  const [leaveFieldRules, setLeaveFieldRules] = useState<Record<string, any>>({});

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const user    = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
  const role    = user.primaryRole ?? '';
  const userId  = user.id ?? '';
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

  // Load leave_request form config
  useEffect(() => {
    const u = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
    const t = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    const sid = u.schoolId;
    if (!sid || !t) return;
    // Determine which role config to load for this user
    const configRole = ['school_admin', 'super_admin', 'principal', 'hod'].includes(u.primaryRole) ? 'admin'
      : u.primaryRole === 'teacher' ? 'teacher'
      : u.primaryRole === 'parent'  ? 'parent'
      : 'student';
    fetch(`/api/form-config?schoolId=${sid}&formId=leave_request`, {
      headers: { Authorization: `Bearer ${t}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const rules = d?.configs?.leave_request?.[configRole];
        if (rules) setLeaveFieldRules(rules);
      })
      .catch((err: unknown) => { if (process.env.NODE_ENV === 'development') console.error('[leave-form-config]', err); });
  }, []);

  // Effective days preview — called when dates are set in the apply modal
  useEffect(() => {
    if (!form.start_date || !form.end_date || form.end_date < form.start_date) {
      setEffectiveDays(null); return;
    }
    setEffectiveLoading(true);
    const t = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    // For parent role, pass studentId so the API uses timetable-based weekoffs
    const studentParam = isParent && activeChild ? `&studentId=${activeChild.id}` : '';
    fetch(`/api/leave/effective-days?start=${form.start_date}&end=${form.end_date}${studentParam}`, {
      headers: { Authorization: `Bearer ${t}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) setEffectiveDays({
          effective: d.effectiveDays,
          total:     d.totalDays,
          excluded:  d.weekoffDays + d.holidayDays,
          breakdown: d.excluded,
        });
      })
      .catch((err: unknown) => { if (process.env.NODE_ENV === 'development') console.error('[effective-days]', err); })
      .finally(() => setEffectiveLoading(false));
  }, [form.start_date, form.end_date, isParent, activeChild]);

  // Leave data
  const { data, isLoading, error, mutate } = useApi<{ leaves: any[]; workflows: any }>('/api/leave');
  const allLeaves = data?.leaves ?? [];
  const workflows = data?.workflows ?? {};

  // Teacher balance
  const { data: balanceData } = useApi<{ balances: any[] }>(isTeacher ? '/api/leave/balance' : null);
  const balances = balanceData?.balances ?? [];

  // Leave types from DB (synced with super admin master config)
  const { data: typesData } = useApi<{ types: { code: string; name: string }[] }>('/api/leave/types');
  const leaveTypes = (typesData?.types ?? []).map(t => ({ value: t.code, label: t.name, icon: leaveIcon(t.code) }));

  // Filter leaves by tab / role, then by status filter
  const EMPLOYEE_ROLES = ['teacher', 'school_admin', 'principal', 'hod', 'employee'];
  const tabLeaves = isAdmin
    ? activeTab === 'student'  ? allLeaves.filter((l: any) => l.role_code === 'parent')
    : activeTab === 'employee' ? allLeaves.filter((l: any) => EMPLOYEE_ROLES.includes(l.role_code))
    : allLeaves
    : isTeacher
    ? teacherTab === 'employee'
      ? allLeaves.filter((l: any) => l.user_id === userId)
      : allLeaves.filter((l: any) => l.role_code === 'parent')
    : allLeaves;

  const leaves = statusFilter === 'all'
    ? tabLeaves
    : tabLeaves.filter((l: any) => l.status === statusFilter);

  // Count by status for filter badges
  const statusCounts = {
    all:       tabLeaves.length,
    pending:   tabLeaves.filter((l: any) => l.status === 'pending').length,
    approved:  tabLeaves.filter((l: any) => l.status === 'approved').length,
    rejected:  tabLeaves.filter((l: any) => l.status === 'rejected').length,
    withdrawn: tabLeaves.filter((l: any) => l.status === 'withdrawn').length,
  };

  // Fetch student leave balances when teacher is on student tab
  useEffect(() => {
    if (!isTeacher || teacherTab !== 'student' || isLoading) return;
    const sLeaves = allLeaves.filter((l: any) => l.role_code === 'parent' && l.student_id);
    const toFetch = [...new Set(sLeaves.map((l: any) => l.student_id as string))]
      .filter(id => !fetchedStudentIds.current.has(id));
    if (!toFetch.length) return;
    toFetch.forEach(id => fetchedStudentIds.current.add(id));
    setBalLoading(true);
    Promise.all(
      toFetch.map((sid: string) =>
        fetch(`/api/leave/balance?student_id=${sid}`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json())
          .then(d => [sid, d] as const)
          .catch(() => [sid, { total_days: 30, used_days: 0, remaining: 30 }] as const)
      )
    ).then(entries => {
      setStudentBalances(prev => ({ ...prev, ...Object.fromEntries(entries) }));
      setBalLoading(false);
    });
  }, [isTeacher, teacherTab, isLoading, allLeaves, token]);

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
    if (!steps.length) return true; // no workflow = any reviewer (admin or teacher) can approve
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
      setEffectiveDays(null);
      mutate();
    } catch { setSaveError('Network error. Please try again.'); }
    setSaving(false);
  };

  // Hard-delete a leave record (admin only, own school)
  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this leave record? This cannot be undone.')) return;
    setDeleting(id);
    await fetch('/api/leave', {
      method: 'DELETE', headers,
      body: JSON.stringify({ id }),
    });
    setDeleting(null);
    mutate();
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
            {isParent                                  ? `Leave applications for ${childName}` :
             isTeacher && teacherTab === 'student'     ? 'Review student leave applications' :
             isTeacher                                 ? 'Your leave applications & balance' :
             'Manage all leave applications'}
          </p>
        </div>
        {(!isTeacher || teacherTab === 'employee') && (
          <button onClick={() => { setForm({ leave_type: leaveTypes[0]?.value ?? 'other', start_date: '', end_date: '', reason: '' }); setShowAddModal(true); }}
            className="btn-primary flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {isParent ? `Apply for ${childName}` : 'Apply Leave'}
          </button>
        )}
      </div>

      {/* Teacher balance cards — employee tab only */}
      {isTeacher && teacherTab === 'employee' && balances.length > 0 && <BalanceCards balances={balances} />}

      {/* Admin tab filter */}
      {isAdmin && (
        <div className="flex gap-1 p-1 bg-surface-100 dark:bg-gray-800 rounded-xl w-fit">
          {([['employee', 'Employee Leave'], ['student', 'Student Leave']] as const).map(([t, label]) => (
            <button key={t} onClick={() => { setActiveTab(t); setStatusFilter('all'); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === t ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-surface-400 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Teacher tab filter */}
      {isTeacher && (
        <div className="flex gap-1 p-1 bg-surface-100 dark:bg-gray-800 rounded-xl w-fit">
          {([['employee', 'My Leave'], ['student', 'Student Leave']] as const).map(([t, label]) => (
            <button key={t} onClick={() => { setTeacherTab(t); setStatusFilter('all'); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${teacherTab === t ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-surface-400 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Student leave balance cards — teacher Student tab */}
      {isTeacher && teacherTab === 'student' && (
        <>
          {balLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1,2,3,4].map(i => <div key={i} className="card p-4 h-24 animate-pulse bg-surface-50 dark:bg-gray-700/40" />)}
            </div>
          )}
          {!balLoading && Object.keys(studentBalances).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Student Leave Balance</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(studentBalances).map(([sid, bal]) => {
                  const leaf = allLeaves.find((l: any) => l.student_id === sid);
                  const name = (leaf as any)?.student_name ?? 'Student';
                  const pct = bal.total_days > 0 ? Math.round((bal.remaining / bal.total_days) * 100) : 0;
                  const barColor = pct > 50 ? 'bg-emerald-500' : pct > 20 ? 'bg-amber-400' : 'bg-red-500';
                  return (
                    <div key={sid} className="card p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-surface-500 dark:text-gray-400 truncate">{name}</span>
                        <span className="text-base shrink-0">🎓</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {bal.remaining}
                        <span className="text-sm font-normal text-surface-400 ml-1">/ {bal.total_days}</span>
                      </div>
                      <div className="w-full bg-surface-100 dark:bg-gray-700 rounded-full h-1.5">
                        <div className={`${barColor} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-xs text-surface-400">{bal.used_days} used · {bal.remaining} remaining</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Status filter bar */}
      {!isLoading && !error && tabLeaves.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {([
            ['all',       'All'],
            ['pending',   'Pending'],
            ['approved',  'Approved'],
            ['rejected',  'Rejected'],
            ['withdrawn', 'Withdrawn'],
          ] as const).map(([val, label]) => {
            const count = statusCounts[val];
            const isActive = statusFilter === val;
            const accentClass =
              val === 'pending'   ? 'bg-yellow-500' :
              val === 'approved'  ? 'bg-emerald-500' :
              val === 'rejected'  ? 'bg-red-500' :
              val === 'withdrawn' ? 'bg-gray-400' :
              'bg-brand-500';
            return (
              <button
                key={val}
                onClick={() => setStatusFilter(val)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                  isActive
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-transparent shadow-sm'
                    : 'bg-white dark:bg-gray-800 text-surface-500 dark:text-gray-400 border-surface-200 dark:border-gray-700 hover:border-surface-300 dark:hover:border-gray-600'
                }`}
              >
                {label}
                {count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                    isActive ? 'bg-white/20 text-white dark:bg-black/20 dark:text-gray-900' : `${accentClass} text-white`
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Leave grid */}
      {error ? (
        <PageError message="Failed to load leave requests — please try again." onRetry={() => mutate()} />
      ) : isLoading ? (
        <div className="card overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-surface-100 dark:border-gray-800 animate-pulse">
              <div className="h-4 w-24 bg-surface-100 dark:bg-gray-700 rounded" />
              <div className="h-4 w-32 bg-surface-100 dark:bg-gray-700 rounded" />
              <div className="h-4 w-20 bg-surface-100 dark:bg-gray-700 rounded ml-auto" />
            </div>
          ))}
        </div>
      ) : leaves.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">🗓️</div>
          <p className="text-surface-400 text-sm">
            {statusFilter !== 'all'
              ? `No ${statusFilter} leave requests.`
              : 'No leave requests found.'}
          </p>
          {statusFilter !== 'all' && (
            <button onClick={() => setStatusFilter('all')} className="mt-2 text-xs text-brand-600 dark:text-brand-400 hover:underline">
              Show all
            </button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100 dark:border-gray-800 bg-surface-50 dark:bg-gray-800/60">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wide whitespace-nowrap">Type</th>
                  {(isAdmin || (isTeacher && teacherTab === 'student')) && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wide whitespace-nowrap">Applicant</th>
                  )}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wide whitespace-nowrap">Dates</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wide whitespace-nowrap hidden sm:table-cell">Duration</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wide whitespace-nowrap">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wide whitespace-nowrap hidden md:table-cell">Pending With</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-gray-800">
                {leaves.map((l: any) => {
                  const steps      = getWorkflowSteps(l);
                  const reviewable = canReview(l);
                  const currentStep = steps[l.current_step];
                  const pendingWith = l.status === 'pending' && currentStep
                    ? currentStep.label || currentStep.approver_role || `Step ${l.current_step + 1}`
                    : null;

                  return (
                    <tr key={l.id} className="hover:bg-surface-50/50 dark:hover:bg-gray-800/30 transition-colors">
                      {/* Type */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-lg leading-none">{leaveIcon(l.leave_type ?? 'other')}</span>
                          <span className="font-medium text-gray-800 dark:text-gray-200 capitalize">{l.leave_type}</span>
                          {isAdmin && l.role_code && (
                            <span className="text-[11px] bg-surface-100 dark:bg-gray-700 text-surface-400 px-1.5 py-0.5 rounded capitalize hidden lg:inline">{l.role_code}</span>
                          )}
                        </div>
                      </td>

                      {/* Applicant — admin and teacher-student-tab only */}
                      {(isAdmin || (isTeacher && teacherTab === 'student')) && (
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800 dark:text-gray-200 text-sm">{l.requester_name}</div>
                          {l.student_name && (
                            <div className="text-xs text-surface-400 mt-0.5 flex items-center gap-1">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                              {l.student_name}
                              {isTeacher && l.student_id && studentBalances[l.student_id] && (() => {
                                const b = studentBalances[l.student_id];
                                return (
                                  <span className={`ml-1 font-semibold ${b.remaining > 5 ? 'text-emerald-600 dark:text-emerald-400' : b.remaining > 0 ? 'text-amber-500' : 'text-red-500'}`}>
                                    ({b.remaining}/{b.total_days}d left)
                                  </span>
                                );
                              })()}
                            </div>
                          )}
                        </td>
                      )}

                      {/* Dates */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {formatDate(l.start_date)} – {formatDate(l.end_date)}
                      </td>

                      {/* Duration */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-surface-400 hidden sm:table-cell">
                        {dayCount(l.start_date, l.end_date)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md capitalize ${STATUS_BADGE[l.status] || STATUS_BADGE.pending}`}>
                          {l.status}
                        </span>
                      </td>

                      {/* Pending With — current actor */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        {pendingWith ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 animate-pulse" />
                            <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">{pendingWith}</span>
                          </div>
                        ) : l.status === 'approved' ? (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>
                            {l.approved_by_name || 'Approved'}
                          </div>
                        ) : l.status === 'rejected' ? (
                          <span className="text-xs text-red-500">{l.approved_by_name || '—'}</span>
                        ) : (
                          <span className="text-xs text-surface-300">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {reviewable && (
                            <button onClick={() => { setReviewModal(l); setReviewComment(''); }}
                              className="text-xs bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 px-3 py-1.5 rounded-lg hover:bg-brand-100 font-medium transition-colors">
                              Review
                            </button>
                          )}
                          {isParent && l.status === 'pending' && (
                            <button onClick={() => handleWithdraw(l.id)} disabled={withdrawing === l.id}
                              className="text-xs bg-red-50 dark:bg-red-950/30 text-red-600 border border-red-200 dark:border-red-800 px-3 py-1.5 rounded-lg hover:bg-red-100 font-medium transition-colors disabled:opacity-60">
                              {withdrawing === l.id ? 'Withdrawing…' : 'Withdraw'}
                            </button>
                          )}
                          {isTeacher && l.status === 'pending' && l.user_id === userId && (
                            <button onClick={() => handleWithdraw(l.id)} disabled={withdrawing === l.id}
                              className="text-xs bg-red-50 dark:bg-red-950/30 text-red-600 border border-red-200 dark:border-red-800 px-3 py-1.5 rounded-lg hover:bg-red-100 font-medium transition-colors disabled:opacity-60">
                              {withdrawing === l.id ? 'Withdrawing…' : 'Withdraw'}
                            </button>
                          )}
                          {(isParent || (isTeacher && l.user_id === userId)) && ['rejected', 'withdrawn'].includes(l.status) && (
                            <button onClick={() => handleResubmit(l)}
                              className="text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-600 border border-amber-200 dark:border-amber-800 px-3 py-1.5 rounded-lg hover:bg-amber-100 font-medium transition-colors">
                              Resubmit
                            </button>
                          )}
                          {/* Workflow progress tooltip trigger — expand row on click */}
                          {steps.length > 0 && (
                            <button
                              onClick={() => setReviewModal({ ...l, _viewOnly: true })}
                              className="text-xs text-surface-400 hover:text-gray-700 dark:hover:text-gray-300 px-1.5 py-1 rounded transition-colors"
                              title="View workflow">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            </button>
                          )}
                          {/* Admin hard-delete */}
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(l.id)}
                              disabled={deleting === l.id}
                              title="Delete record"
                              className="text-xs text-surface-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 px-1.5 py-1 rounded transition-colors disabled:opacity-40"
                            >
                              {deleting === l.id
                                ? <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                                : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                              }
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
          {leaveRule(leaveFieldRules, 'leaveType') !== 'hidden' && <div>
            <label className="label">
              Leave Type
              {leaveRule(leaveFieldRules, 'leaveType') === 'required'
                ? <span className="text-red-500 ml-0.5">*</span>
                : <span className="text-surface-400 font-normal ml-1">(optional)</span>}
            </label>
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
          </div>}

          <div className="grid grid-cols-2 gap-4">
            {leaveRule(leaveFieldRules, 'startDate') !== 'hidden' && (
              <div>
                <label className="label">
                  From Date
                  {leaveRule(leaveFieldRules, 'startDate') === 'required'
                    ? <span className="text-red-500 ml-0.5">*</span>
                    : <span className="text-surface-400 font-normal ml-1">(optional)</span>}
                </label>
                <input type="date" className="input-field"
                  required={leaveRule(leaveFieldRules, 'startDate') === 'required'}
                  value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
            )}
            {leaveRule(leaveFieldRules, 'endDate') !== 'hidden' && (
              <div>
                <label className="label">
                  To Date
                  {leaveRule(leaveFieldRules, 'endDate') === 'required'
                    ? <span className="text-red-500 ml-0.5">*</span>
                    : <span className="text-surface-400 font-normal ml-1">(optional)</span>}
                </label>
                <input type="date" className="input-field"
                  required={leaveRule(leaveFieldRules, 'endDate') === 'required'}
                  value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            )}
          </div>

          {/* Effective days preview */}
          {form.start_date && form.end_date && form.end_date >= form.start_date && (
            <div className={`flex items-center gap-2 p-3 rounded-xl border text-xs ${
              effectiveLoading
                ? 'bg-surface-50 dark:bg-gray-700/40 border-surface-200 dark:border-gray-700 text-surface-400'
                : effectiveDays?.effective === 0
                ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
            }`}>
              {effectiveLoading
                ? <><svg className="animate-spin shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Calculating working days...</>
                : effectiveDays?.effective === 0
                ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  Selected range falls entirely on week-offs or holidays. Please choose different dates.</>
                : effectiveDays
                ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><polyline points="20,6 9,17 4,12"/></svg>
                  <span><strong>{effectiveDays.effective} working day{effectiveDays.effective !== 1 ? 's' : ''}</strong> will be deducted
                  {effectiveDays.excluded > 0 && <span className="opacity-75"> ({effectiveDays.excluded} week-off/holiday day{effectiveDays.excluded !== 1 ? 's' : ''} excluded)</span>}</span></>
                : null
              }
            </div>
          )}

          {/* Inline date-conflict warning — checked against existing leaves in local data */}
          {(() => {
            if (!form.start_date || !form.end_date) return null;
            const s = new Date(form.start_date);
            const e = new Date(form.end_date);
            const pool = isParent && activeChild
              ? allLeaves.filter((l: any) => l.student_id === activeChild.id && ['pending', 'approved'].includes(l.status))
              : isTeacher
              ? allLeaves.filter((l: any) => l.user_id === userId && ['pending', 'approved'].includes(l.status))
              : [];
            const conflict = pool.find((l: any) => new Date(l.start_date) <= e && new Date(l.end_date) >= s);
            if (!conflict) return null;
            return (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  A <span className="font-semibold capitalize">{conflict.status}</span> leave already exists for {formatDate(conflict.start_date)}–{formatDate(conflict.end_date)}.
                  {' '}Please choose different dates or withdraw the existing request first.
                </p>
              </div>
            );
          })()}

          {leaveRule(leaveFieldRules, 'reason') !== 'hidden' && (
            <div>
              <label className="label">
                Reason
                {leaveRule(leaveFieldRules, 'reason') === 'required'
                  ? <span className="text-red-500 ml-0.5">*</span>
                  : <span className="text-surface-400 font-normal ml-1">(optional)</span>}
              </label>
              <textarea className="input-field" rows={3}
                required={leaveRule(leaveFieldRules, 'reason') === 'required'}
                value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="Reason for leave..." />
            </div>
          )}

          {saveError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{saveError}</p>}
          {/* Compute conflict again for submit guard */}
          {(() => {
            const s = form.start_date ? new Date(form.start_date) : null;
            const e = form.end_date   ? new Date(form.end_date)   : null;
            const pool = s && e ? (isParent && activeChild
              ? allLeaves.filter((l: any) => l.student_id === activeChild.id && ['pending', 'approved'].includes(l.status))
              : isTeacher
              ? allLeaves.filter((l: any) => l.user_id === userId && ['pending', 'approved'].includes(l.status))
              : []) : [];
            const hasConflict = pool.some((l: any) => s && e && new Date(l.start_date) <= e && new Date(l.end_date) >= s);
            const zeroEffective = effectiveDays?.effective === 0;
            const isBlocked = saving || hasConflict || zeroEffective || effectiveLoading;
            return (
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={isBlocked} className={`btn-primary flex-1 ${isBlocked ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {saving ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            );
          })()}
        </form>
      </Modal>

      {/* Review / View Modal */}
      {reviewModal && (() => {
        const steps     = getWorkflowSteps(reviewModal);
        const viewOnly  = !!reviewModal._viewOnly;
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {viewOnly ? 'Leave Details' : 'Review Leave Request'}
                </h2>
                <p className="text-sm text-surface-400 mt-0.5">
                  {reviewModal.requester_name} · <span className="capitalize">{reviewModal.leave_type}</span> Leave · {dayCount(reviewModal.start_date, reviewModal.end_date)}
                </p>
              </div>

              {/* Leave info card */}
              <div className="p-3 bg-surface-50 dark:bg-gray-700/40 rounded-xl text-sm space-y-1">
                <div className="font-medium text-gray-800 dark:text-gray-200">{reviewModal.requester_name}</div>
                {reviewModal.student_name && (
                  <div className="text-surface-400 text-xs flex items-center gap-1.5">
                    For: {reviewModal.student_name}
                    {reviewModal.student_class && (
                      <span className="px-1.5 py-0.5 bg-sky-100 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 rounded text-[10px] font-medium">{reviewModal.student_class}</span>
                    )}
                  </div>
                )}
                <div className="text-surface-400 text-xs">{formatDate(reviewModal.start_date)} – {formatDate(reviewModal.end_date)} · {dayCount(reviewModal.start_date, reviewModal.end_date)}</div>
                {reviewModal.reason && <div className="text-surface-400 text-xs mt-1 italic">"{reviewModal.reason}"</div>}
                <div className="pt-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-md capitalize ${STATUS_BADGE[reviewModal.status] || STATUS_BADGE.pending}`}>
                    {reviewModal.status}
                  </span>
                </div>
              </div>

              {/* Workflow progress (always shown) */}
              {steps.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">Workflow Progress</p>
                  <WorkflowProgress
                    steps={steps}
                    currentStep={reviewModal.current_step}
                    status={reviewModal.status}
                    actions={reviewModal.actions ?? []}
                  />
                </div>
              )}

              {/* Action history */}
              {reviewModal.actions?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">History</p>
                  <div className="space-y-2">
                    {reviewModal.actions.map((a: any, i: number) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs">
                        <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                          a.action === 'approved' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                          : 'bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                        }`}>
                          {a.action === 'approved'
                            ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>
                            : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
                        </div>
                        <div className="min-w-0">
                          <span className="font-medium text-gray-700 dark:text-gray-300">{a.actor_name || 'Unknown'}</span>
                          <span className="text-surface-400"> {a.action} </span>
                          {steps[a.step_order] && (
                            <span className="text-surface-400">at step <em>{steps[a.step_order].label}</em></span>
                          )}
                          {a.comment && <p className="text-surface-400 mt-0.5 italic">"{a.comment}"</p>}
                          <p className="text-surface-300 dark:text-gray-600 mt-0.5">
                            {new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Current step indicator (review mode only) */}
              {!viewOnly && (() => {
                const step = steps[reviewModal.current_step];
                return step ? (
                  <div className="p-3 rounded-xl bg-brand-50 dark:bg-brand-950/30 border border-brand-100 dark:border-brand-800">
                    <p className="text-xs text-brand-600 dark:text-brand-400 font-medium">
                      Step {reviewModal.current_step + 1} of {steps.length}: <span className="font-bold">{step.label}</span>
                    </p>
                  </div>
                ) : null;
              })()}

              {/* Comment box — review mode only */}
              {!viewOnly && (
                <div>
                  <label className="label">Comment (optional)</label>
                  <textarea className="input-field" rows={2} placeholder="Add a comment..." value={reviewComment} onChange={e => setReviewComment(e.target.value)} />
                </div>
              )}

              {/* Action buttons */}
              {viewOnly ? (
                <button onClick={() => setReviewModal(null)} className="btn-secondary w-full">Close</button>
              ) : (
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
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
