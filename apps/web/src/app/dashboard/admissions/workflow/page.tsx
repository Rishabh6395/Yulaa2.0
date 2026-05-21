'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChecklistItem {
  label:      string;
  actionRole: string;
}

interface Step {
  stepOrder:            number;
  label:                string;
  approverRole:         string;
  checklistItems:       ChecklistItem[];
  // SPOC
  spocUserId:           string;
  // Payment
  paymentRequired:      boolean;
  paymentGateway:       string;
  paymentAmountOverride:string;
  // Reassign
  allowReassign:        boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const APPROVER_ROLES = [
  { value: 'school_admin', label: 'School Admin' },
  { value: 'principal',    label: 'Principal' },
  { value: 'teacher',      label: 'Teacher' },
  { value: 'super_admin',  label: 'Super Admin' },
];

const ACTION_ROLES = [
  { value: 'school_admin', label: 'School Admin' },
  { value: 'principal',    label: 'Principal' },
  { value: 'teacher',      label: 'Teacher' },
  { value: 'parent',       label: 'Parent / Applicant' },
];

const PAYMENT_GATEWAYS = [
  { value: 'razorpay', label: 'Razorpay' },
  { value: 'payu',     label: 'PayU' },
  { value: 'stripe',   label: 'Stripe' },
  { value: 'offline',  label: 'Offline / Manual' },
];

const PRESETS: {
  id: string; label: string; description: string;
  steps: Omit<Step, 'stepOrder'>[];
}[] = [
  {
    id: 'direct', label: 'Direct (1 Step)',
    description: 'School Admin reviews and approves in one step.',
    steps: [
      { label: 'Admin Review', approverRole: 'school_admin', checklistItems: [], spocUserId: '', paymentRequired: false, paymentGateway: 'razorpay', paymentAmountOverride: '', allowReassign: false },
    ],
  },
  {
    id: 'standard', label: 'Standard (2 Steps)',
    description: 'School Admin reviews, then Principal gives final approval.',
    steps: [
      { label: 'Admin Review',       approverRole: 'school_admin', checklistItems: [], spocUserId: '', paymentRequired: false, paymentGateway: 'razorpay', paymentAmountOverride: '', allowReassign: false },
      { label: 'Principal Approval', approverRole: 'principal',    checklistItems: [], spocUserId: '', paymentRequired: false, paymentGateway: 'razorpay', paymentAmountOverride: '', allowReassign: false },
    ],
  },
  {
    id: 'full', label: 'Full (3 Steps)',
    description: 'Teacher pre-screens → Admin reviews → Principal approves.',
    steps: [
      { label: 'Teacher Pre-screen', approverRole: 'teacher',      checklistItems: [], spocUserId: '', paymentRequired: false, paymentGateway: 'razorpay', paymentAmountOverride: '', allowReassign: false },
      { label: 'Admin Review',       approverRole: 'school_admin', checklistItems: [], spocUserId: '', paymentRequired: false, paymentGateway: 'razorpay', paymentAmountOverride: '', allowReassign: false },
      { label: 'Principal Approval', approverRole: 'principal',    checklistItems: [], spocUserId: '', paymentRequired: false, paymentGateway: 'razorpay', paymentAmountOverride: '', allowReassign: false },
    ],
  },
];

function blankStep(order: number): Step {
  return {
    stepOrder: order, label: '', approverRole: 'school_admin',
    checklistItems: [], spocUserId: '', paymentRequired: false,
    paymentGateway: 'razorpay', paymentAmountOverride: '', allowReassign: false,
  };
}

function toSteps(raw: Omit<Step, 'stepOrder'>[]): Step[] {
  return raw.map((s, i) => ({ ...s, stepOrder: i + 1 }));
}

// ── Step Card ──────────────────────────────────────────────────────────────────

function StepCard({
  step, index, total, isFinal, users, spocEnabled,
  onChange, onRemove, onMove,
}: {
  step:        Step;
  index:       number;
  total:       number;
  isFinal:     boolean;
  users:       any[];
  spocEnabled: boolean;
  onChange:    (patch: Partial<Step>) => void;
  onRemove:    () => void;
  onMove:      (dir: -1 | 1) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const checklistCount = step.checklistItems.length;
  const hasExtras = step.paymentRequired || step.spocUserId || step.allowReassign || checklistCount > 0;

  function addChecklist() {
    onChange({ checklistItems: [...step.checklistItems, { label: '', actionRole: 'school_admin' }] });
  }

  function updateChecklist(idx: number, field: keyof ChecklistItem, val: string) {
    const updated = step.checklistItems.map((it, i) => i === idx ? { ...it, [field]: val } : it);
    onChange({ checklistItems: updated });
  }

  function removeChecklist(idx: number) {
    onChange({ checklistItems: step.checklistItems.filter((_, i) => i !== idx) });
  }

  return (
    <div className={`rounded-xl border transition-colors ${
      expanded
        ? 'border-brand-200 dark:border-brand-800'
        : isFinal
          ? 'border-emerald-200 dark:border-emerald-800'
          : 'border-surface-100 dark:border-gray-700'
    }`}>

      {/* ── Header row ── */}
      <div className="flex items-center gap-3 p-3">
        {/* Step badge */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
          isFinal
            ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
            : 'bg-brand-100 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300'
        }`}>
          {isFinal ? '✓' : index + 1}
        </div>

        {/* Name + approver */}
        <div className="flex-1 flex items-center gap-2 flex-wrap min-w-0">
          <input
            className="input-field flex-1 min-w-36 text-sm"
            placeholder="Step name (e.g. Principal Approval)"
            value={step.label}
            onChange={e => onChange({ label: e.target.value })}
          />
          <select
            className="input-field w-40 text-sm shrink-0"
            value={step.approverRole}
            onChange={e => onChange({ approverRole: e.target.value })}
          >
            {APPROVER_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          {isFinal && (
            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-full shrink-0 font-medium">
              Final
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Extras badge */}
          {!expanded && hasExtras && (
            <span className="text-[10px] bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded-md">
              {[
                checklistCount > 0 && `${checklistCount} task${checklistCount > 1 ? 's' : ''}`,
                step.paymentRequired && 'payment',
                step.spocUserId && 'spoc',
                step.allowReassign && 'reassign',
              ].filter(Boolean).join(' · ')}
            </span>
          )}
          <button onClick={() => setExpanded(v => !v)}
            className={`p-1.5 rounded-lg transition-colors ${
              expanded
                ? 'bg-brand-100 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400'
                : 'text-surface-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-950/20'
            }`}
            title={expanded ? 'Collapse' : 'Configure checklist, payment, SPOC, reassignment'}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
          </button>
          <button onClick={() => onMove(-1)} disabled={index === 0}
            className="p-1 text-surface-300 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18,15 12,9 6,15"/></svg>
          </button>
          <button onClick={() => onMove(1)} disabled={index === total - 1}
            className="p-1 text-surface-300 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6,9 12,15 18,9"/></svg>
          </button>
          {total > 1 && (
            <button onClick={onRemove}
              className="p-1.5 rounded-lg text-surface-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Expanded options panel ── */}
      {expanded && (
        <div className="border-t border-surface-100 dark:border-gray-700/50 px-4 pb-4 pt-3 space-y-4">

          {/* Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                </svg>
                Checklist
              </p>
              <p className="text-[10px] text-surface-400">Tasks the approver must complete before advancing</p>
            </div>
            {step.checklistItems.map((item, iIdx) => (
              <div key={iIdx} className="flex items-center gap-2 mb-1.5">
                <div className="w-4 h-4 rounded border border-surface-300 dark:border-gray-600 shrink-0 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-surface-300 dark:bg-gray-600"/>
                </div>
                <input
                  className="flex-1 text-sm border border-surface-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-400"
                  placeholder="Checklist item (e.g. Verify birth certificate)"
                  value={item.label}
                  onChange={e => updateChecklist(iIdx, 'label', e.target.value)}
                />
                <select
                  className="text-xs border border-surface-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 shrink-0 focus:outline-none focus:ring-2 focus:ring-brand-400"
                  value={item.actionRole}
                  onChange={e => updateChecklist(iIdx, 'actionRole', e.target.value)}
                  title="Assigned to"
                >
                  {ACTION_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <button onClick={() => removeChecklist(iIdx)}
                  className="text-surface-300 hover:text-red-500 transition-colors p-1 shrink-0">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}
            <button onClick={addChecklist}
              className="flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 font-medium mt-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add checklist item
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            {/* Payment */}
            <div className={`rounded-xl border p-3 space-y-2 ${
              step.paymentRequired
                ? 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10'
                : 'border-surface-100 dark:border-gray-700'
            }`}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded accent-amber-500"
                  checked={step.paymentRequired}
                  onChange={e => onChange({ paymentRequired: e.target.checked })}/>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Require Payment</span>
              </label>
              {step.paymentRequired && (
                <>
                  <select
                    className="w-full text-xs border border-surface-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    value={step.paymentGateway}
                    onChange={e => onChange({ paymentGateway: e.target.value })}
                  >
                    {PAYMENT_GATEWAYS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                  <input
                    className="w-full text-xs border border-surface-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="Amount override (₹) — blank = school default"
                    type="number"
                    min="0"
                    value={step.paymentAmountOverride}
                    onChange={e => onChange({ paymentAmountOverride: e.target.value })}
                  />
                  <p className="text-[10px] text-amber-600 dark:text-amber-400">
                    Applicant must pay before this step can be approved.
                  </p>
                </>
              )}
            </div>

            {/* SPOC */}
            {spocEnabled && index > 0 && (
              <div className={`rounded-xl border p-3 space-y-2 ${
                step.spocUserId
                  ? 'border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/10'
                  : 'border-surface-100 dark:border-gray-700'
              }`}>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">SPOC (Point of Contact)</p>
                <select
                  className="w-full text-xs border border-surface-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  value={step.spocUserId}
                  onChange={e => onChange({ spocUserId: e.target.value })}
                >
                  <option value="">— None —</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                  ))}
                </select>
                <p className="text-[10px] text-violet-600 dark:text-violet-400">
                  SPOC can view this stage without being the approver.
                </p>
              </div>
            )}
            {spocEnabled && index === 0 && (
              <div className="rounded-xl border border-surface-100 dark:border-gray-700 p-3 opacity-50">
                <p className="text-xs font-semibold text-gray-500">SPOC</p>
                <p className="text-[10px] text-surface-400 mt-1">Not available on the initial stage.</p>
              </div>
            )}

            {/* Reassignment */}
            <div className={`rounded-xl border p-3 space-y-2 ${
              step.allowReassign
                ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/10'
                : 'border-surface-100 dark:border-gray-700'
            }`}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded accent-blue-500"
                  checked={step.allowReassign}
                  onChange={e => onChange({ allowReassign: e.target.checked })}/>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Allow Reassignment</span>
              </label>
              {step.allowReassign && (
                <p className="text-[10px] text-blue-600 dark:text-blue-400">
                  Allowed roles can hand off this step to another user. Configure who can reassign in Admission Settings.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function WorkflowPage() {
  const searchParams = useSearchParams();
  const urlSchoolId  = searchParams.get('schoolId') ?? '';

  const [steps,           setSteps]           = useState<Step[]>(toSteps(PRESETS[0].steps));
  const [activePreset,    setActivePreset]    = useState('direct');
  const [workflowName,    setWorkflowName]    = useState('Default Workflow');
  const [sameForAllRoles, setSameForAllRoles] = useState(true);
  const [spocEnabled,     setSpocEnabled]     = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [saved,           setSaved]           = useState(false);
  const [error,           setError]           = useState('');
  const [existingId,      setExistingId]      = useState<string | null>(null);

  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [schools,      setSchools]      = useState<{ id: string; name: string }[]>([]);
  const [schoolId,     setSchoolId]     = useState('');
  const [users,        setUsers]        = useState<any[]>([]);

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Detect role + load schools for super admin
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) return;
    const user = JSON.parse(stored);
    const isSA = user.primaryRole === 'super_admin';
    setIsSuperAdmin(isSA);
    if (isSA) {
      fetch('/api/super-admin/schools', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => {
          const list = d.schools ?? [];
          setSchools(list);
          // prefer schoolId from URL param (coming from school config), else first in list
          const pre = urlSchoolId && list.find((s: { id: string }) => s.id === urlSchoolId);
          setSchoolId(pre ? urlSchoolId : (list[0]?.id ?? ''));
        })
        .catch(() => setError('Failed to load schools'));
    } else {
      setSchoolId(user.schoolId ?? '');
    }
  }, []);

  // Load school users for SPOC dropdown
  useEffect(() => {
    if (!schoolId) return;
    const url = isSuperAdmin
      ? `/api/super-admin/schools/${schoolId}/users`
      : '/api/super-admin/users';
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setUsers(d.users ?? []))
      .catch(() => {});
  }, [schoolId]);

  // Load existing workflow when schoolId is known
  useEffect(() => {
    if (!schoolId) return;
    const url = isSuperAdmin
      ? `/api/super-admin/schools/${schoolId}/admission-workflow`
      : '/api/admission/workflow';
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
      .then(d => {
        if (!d?.workflow) return;
        const wf = d.workflow;
        setExistingId(wf.id ?? null);
        setWorkflowName(wf.name ?? 'Default Workflow');
        setSameForAllRoles(wf.sameForAllRoles ?? true);
        const loaded: Step[] = (wf.steps ?? []).map((s: any) => ({
          stepOrder:            s.stepOrder,
          label:                s.label,
          approverRole:         s.approverRole,
          checklistItems:       (s.checklistItems as ChecklistItem[] | null) ?? [],
          spocUserId:           s.spocUserId           ?? '',
          paymentRequired:      s.paymentRequired      ?? false,
          paymentGateway:       s.paymentGateway       ?? 'razorpay',
          paymentAmountOverride:String(s.paymentAmountOverride ?? ''),
          allowReassign:        s.allowReassign         ?? false,
        }));
        if (loaded.length > 0) { setSteps(loaded); setActivePreset(''); }
        // Check if SPOC is being used
        if (loaded.some(s => s.spocUserId)) setSpocEnabled(true);
      });
  }, [schoolId]);

  function applyPreset(p: typeof PRESETS[number]) {
    setSteps(toSteps(p.steps));
    setActivePreset(p.id);
    setWorkflowName(p.label);
  }

  function addStep() {
    setSteps(s => [...s, blankStep(s.length + 1)]);
    setActivePreset('');
  }

  function removeStep(i: number) {
    setSteps(s => s.filter((_, idx) => idx !== i).map((st, idx) => ({ ...st, stepOrder: idx + 1 })));
    setActivePreset('');
  }

  function updateStep(i: number, patch: Partial<Step>) {
    setSteps(s => s.map((st, idx) => idx === i ? { ...st, ...patch } : st));
    setActivePreset('');
  }

  function moveStep(i: number, dir: -1 | 1) {
    setSteps(s => {
      const arr = [...s];
      const ni  = i + dir;
      if (ni < 0 || ni >= arr.length) return arr;
      [arr[i], arr[ni]] = [arr[ni], arr[i]];
      return arr.map((st, idx) => ({ ...st, stepOrder: idx + 1 }));
    });
    setActivePreset('');
  }

  async function save() {
    if (!schoolId) return setError('Please select a school first.');
    if (steps.some(s => !s.label.trim())) return setError('Every step needs a name.');
    setSaving(true); setError('');
    try {
      const url = isSuperAdmin
        ? `/api/super-admin/schools/${schoolId}/admission-workflow`
        : '/api/admission/workflow';
      const res = await fetch(url, {
        method: 'POST', headers,
        body: JSON.stringify({ name: workflowName, sameForAllRoles, steps }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setExistingId(data.workflow?.id ?? existingId);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  }

  const totalSteps = steps.length;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Admission Workflow</h1>
        <p className="text-sm text-surface-400 mt-0.5">
          Configure approval steps, checklists, payment gates, and SPOC for each stage.
        </p>
      </div>

      {/* School selector — super admin only */}
      {isSuperAdmin && (
        <div className="card p-4 flex items-center gap-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-surface-400 shrink-0">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">School:</label>
          <select className="input-field flex-1" value={schoolId} onChange={e => setSchoolId(e.target.value)}>
            <option value="">— Select a school —</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}

      {/* Global options */}
      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Workflow Options</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Same for all roles */}
          <div className={`rounded-xl border p-4 cursor-pointer transition-colors ${
            sameForAllRoles
              ? 'border-brand-200 dark:border-brand-800 bg-brand-50/50 dark:bg-brand-950/10'
              : 'border-surface-100 dark:border-gray-700 hover:border-surface-200'
          }`}
            onClick={() => setSameForAllRoles(v => !v)}
          >
            <div className="flex items-start gap-3">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 ${
                sameForAllRoles
                  ? 'border-brand-500 bg-brand-500'
                  : 'border-surface-300 dark:border-gray-600'
              }`}>
                {sameForAllRoles && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Same workflow for all roles</p>
                <p className="text-xs text-surface-400 mt-0.5">Every applicant and reviewer follows the same stages regardless of role.</p>
              </div>
            </div>
          </div>

          <div className={`rounded-xl border p-4 cursor-pointer transition-colors ${
            !sameForAllRoles
              ? 'border-brand-200 dark:border-brand-800 bg-brand-50/50 dark:bg-brand-950/10'
              : 'border-surface-100 dark:border-gray-700 hover:border-surface-200'
          }`}
            onClick={() => setSameForAllRoles(v => !v)}
          >
            <div className="flex items-start gap-3">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 ${
                !sameForAllRoles
                  ? 'border-brand-500 bg-brand-500'
                  : 'border-surface-300 dark:border-gray-600'
              }`}>
                {!sameForAllRoles && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Role-specific workflow</p>
                <p className="text-xs text-surface-400 mt-0.5">Each approver role sees a different set of stages (advanced).</p>
              </div>
            </div>
          </div>
        </div>

        {/* SPOC toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 rounded accent-violet-500"
            checked={spocEnabled}
            onChange={e => {
              setSpocEnabled(e.target.checked);
              if (!e.target.checked) setSteps(s => s.map(st => ({ ...st, spocUserId: '' })));
            }}
          />
          <div>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Enable SPOC (Point of Contact)</span>
            <p className="text-xs text-surface-400">Assign a coordinator to each stage (except the initial) for visibility and accountability.</p>
          </div>
        </label>
      </div>

      {/* Preset templates */}
      <div>
        <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Quick Templates</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PRESETS.map(p => (
            <button key={p.id} type="button" onClick={() => applyPreset(p)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                activePreset === p.id
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30'
                  : 'border-surface-100 dark:border-gray-700 hover:border-brand-200 dark:hover:border-brand-800'
              }`}
            >
              <p className={`text-sm font-semibold mb-1 ${activePreset === p.id ? 'text-brand-700 dark:text-brand-300' : 'text-gray-900 dark:text-gray-100'}`}>
                {p.label}
              </p>
              <p className="text-xs text-surface-400 leading-relaxed">{p.description}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {p.steps.map((s, i) => (
                  <span key={i} className="text-[10px] bg-surface-100 dark:bg-gray-800 text-surface-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
                    {i + 1}. {s.label}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Step builder */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Approval Steps</h2>
            <p className="text-xs text-surface-400 mt-0.5">
              Each step has an approver, optional checklist, payment gate, SPOC, and reassignment toggle.
            </p>
          </div>
          <input
            className="input-field w-48 text-sm"
            placeholder="Workflow name"
            value={workflowName}
            onChange={e => setWorkflowName(e.target.value)}
          />
        </div>

        {/* Steps */}
        <div className="space-y-2">
          {steps.map((step, i) => (
            <StepCard
              key={i}
              step={step}
              index={i}
              total={totalSteps}
              isFinal={i === totalSteps - 1}
              users={users}
              spocEnabled={spocEnabled}
              onChange={patch => updateStep(i, patch)}
              onRemove={() => removeStep(i)}
              onMove={dir => moveStep(i, dir)}
            />
          ))}
        </div>

        <button type="button" onClick={addStep}
          className="btn-secondary text-sm flex items-center gap-2 w-full justify-center">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Step
        </button>

        {/* How it works */}
        <div className="bg-surface-50 dark:bg-gray-800/50 rounded-xl px-4 py-3 space-y-1.5">
          <p className="font-medium text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wider">How it works</p>
          <p className="text-xs text-surface-500">
            Applications move through steps in order. Each step's approver reviews and can advance or reject.
          </p>
          <p className="text-xs text-surface-500">
            The <span className="font-semibold text-emerald-600 dark:text-emerald-400">last step</span> auto-provisions the student record, parent account, and admission invoice on approval.
          </p>
          <p className="text-xs text-surface-500">
            Expand a step (checklist icon) to add tasks, require payment, assign a SPOC, or enable reassignment.
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">{error}</p>
        )}

        <button type="button" onClick={save} disabled={saving || !schoolId}
          className="btn-primary w-full disabled:opacity-50">
          {saving ? 'Saving…' : saved ? '✓ Workflow Saved!' : existingId ? 'Update Workflow' : 'Save Workflow'}
        </button>
      </div>
    </div>
  );
}
