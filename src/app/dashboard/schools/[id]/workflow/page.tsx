'use client';

import { useEffect, useState } from 'react';

const WORKFLOW_DEFS = [
  {
    id: 'admission',
    label: 'Admission Workflow',
    desc: 'Steps a new student goes through from application to enrollment',
    defaultSteps: [
      { label: 'Application Submitted', roleId: '', userId: '' },
      { label: 'Document Verification', roleId: '', userId: '' },
      { label: 'Fee Payment', roleId: '', userId: '' },
      { label: 'Class Assignment', roleId: '', userId: '' },
      { label: 'Enrolled', roleId: '', userId: '' },
    ],
  },
  {
    id: 'leave',
    label: 'Leave Approval Workflow',
    desc: 'Approval chain for student leave requests',
    defaultSteps: [
      { label: 'Parent Request', roleId: '', userId: '' },
      { label: 'Class Teacher Approval', roleId: '', userId: '' },
      { label: 'Principal Approval', roleId: '', userId: '' },
    ],
  },
  {
    id: 'tc',
    label: 'Transfer Certificate Workflow',
    desc: 'Steps to issue a Transfer Certificate',
    defaultSteps: [
      { label: 'TC Request', roleId: '', userId: '' },
      { label: 'Fee Clearance Check', roleId: '', userId: '' },
      { label: 'Principal Sign-off', roleId: '', userId: '' },
      { label: 'TC Issued', roleId: '', userId: '' },
    ],
  },
  {
    id: 'query',
    label: 'Query Resolution Workflow',
    desc: 'Steps for resolving parent / student queries',
    defaultSteps: [
      { label: 'Query Submitted', roleId: '', userId: '' },
      { label: 'Assigned to Staff', roleId: '', userId: '' },
      { label: 'Under Review', roleId: '', userId: '' },
      { label: 'Resolved', roleId: '', userId: '' },
    ],
  },
];

interface WorkflowStep {
  label: string;
  roleId: string;
  userId: string;
}

export default function WorkflowPage({ params }: { params: { id: string } }) {
  const schoolId = params.id;
  const [workflows, setWorkflows] = useState<Record<string, WorkflowStep[]>>(
    () => Object.fromEntries(WORKFLOW_DEFS.map(w => [w.id, w.defaultSteps.map(s => ({ ...s }))]))
  );
  const [activeWorkflow, setActiveWorkflow] = useState('admission');
  const [newStepLabel, setNewStepLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token') || '';
    const h = { Authorization: `Bearer ${token}` };
    fetch(`/api/super-admin/schools/${schoolId}/users`, { headers: h })
      .then(r => r.json())
      .then(d => {
        setRoles(d.roles || []);
        setUsers(d.users || []);
      })
      .catch(() => {});
  }, [schoolId]);

  const steps = workflows[activeWorkflow] || [];

  function updateStep(idx: number, field: keyof WorkflowStep, value: string) {
    setWorkflows(w => {
      const arr = [...w[activeWorkflow]];
      arr[idx] = { ...arr[idx], [field]: value };
      // Clear userId when role changes (user may not have that role)
      if (field === 'roleId') arr[idx].userId = '';
      return { ...w, [activeWorkflow]: arr };
    });
  }

  function addStep() {
    if (!newStepLabel.trim()) return;
    setWorkflows(w => ({
      ...w,
      [activeWorkflow]: [...w[activeWorkflow], { label: newStepLabel.trim(), roleId: '', userId: '' }],
    }));
    setNewStepLabel('');
  }

  function removeStep(idx: number) {
    setWorkflows(w => ({ ...w, [activeWorkflow]: w[activeWorkflow].filter((_, i) => i !== idx) }));
  }

  function moveStep(idx: number, dir: -1 | 1) {
    const arr = [...steps];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= arr.length) return;
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setWorkflows(w => ({ ...w, [activeWorkflow]: arr }));
  }

  async function save() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  // Filter users by role if a role is selected for that step
  function getUsersForStep(step: WorkflowStep) {
    if (!step.roleId) return users;
    return users.filter((u: any) =>
      u.userRoles?.some((ur: any) => ur.roleId === step.roleId || ur.role?.id === step.roleId)
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Workflow Configuration</h1>
        <p className="text-sm text-surface-400 mt-0.5">Define approval stages with assigned roles and users for each workflow.</p>
      </div>

      <div className="flex gap-6">
        {/* Workflow selector */}
        <div className="w-52 shrink-0 space-y-1">
          {WORKFLOW_DEFS.map(w => (
            <button
              key={w.id}
              onClick={() => setActiveWorkflow(w.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${activeWorkflow === w.id ? 'bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300 font-medium' : 'text-surface-400 hover:bg-surface-50 dark:hover:bg-gray-700/40'}`}
            >
              {w.label}
            </button>
          ))}
        </div>

        {/* Steps editor */}
        <div className="flex-1 card p-5 space-y-4">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              {WORKFLOW_DEFS.find(w => w.id === activeWorkflow)?.label}
            </h2>
            <p className="text-xs text-surface-400 mt-0.5">
              {WORKFLOW_DEFS.find(w => w.id === activeWorkflow)?.desc}
            </p>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 px-3 items-center">
            <div className="w-6" />
            <div className="text-xs font-semibold text-surface-400 uppercase tracking-wide">Step</div>
            <div className="text-xs font-semibold text-surface-400 uppercase tracking-wide">Assigned Role</div>
            <div className="text-xs font-semibold text-surface-400 uppercase tracking-wide">Assigned User</div>
            <div className="w-16" />
          </div>

          {/* Steps list */}
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={i} className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 p-3 bg-surface-50 dark:bg-gray-700/40 rounded-xl items-center">
                {/* Step number */}
                <span className="w-6 h-6 bg-brand-100 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400 text-xs font-bold rounded-full flex items-center justify-center shrink-0">
                  {i + 1}
                </span>

                {/* Step label */}
                <input
                  className="text-sm bg-white dark:bg-gray-800 border border-surface-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-brand-400 w-full"
                  value={step.label}
                  onChange={e => updateStep(i, 'label', e.target.value)}
                />

                {/* Role dropdown */}
                <select
                  className="text-sm bg-white dark:bg-gray-800 border border-surface-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-brand-400 w-full"
                  value={step.roleId}
                  onChange={e => updateStep(i, 'roleId', e.target.value)}
                >
                  <option value="">— Any Role —</option>
                  {roles.map((r: any) => (
                    <option key={r.id} value={r.id}>{r.displayName || r.roleCode}</option>
                  ))}
                </select>

                {/* User dropdown */}
                <select
                  className="text-sm bg-white dark:bg-gray-800 border border-surface-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-brand-400 w-full"
                  value={step.userId}
                  onChange={e => updateStep(i, 'userId', e.target.value)}
                >
                  <option value="">— Any User —</option>
                  {getUsersForStep(step).map((u: any) => (
                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                  ))}
                </select>

                {/* Actions */}
                <div className="flex items-center gap-0.5">
                  <button onClick={() => moveStep(i, -1)} disabled={i === 0} className="p-1 text-surface-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18,15 12,9 6,15"/></svg>
                  </button>
                  <button onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1} className="p-1 text-surface-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6,9 12,15 18,9"/></svg>
                  </button>
                  <button onClick={() => removeStep(i)} className="p-1 text-surface-400 hover:text-red-500 transition-colors">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add step */}
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="New step name..."
              value={newStepLabel}
              onChange={e => setNewStepLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addStep()}
            />
            <button onClick={addStep} className="btn btn-secondary">+ Add Step</button>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-surface-100 dark:border-gray-700">
            <button onClick={save} disabled={saving} className="btn btn-primary">
              {saving ? 'Saving...' : 'Save Workflow'}
            </button>
            {saved && <span className="text-sm text-emerald-600 font-medium flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20,6 9,17 4,12"/></svg>
              Saved!
            </span>}
          </div>
        </div>
      </div>
    </div>
  );
}
