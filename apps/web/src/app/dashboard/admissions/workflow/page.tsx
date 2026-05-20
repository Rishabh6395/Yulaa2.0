'use client';

import { useState, useEffect } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChecklistItem {
  label:        string;
  actionRole:   string;
  required:     boolean;
  documentType?: string;
  description?:  string;
}

const DOCUMENT_TYPES = [
  { value: '',              label: 'None' },
  { value: 'certificate',   label: 'Certificate' },
  { value: 'id_proof',      label: 'ID Proof' },
  { value: 'form',          label: 'Form / Application' },
  { value: 'photo',         label: 'Photo' },
  { value: 'report_card',   label: 'Report Card' },
  { value: 'other',         label: 'Other Document' },
];

interface Step {
  stepOrder:      number;
  label:          string;
  approverRole:   string;
  checklistItems: ChecklistItem[];
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

const PRESETS: { id: string; label: string; description: string; steps: Omit<Step, 'stepOrder'>[] }[] = [
  {
    id:          'direct',
    label:       'Direct Approval',
    description: 'School Admin reviews and approves in one step.',
    steps: [
      { label: 'Admin Review', approverRole: 'school_admin', checklistItems: [] },
    ],
  },
  {
    id:          'standard',
    label:       'Standard (2 Steps)',
    description: 'School Admin reviews, then Principal gives final approval.',
    steps: [
      { label: 'Admin Review',       approverRole: 'school_admin', checklistItems: [] },
      { label: 'Principal Approval', approverRole: 'principal',    checklistItems: [] },
    ],
  },
  {
    id:          'full',
    label:       'Full Review (3 Steps)',
    description: 'Teacher pre-screens, Admin reviews, Principal gives final approval.',
    steps: [
      { label: 'Teacher Pre-screen', approverRole: 'teacher',      checklistItems: [] },
      { label: 'Admin Review',       approverRole: 'school_admin', checklistItems: [] },
      { label: 'Principal Approval', approverRole: 'principal',    checklistItems: [] },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function toSteps(raw: Omit<Step, 'stepOrder'>[]): Step[] {
  return raw.map((s, i) => ({ ...s, stepOrder: i + 1, checklistItems: s.checklistItems ?? [] }));
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
  const [expandedStep,     setExpandedStep]     = useState<number | null>(null);
  const [checklistRoleTab, setChecklistRoleTab] = useState<Record<number, string>>({});

  // Super admin: school picker
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [schools,      setSchools]      = useState<{ id: string; name: string }[]>([]);
  const [schoolId,     setSchoolId]     = useState('');

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
          stepOrder:      s.stepOrder,
          label:          s.label,
          approverRole:   s.approverRole,
          checklistItems: (s.checklistItems as ChecklistItem[] | null) ?? [],
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
    setExpandedStep(null);
  }

  function addStep() {
    setSteps(s => [...s, { stepOrder: s.length + 1, label: '', approverRole: 'school_admin', checklistItems: [] }]);
    setActivePreset('');
  }

  function removeStep(i: number) {
    setSteps(s => s.filter((_, idx) => idx !== i).map((st, idx) => ({ ...st, stepOrder: idx + 1 })));
    setActivePreset('');
    setExpandedStep(null);
  }

  function updateStep(i: number, field: keyof Omit<Step, 'checklistItems'>, val: string) {
    setSteps(s => s.map((st, idx) => idx === i ? { ...st, [field]: val } : st));
    setActivePreset('');
  }

  // ── Checklist helpers ─────────────────────────────────────────────────────

  function addChecklistItem(stepIdx: number, role?: string) {
    const actionRole = role ?? checklistRoleTab[stepIdx] ?? 'school_admin';
    setSteps(s => s.map((st, idx) =>
      idx === stepIdx
        ? { ...st, checklistItems: [...st.checklistItems, { label: '', actionRole, required: false }] }
        : st,
    ));
  }

  function updateChecklistItem(stepIdx: number, itemIdx: number, field: keyof ChecklistItem, val: string | boolean) {
    setSteps(s => s.map((st, idx) =>
      idx === stepIdx
        ? {
            ...st,
            checklistItems: st.checklistItems.map((it, iIdx) =>
              iIdx === itemIdx ? { ...it, [field]: val } : it,
            ),
          }
        : st,
    ));
  }

  function removeChecklistItem(stepIdx: number, itemIdx: number) {
    setSteps(s => s.map((st, idx) =>
      idx === stepIdx
        ? { ...st, checklistItems: st.checklistItems.filter((_, iIdx) => iIdx !== itemIdx) }
        : st,
    ));
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function save() {
    if (!schoolId) return setError('Please select a school first.');
    if (steps.some(s => !s.label.trim())) return setError('Every step needs a name.');
    setSaving(true); setError('');
    try {
      const url = isSuperAdmin
        ? `/api/super-admin/schools/${schoolId}/admission-workflow`
        : '/api/admission/workflow';
      const res = await fetch(url, {
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
    <div className="space-y-6 animate-fade-in max-w-3xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Admission Workflow</h1>
        <p className="text-sm text-surface-400 mt-0.5">
          Configure approval steps and per-step checklists for admission applications.
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
        <div className="space-y-3">
          {steps.map((step, i) => {
            const isFinal    = i === steps.length - 1;
            const isExpanded = expandedStep === i;

            return (
              <div key={i} className={`rounded-xl border transition-colors ${
                isExpanded
                  ? 'border-brand-200 dark:border-brand-800 bg-brand-50/30 dark:bg-brand-950/10'
                  : 'border-surface-100 dark:border-gray-700'
              }`}>
                {/* Step header row */}
                <div className="flex items-center gap-3 p-3">
                  {/* Step number */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isFinal
                      ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                      : 'bg-brand-100 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300'
                  }`}>
                    {isFinal ? '✓' : i + 1}
                  </div>

                  {/* Step name + approver */}
                  <div className="flex-1 flex items-center gap-2 flex-wrap">
                    <input
                      className="input-field flex-1 min-w-40 text-sm"
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
                    {isFinal && (
                      <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-full whitespace-nowrap shrink-0 font-medium">
                        Final
                      </span>
                    )}
                  </div>

                  {/* Checklist toggle + delete */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setExpandedStep(isExpanded ? null : i)}
                      title={isExpanded ? 'Hide checklist' : 'Configure checklist & approvers'}
                      className={`flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg transition-colors ${
                        isExpanded
                          ? 'bg-brand-100 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300'
                          : step.checklistItems.length > 0
                            ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                            : 'text-surface-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-950/20'
                      }`}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                      </svg>
                      {step.checklistItems.length > 0 ? `${step.checklistItems.length} checklist item${step.checklistItems.length > 1 ? 's' : ''}` : 'Checklist'}
                    </button>
                    {steps.length > 1 && (
                      <button type="button" onClick={() => removeStep(i)}
                        className="text-surface-300 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Checklist & Approver panel */}
                {isExpanded && (() => {
                  const activeRole = checklistRoleTab[i] ?? ACTION_ROLES[0].value;
                  const activeRoleLabel = ACTION_ROLES.find(r => r.value === activeRole)?.label ?? activeRole;
                  const roleItems = step.checklistItems
                    .map((item, globalIdx) => ({ item, globalIdx }))
                    .filter(({ item }) => item.actionRole === activeRole);

                  return (
                    <div className="border-t border-surface-100 dark:border-gray-700/50 px-4 pb-4 pt-3 space-y-3">
                      {/* Panel header */}
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                          </svg>
                          Checklist &amp; Approvers — {step.label || `Step ${i + 1}`}
                        </p>
                        <p className="text-[10px] text-surface-400">
                          {step.checklistItems.length} item{step.checklistItems.length !== 1 ? 's' : ''} total
                        </p>
                      </div>

                      {/* Role tabs */}
                      <div className="flex gap-1 flex-wrap border-b border-surface-100 dark:border-gray-700/50 pb-2">
                        {ACTION_ROLES.map(role => {
                          const count = step.checklistItems.filter(it => it.actionRole === role.value).length;
                          const isActiveTab = activeRole === role.value;
                          return (
                            <button
                              key={role.value}
                              type="button"
                              onClick={() => setChecklistRoleTab(t => ({ ...t, [i]: role.value }))}
                              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-colors ${
                                isActiveTab
                                  ? 'bg-brand-100 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 font-semibold'
                                  : 'text-surface-500 dark:text-gray-400 hover:bg-surface-100 dark:hover:bg-gray-800'
                              }`}
                            >
                              {role.label}
                              {count > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                  isActiveTab
                                    ? 'bg-brand-200 dark:bg-brand-900/60 text-brand-800 dark:text-brand-200'
                                    : 'bg-surface-200 dark:bg-gray-700 text-surface-600 dark:text-gray-400'
                                }`}>
                                  {count}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Role description hint */}
                      <p className="text-[11px] text-surface-400 -mt-1">
                        Items below must be completed by <span className="font-medium text-gray-600 dark:text-gray-400">{activeRoleLabel}</span> before this step can be advanced.
                      </p>

                      {/* Items for active role */}
                      {roleItems.length > 0 && (
                        <div className="space-y-2">
                          {roleItems.map(({ item, globalIdx }) => (
                            <div key={globalIdx} className="rounded-lg border border-surface-200 dark:border-gray-700 bg-surface-50 dark:bg-gray-800/50 p-2.5 space-y-2">
                              {/* Row 1: label + remove */}
                              <div className="flex items-center gap-2">
                                <div className="w-3.5 h-3.5 rounded border border-surface-300 dark:border-gray-600 shrink-0" />
                                <input
                                  className="flex-1 text-sm border border-surface-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-400"
                                  placeholder={`Task for ${activeRoleLabel} (e.g. Verify birth certificate)`}
                                  value={item.label}
                                  onChange={e => updateChecklistItem(i, globalIdx, 'label', e.target.value)}
                                />
                                <button type="button"
                                  onClick={() => removeChecklistItem(i, globalIdx)}
                                  className="text-surface-300 hover:text-red-500 transition-colors p-1 shrink-0"
                                  title="Remove item"
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                  </svg>
                                </button>
                              </div>

                              {/* Row 2: reassign role + doc type + required */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-surface-400">Reassign to:</span>
                                  <select
                                    className="text-xs border border-surface-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-400"
                                    value={item.actionRole}
                                    onChange={e => updateChecklistItem(i, globalIdx, 'actionRole', e.target.value)}
                                    title="Move this item to a different role"
                                  >
                                    {ACTION_ROLES.map(r => (
                                      <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                  </select>
                                </div>
                                <select
                                  className="text-xs border border-surface-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-400"
                                  value={item.documentType ?? ''}
                                  onChange={e => updateChecklistItem(i, globalIdx, 'documentType', e.target.value)}
                                  title="Document type required"
                                >
                                  {DOCUMENT_TYPES.map(d => (
                                    <option key={d.value} value={d.value}>{d.label}</option>
                                  ))}
                                </select>
                                <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 cursor-pointer select-none ml-auto">
                                  <input
                                    type="checkbox"
                                    checked={item.required}
                                    onChange={e => updateChecklistItem(i, globalIdx, 'required', e.target.checked)}
                                    className="w-3.5 h-3.5 accent-brand-500 cursor-pointer"
                                  />
                                  Required
                                </label>
                              </div>

                              {/* Row 3: description */}
                              <input
                                className="w-full text-xs border border-surface-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 placeholder-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-400"
                                placeholder="Instructions for this role (optional)"
                                value={item.description ?? ''}
                                onChange={e => updateChecklistItem(i, globalIdx, 'description', e.target.value)}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {roleItems.length === 0 && (
                        <div className="text-center py-4 rounded-lg border border-dashed border-surface-200 dark:border-gray-700">
                          <p className="text-[11px] text-surface-400 dark:text-gray-600">
                            No checklist items for <span className="font-medium">{activeRoleLabel}</span> yet.
                          </p>
                          <p className="text-[10px] text-surface-300 dark:text-gray-700 mt-0.5">
                            Add items this role must complete before the step can proceed.
                          </p>
                        </div>
                      )}

                      {/* Add item button for active role */}
                      <button type="button"
                        onClick={() => addChecklistItem(i, activeRole)}
                        className="flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 font-medium transition-colors"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        Add item for {activeRoleLabel}
                      </button>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>

        <button type="button" onClick={addStep}
          className="btn-secondary text-sm flex items-center gap-2 w-full justify-center">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Step
        </button>

        {/* How it works */}
        <div className="bg-surface-50 dark:bg-gray-800/50 rounded-xl px-4 py-3 space-y-1">
          <p className="font-medium text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wider">How it works</p>
          <p className="text-xs text-surface-500">A new application starts at Step 1. The assigned reviewer can advance it or reject it.</p>
          <p className="text-xs text-surface-500">After the <span className="font-medium text-emerald-600 dark:text-emerald-400">final step</span> is approved, the system automatically creates the student record, parent account, and admission invoice.</p>
          <p className="text-xs text-surface-500">Use the <span className="font-medium text-gray-700 dark:text-gray-300">Checklist</span> button on each step to configure items per role. Each role tab shows what that role must complete — click "Add item for [Role]" to assign tasks. Items marked <span className="font-medium text-gray-700 dark:text-gray-300">Required</span> must be completed before the step can advance.</p>
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
