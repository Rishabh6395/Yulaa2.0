'use client';

import { useState, useEffect } from 'react';
import { useApi } from '@/hooks/useApi';

const ROLE_OPTIONS = [
  { value: 'school_admin',  label: 'School Admin' },
  { value: 'teacher',       label: 'Class Teacher' },
];

interface Step { stepOrder: number; label: string; approverRole: string; }

export default function WorkflowPage() {
  const [name,    setName]    = useState('Default Workflow');
  const [steps,   setSteps]   = useState<Step[]>([{ stepOrder: 1, label: 'Admin Review', approverRole: 'school_admin' }]);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState('');

  const { data, mutate } = useApi<{ workflow: any }>('/api/admission/workflow');

  // Pre-fill with existing workflow
  useEffect(() => {
    if (data?.workflow) {
      setName(data.workflow.name);
      setSteps(data.workflow.steps.map((s: any) => ({ stepOrder: s.stepOrder, label: s.label, approverRole: s.approverRole })));
    }
  }, [data]);

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const addStep = () => setSteps(ss => [...ss, { stepOrder: ss.length + 1, label: '', approverRole: 'school_admin' }]);
  const removeStep = (i: number) => setSteps(ss => ss.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, stepOrder: idx + 1 })));
  const updateStep = (i: number, field: keyof Step, value: string | number) =>
    setSteps(ss => ss.map((s, idx) => idx === i ? { ...s, [field]: value } : s));

  const save = async () => {
    if (!name.trim()) return setError('Workflow name is required');
    if (steps.some(s => !s.label)) return setError('All steps must have a label');
    setSaving(true); setError('');
    const res = await fetch('/api/admission/workflow', {
      method: 'POST', headers, body: JSON.stringify({ name, steps }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed to save'); setSaving(false); return; }
    await mutate();
    setSaved(true); setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Admission Workflow</h1>
        <p className="text-sm text-surface-400 mt-0.5">Configure the approval chain for new admission applications</p>
      </div>

      <div className="card p-6 space-y-5">
        <div>
          <label className="label">Workflow Name</label>
          <input className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Standard Admission Flow"/>
        </div>

        <div className="space-y-3">
          <label className="label">Approval Steps</label>
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-surface-50 dark:bg-gray-800/50 rounded-xl border border-surface-100 dark:border-gray-700">
              <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center text-xs font-bold shrink-0">
                {step.stepOrder}
              </div>
              <input
                className="input-field flex-1"
                placeholder="Step label (e.g. Principal Review)"
                value={step.label}
                onChange={e => updateStep(i, 'label', e.target.value)}
              />
              <select
                className="input-field w-44 shrink-0"
                value={step.approverRole}
                onChange={e => updateStep(i, 'approverRole', e.target.value)}
              >
                {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              {steps.length > 1 && (
                <button onClick={() => removeStep(i)} className="text-surface-300 hover:text-red-500 transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
            </div>
          ))}
          <button onClick={addStep} className="btn-secondary text-sm flex items-center gap-2 w-full justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Step
          </button>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="bg-surface-50 dark:bg-gray-800/50 rounded-xl p-4 text-sm text-surface-500 space-y-1">
          <p className="font-medium text-gray-700 dark:text-gray-300">How it works</p>
          <p>Each new application starts at Step 1. An approver at that step can advance it to the next step or reject it.</p>
          <p>After the final step is approved, the system automatically creates the student record, parent account, and admission invoice.</p>
        </div>

        <button onClick={save} disabled={saving} className="btn-primary w-full">
          {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Workflow'}
        </button>
      </div>
    </div>
  );
}
