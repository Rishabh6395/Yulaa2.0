'use client';

import { useState, useEffect } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Step {
  stepOrder:    number;
  label:        string;
  approverRole: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const APPROVER_ROLES = [
  { value: 'school_admin', label: 'School Admin' },
  { value: 'principal',    label: 'Principal' },
  { value: 'teacher',      label: 'Teacher' },
  { value: 'super_admin',  label: 'Super Admin' },
];

const PRESETS: { id: string; label: string; description: string; steps: Omit<Step, 'stepOrder'>[] }[] = [
  {
    id:          'direct',
    label:       'Direct Approval',
    description: 'School Admin reviews and approves in one step.',
    steps: [
      { label: 'Admin Review',  approverRole: 'school_admin' },
    ],
  },
  {
    id:          'standard',
    label:       'Standard (2 Steps)',
    description: 'School Admin reviews, then Principal gives final approval.',
    steps: [
      { label: 'Admin Review',        approverRole: 'school_admin' },
      { label: 'Principal Approval',  approverRole: 'principal' },
    ],
  },
  {
    id:          'full',
    label:       'Full Review (3 Steps)',
    description: 'Teacher pre-screens, Admin reviews, Principal gives final approval.',
    steps: [
      { label: 'Teacher Pre-screen',  approverRole: 'teacher' },
      { label: 'Admin Review',        approverRole: 'school_admin' },
      { label: 'Principal Approval',  approverRole: 'principal' },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function toSteps(raw: Omit<Step, 'stepOrder'>[]): Step[] {
  return raw.map((s, i) => ({ ...s, stepOrder: i + 1 }));
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function WorkflowPage() {
  const [steps,         setSteps]         = useState<Step[]>(toSteps(PRESETS[0].steps));
  const [activePreset,  setActivePreset]  = useState<string>('direct');
  const [workflowName,  setWorkflowName]  = useState('Default Workflow');
  const [saving,        setSaving]        = useState(false);
  const [saved,         setSaved]         = useState(false);
  const [error,         setError]         = useState('');
  const [existingId,    setExistingId]    = useState<string | null>(null);

  // Super admin: school picker
  const [isSuperAdmin,  setIsSuperAdmin]  = useState(false);
  const [schools,       setSchools]       = useState<{ id: string; name: string }[]>([]);
  const [schoolId,      setSchoolId]      = useState('');

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Detect role and load schools for super admin
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
          if (list.length > 0) setSchoolId(list[0].id);
        })
        .catch(() => setError('Failed to load schools — please refresh the page'));
    } else {
      setSchoolId(user.schoolId ?? '');
    }
  }, []);

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
        const loaded: Step[] = (wf.steps ?? []).map((s: any) => ({
          stepOrder:    s.stepOrder,
          label:        s.label,
          approverRole: s.approverRole,
        }));
        if (loaded.length > 0) {
          setSteps(loaded);
          setActivePreset('');
        }
      });
  }, [schoolId]);

  // Apply a preset template
  function applyPreset(preset: typeof PRESETS[number]) {
    setSteps(toSteps(preset.steps));
    setActivePreset(preset.id);
    setWorkflowName(preset.label);
  }

  function addStep() {
    setSteps(s => [...s, { stepOrder: s.length + 1, label: '', approverRole: 'school_admin' }]);
    setActivePreset('');
  }

  function removeStep(i: number) {
    setSteps(s => s.filter((_, idx) => idx !== i).map((st, idx) => ({ ...st, stepOrder: idx + 1 })));
    setActivePreset('');
  }

  function updateStep(i: number, field: keyof Step, val: string) {
    setSteps(s => s.map((st, idx) => idx === i ? { ...st, [field]: val } : st));
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
      const res  = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: workflowName, steps }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setExistingId(data.workflow?.id ?? existingId);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Admission Workflow</h1>
        <p className="text-sm text-surface-400 mt-0.5">
          Set up who reviews and approves admission applications, step by step.
        </p>
      </div>

      {/* Super admin: school selector */}
      {isSuperAdmin && (
        <div className="card p-4 flex items-center gap-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-surface-400 shrink-0">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">Configure workflow for:</label>
          <select className="input-field flex-1" value={schoolId} onChange={e => setSchoolId(e.target.value)}>
            <option value="">— Select a school —</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}

      {/* Preset templates */}
      <div>
        <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Quick Templates</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PRESETS.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p)}
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Approval Steps</h2>
            <p className="text-xs text-surface-400 mt-0.5">
              Applications move through each step in order. The last step triggers student enrolment.
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
            <div key={i} className="flex items-center gap-3">
              {/* Step number + connector */}
              <div className="flex flex-col items-center shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  i === steps.length - 1
                    ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                    : 'bg-brand-100 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300'
                }`}>
                  {i === steps.length - 1 ? '✓' : i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div className="w-px h-4 bg-surface-200 dark:bg-gray-700" />
                )}
              </div>

              {/* Step fields */}
              <div className="flex-1 flex items-center gap-2">
                <input
                  className="input-field flex-1 text-sm"
                  placeholder="Step name (e.g. Principal Approval)"
                  value={step.label}
                  onChange={e => updateStep(i, 'label', e.target.value)}
                />
                <select
                  className="input-field w-40 text-sm shrink-0"
                  value={step.approverRole}
                  onChange={e => updateStep(i, 'approverRole', e.target.value)}
                >
                  {APPROVER_ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                {i === steps.length - 1 && (
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-full whitespace-nowrap shrink-0 font-medium">
                    Final
                  </span>
                )}
                {steps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStep(i)}
                    className="text-surface-300 hover:text-red-500 transition-colors shrink-0 p-1"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addStep}
          className="btn-secondary text-sm flex items-center gap-2 w-full justify-center"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Step
        </button>

        {/* How it works */}
        <div className="bg-surface-50 dark:bg-gray-800/50 rounded-xl px-4 py-3 text-sm text-surface-500 space-y-1">
          <p className="font-medium text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wider">How it works</p>
          <p className="text-xs">A new application starts at Step 1. The assigned reviewer can advance it or reject it.</p>
          <p className="text-xs">After the <span className="font-medium text-emerald-600 dark:text-emerald-400">final step</span> is approved, the system automatically creates the student record, parent account, and admission invoice.</p>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">{error}</p>
        )}

        <button
          type="button"
          onClick={save}
          disabled={saving || !schoolId}
          className="btn-primary w-full disabled:opacity-50"
        >
          {saving ? 'Saving…' : saved ? '✓ Workflow Saved!' : existingId ? 'Update Workflow' : 'Save Workflow'}
        </button>
      </div>
    </div>
  );
}
