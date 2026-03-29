'use client';

import { useEffect, useState, useCallback } from 'react';

// ── Constants ─────────────────────────────────────────────────────────────────

const ACTOR_ROLES = [
  { code: 'parent',        label: 'Parent' },
  { code: 'school_admin',  label: 'School Admin' },
  { code: 'teacher',       label: 'Teacher' },
  { code: 'hod',           label: 'HOD' },
  { code: 'principal',     label: 'Principal' },
  { code: 'employee',      label: 'Employee' },
  { code: 'class_teacher', label: 'Class Teacher (auto-assigned)' },
];

const LEAVE_ROLES = [
  { code: 'employee',  label: 'Employee' },
  { code: 'teacher',   label: 'Teacher' },
  { code: 'hod',       label: 'HOD' },
  { code: 'principal', label: 'Principal' },
  { code: 'parent',    label: 'Parent / Student' },
];

interface WorkflowStep {
  label:          string;
  approverRole:   string;
  approverUserId: string;
  emailEnabled:   boolean;
  notifyEnabled:  boolean;
  notifyMessage:  string;
  isFinal:        boolean;
}

type WorkflowType = 'admission' | 'leave';

const emptyStep = (): WorkflowStep => ({
  label: '', approverRole: 'school_admin', approverUserId: '',
  emailEnabled: false, notifyEnabled: true, notifyMessage: '',
  isFinal: false,
});

// ── Step row ──────────────────────────────────────────────────────────────────

function StepRow({
  step, index, total, isAdmission, users,
  onChange, onRemove, onMove,
}: {
  step: WorkflowStep; index: number; total: number; isAdmission: boolean;
  users: any[];
  onChange: (field: keyof WorkflowStep, val: any) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const filteredUsers = step.approverRole
    ? users.filter((u: any) => u.userRoles?.some((r: any) => r.role?.code === step.approverRole))
    : users;

  return (
    <div className="card p-4 space-y-3">
      {/* Row 1: order + label + role + final toggle */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="w-7 h-7 bg-brand-100 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
          {index + 1}
        </span>

        <input
          className="input flex-1 min-w-[140px] text-sm"
          placeholder="Stage name…"
          value={step.label}
          onChange={e => onChange('label', e.target.value)}
        />

        <select
          className="input text-sm w-44 flex-shrink-0"
          value={step.approverRole}
          onChange={e => { onChange('approverRole', e.target.value); onChange('approverUserId', ''); }}
        >
          <option value="">— Any role —</option>
          {ACTOR_ROLES.map(r => (
            <option key={r.code} value={r.code}>{r.label}</option>
          ))}
        </select>

        <select
          className="input text-sm w-44 flex-shrink-0"
          value={step.approverUserId}
          onChange={e => onChange('approverUserId', e.target.value)}
        >
          <option value="">— Any user —</option>
          {filteredUsers.map((u: any) => (
            <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
          ))}
        </select>

        {isAdmission && (
          <label className="flex items-center gap-1.5 shrink-0 cursor-pointer" title="Final stage — creates student record on completion">
            <input
              type="checkbox"
              className="w-4 h-4 rounded accent-emerald-500"
              checked={step.isFinal}
              onChange={e => onChange('isFinal', e.target.checked)}
            />
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">Final stage</span>
          </label>
        )}

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button onClick={() => onMove(-1)} disabled={index === 0} className="p-1 text-surface-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18,15 12,9 6,15"/></svg>
          </button>
          <button onClick={() => onMove(1)} disabled={index === total - 1} className="p-1 text-surface-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6,9 12,15 18,9"/></svg>
          </button>
          <button onClick={onRemove} className="p-1 text-surface-400 hover:text-red-500 transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      {/* Row 2: notification config */}
      <div className="pl-10 flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 rounded accent-brand-500"
            checked={step.notifyEnabled} onChange={e => onChange('notifyEnabled', e.target.checked)} />
          <span className="text-xs text-surface-500 dark:text-gray-400">In-app notification</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 rounded accent-brand-500"
            checked={step.emailEnabled} onChange={e => onChange('emailEnabled', e.target.checked)} />
          <span className="text-xs text-surface-500 dark:text-gray-400">Email notification</span>
        </label>

        {(step.notifyEnabled || step.emailEnabled) && (
          <input
            className="input text-xs flex-1 min-w-[200px]"
            placeholder="Custom message (optional)…"
            value={step.notifyMessage}
            onChange={e => onChange('notifyMessage', e.target.value)}
          />
        )}
      </div>
    </div>
  );
}

// ── Default stage helpers ─────────────────────────────────────────────────────

function defaultAdmissionSteps(): WorkflowStep[] {
  return [
    { ...emptyStep(), label: 'Parent Submits Application',  approverRole: 'parent',       notifyEnabled: true },
    { ...emptyStep(), label: 'School Admin Review',          approverRole: 'school_admin', notifyEnabled: true },
    { ...emptyStep(), label: 'Principal Final Approval',     approverRole: 'principal',    notifyEnabled: true, isFinal: true },
  ];
}

function defaultLeaveSteps(role: string): WorkflowStep[] {
  switch (role) {
    case 'employee':
    case 'teacher':
      return [
        { ...emptyStep(), label: 'HOD Approval',       approverRole: 'hod',          notifyEnabled: true },
        { ...emptyStep(), label: 'Principal Approval', approverRole: 'principal',    notifyEnabled: true },
      ];
    case 'hod':
      return [{ ...emptyStep(), label: 'Principal Approval',    approverRole: 'principal',    notifyEnabled: true }];
    case 'principal':
      return [{ ...emptyStep(), label: 'School Admin Approval', approverRole: 'school_admin', notifyEnabled: true }];
    case 'parent':
      return [{ ...emptyStep(), label: 'Class Teacher Approval', approverRole: 'class_teacher', notifyEnabled: true }];
    default:
      return [{ ...emptyStep(), label: 'Manager Approval', approverRole: 'school_admin', notifyEnabled: true }];
  }
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WorkflowPage({ params }: { params: { id: string } }) {
  const schoolId = params.id;

  const [activeType,      setActiveType]      = useState<WorkflowType>('admission');
  const [activeLeaveRole, setActiveLeaveRole] = useState(LEAVE_ROLES[0].code);

  const [admissionSteps, setAdmissionSteps] = useState<WorkflowStep[]>([]);
  const [leaveSteps,     setLeaveSteps]     = useState<Record<string, WorkflowStep[]>>({});
  const [loadedKeys,     setLoadedKeys]     = useState<Set<string>>(new Set());
  const [loadingKey,     setLoadingKey]     = useState('');
  const [saving,         setSaving]         = useState(false);
  const [saved,          setSaved]          = useState(false);
  const [error,          setError]          = useState('');
  const [users,          setUsers]          = useState<any[]>([]);

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetch(`/api/super-admin/schools/${schoolId}/users`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setUsers(d.users || []))
      .catch(() => {});
  }, [schoolId]);

  const loadWorkflow = useCallback(async (type: WorkflowType, leaveRole?: string) => {
    const key = type === 'admission' ? 'admission' : `leave_${leaveRole}`;
    if (loadedKeys.has(key)) return;
    setLoadingKey(key);
    try {
      const url = type === 'admission'
        ? `/api/super-admin/schools/${schoolId}/workflow?type=admission`
        : `/api/super-admin/schools/${schoolId}/workflow?type=leave&role=${leaveRole}`;
      const res  = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const steps: WorkflowStep[] = (data.workflow?.steps ?? []).map((s: any) => ({
        label:          s.label,
        approverRole:   s.approverRole   ?? '',
        approverUserId: s.approverUserId ?? '',
        emailEnabled:   s.emailEnabled   ?? false,
        notifyEnabled:  s.notifyEnabled  ?? true,
        notifyMessage:  s.notifyMessage  ?? '',
        isFinal:        s.isFinal        ?? false,
      }));

      if (type === 'admission') {
        setAdmissionSteps(steps.length > 0 ? steps : defaultAdmissionSteps());
      } else {
        setLeaveSteps(prev => ({ ...prev, [leaveRole!]: steps.length > 0 ? steps : defaultLeaveSteps(leaveRole!) }));
      }
      setLoadedKeys(prev => new Set([...prev, key]));
    } catch {
      if (type === 'admission') setAdmissionSteps(defaultAdmissionSteps());
      else setLeaveSteps(prev => ({ ...prev, [leaveRole!]: defaultLeaveSteps(leaveRole!) }));
    }
    setLoadingKey('');
  }, [schoolId, token, loadedKeys]);

  useEffect(() => { loadWorkflow('admission'); }, []);
  useEffect(() => {
    if (activeType === 'leave') loadWorkflow('leave', activeLeaveRole);
  }, [activeType, activeLeaveRole]);

  const currentKey   = activeType === 'admission' ? 'admission' : `leave_${activeLeaveRole}`;
  const currentSteps = activeType === 'admission' ? admissionSteps : (leaveSteps[activeLeaveRole] ?? []);
  const isLoading    = loadingKey === currentKey;

  function setCurrentSteps(fn: (prev: WorkflowStep[]) => WorkflowStep[]) {
    if (activeType === 'admission') setAdmissionSteps(fn);
    else setLeaveSteps(prev => ({ ...prev, [activeLeaveRole]: fn(prev[activeLeaveRole] ?? []) }));
  }

  function updateStep(i: number, field: keyof WorkflowStep, val: any) {
    setCurrentSteps(steps => {
      const arr = [...steps]; arr[i] = { ...arr[i], [field]: val }; return arr;
    });
  }

  const addStep    = () => setCurrentSteps(s => [...s, emptyStep()]);
  const removeStep = (i: number) => setCurrentSteps(s => s.filter((_, idx) => idx !== i));
  const moveStep   = (i: number, dir: -1 | 1) => setCurrentSteps(s => {
    const arr = [...s]; const ni = i + dir;
    if (ni < 0 || ni >= arr.length) return arr;
    [arr[i], arr[ni]] = [arr[ni], arr[i]]; return arr;
  });

  async function save() {
    setSaving(true); setError(''); setSaved(false);
    try {
      const body = activeType === 'admission'
        ? { type: 'admission', name: 'Admission Workflow', steps: currentSteps }
        : { type: 'leave', role: activeLeaveRole, steps: currentSteps };
      const res  = await fetch(`/api/super-admin/schools/${schoolId}/workflow`, {
        method: 'POST', headers, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Workflow Configuration</h1>
        <p className="text-sm text-surface-400 mt-0.5">
          Define approval stages per workflow type. Each stage specifies the actor role, and notification settings.
        </p>
      </div>

      {/* Type tabs */}
      <div className="flex gap-1 border-b border-surface-100 dark:border-gray-800">
        {(['admission', 'leave'] as WorkflowType[]).map(t => (
          <button key={t} onClick={() => setActiveType(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize -mb-px ${
              activeType === t
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-surface-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t === 'admission' ? 'Admission' : 'Leave'} Workflow
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Leave role selector */}
        {activeType === 'leave' && (
          <div className="w-48 shrink-0 space-y-1">
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider px-3 mb-2">Role</p>
            {LEAVE_ROLES.map(r => (
              <button key={r.code} onClick={() => setActiveLeaveRole(r.code)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeLeaveRole === r.code
                    ? 'bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300'
                    : 'text-surface-400 hover:bg-surface-50 dark:hover:bg-gray-700/40'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}

        {/* Steps editor */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                {activeType === 'admission'
                  ? 'Admission Approval Stages'
                  : `${LEAVE_ROLES.find(r => r.code === activeLeaveRole)?.label} Leave Stages`}
              </h2>
              <p className="text-xs text-surface-400 mt-0.5">
                {activeType === 'admission'
                  ? 'Mark the last stage as "Final" — student record is created automatically on completion.'
                  : activeLeaveRole === 'parent'
                    ? 'Parent requests flow to the class teacher of the enrolled child.'
                    : 'Multi-level chain — each stage approver must act before the next stage activates.'}
              </p>
            </div>
            <button onClick={addStep} className="btn btn-secondary text-sm">+ Add Stage</button>
          </div>

          {activeType === 'leave' && activeLeaveRole === 'parent' && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl text-sm text-blue-700 dark:text-blue-300">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 flex-shrink-0">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Set the first approver to <strong className="mx-1">Class Teacher</strong>
              to automatically route to the student's assigned class teacher.
            </div>
          )}

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-24 bg-surface-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
            </div>
          ) : currentSteps.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-sm text-surface-400 dark:text-gray-500">No stages configured yet.</p>
              <button onClick={addStep} className="mt-3 btn btn-primary text-sm">Add First Stage</button>
            </div>
          ) : (
            <div className="space-y-2">
              {currentSteps.map((step, i) => (
                <StepRow
                  key={i} step={step} index={i} total={currentSteps.length}
                  isAdmission={activeType === 'admission'} users={users}
                  onChange={(f, v) => updateStep(i, f, v)}
                  onRemove={() => removeStep(i)}
                  onMove={dir => moveStep(i, dir)}
                />
              ))}
            </div>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex items-center gap-3 pt-2 border-t border-surface-100 dark:border-gray-700">
            <button onClick={save} disabled={saving || isLoading} className="btn btn-primary">
              {saving ? 'Saving…' : 'Save Workflow'}
            </button>
            {saved && (
              <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>
                Saved!
              </span>
            )}
            <span className="text-xs text-surface-400 ml-auto">Changes apply immediately to new requests</span>
          </div>
        </div>
      </div>
    </div>
  );
}
