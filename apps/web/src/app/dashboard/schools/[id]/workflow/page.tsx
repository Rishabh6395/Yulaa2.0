'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

type WorkflowType = 'leave' | 'attendance' | 'fee' | 'query_parents' | 'query_school_admin';

interface Stage {
  stageName:      string;
  initiatorRole:  string;
  approverRole:   string;
  approverUserId: string;
  spocUserId:     string;
  systemTrigger:  string;
  isFinal:        boolean;
  emailEnabled:   boolean;
  notifyEnabled:  boolean;
  notifyMessage:  string;
}

// ── Role options ───────────────────────────────────────────────────────────────

const ALL_ROLES = [
  { code: 'parent',        label: 'Parent' },
  { code: 'school_admin',  label: 'School Admin' },
  { code: 'teacher',       label: 'Teacher' },
  { code: 'hod',           label: 'HOD' },
  { code: 'principal',     label: 'Principal' },
  { code: 'class_teacher', label: 'Class Teacher' },
  { code: 'accountant',    label: 'Accountant' },
  { code: 'employee',      label: 'Employee' },
  { code: 'super_admin',   label: 'Super Admin' },
];

const LEAVE_ROLES = [
  { code: 'teacher',   label: 'Teacher' },
  { code: 'employee',  label: 'Employee' },
  { code: 'hod',       label: 'HOD' },
  { code: 'principal', label: 'Principal' },
  { code: 'parent',    label: 'Parent / Student' },
];

// ── Workflow registry ──────────────────────────────────────────────────────────

const REGISTRY: {
  type: WorkflowType; label: string; description: string; color: string; icon: string;
}[] = [
  { type: 'leave',             label: 'Leave',           description: 'Approval chain for leave requests by role',          color: 'emerald', icon: '📅' },
  { type: 'attendance',        label: 'Attendance',      description: 'Regularisation / anomaly review chain',               color: 'blue',    icon: '📋' },
  { type: 'fee',               label: 'Fee',             description: 'Fee concession & payment approval chain',             color: 'amber',   icon: '💳' },
  { type: 'query_parents',     label: 'Query – Parents', description: 'Parent query routing & resolution flow',              color: 'violet',  icon: '💬' },
  { type: 'query_school_admin',label: 'Query – Admin',   description: 'School Admin → Platform support query flow',          color: 'rose',    icon: '🎫' },
];

const COLOR_MAP: Record<string, string> = {
  emerald: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  blue:    'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  amber:   'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  violet:  'bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800',
  rose:    'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
};

// ── Default stages ─────────────────────────────────────────────────────────────

function defaultStages(type: WorkflowType, leaveRole?: string): Stage[] {
  const s = (stageName: string, approverRole: string, isFinal = false, initiatorRole = ''): Stage => ({
    stageName, initiatorRole, approverRole, approverUserId: '', spocUserId: '',
    systemTrigger: '', isFinal, emailEnabled: false, notifyEnabled: true, notifyMessage: '',
  });

  if (type === 'leave') {
    switch (leaveRole) {
      case 'teacher': case 'employee': return [
        s('Leave Request', 'hod', false, leaveRole || 'teacher'),
        s('HOD Review',    'school_admin', false, 'hod'),
        s('Admin Approval','', true, 'school_admin'),
      ];
      case 'hod': return [
        s('Leave Request',    'principal', false, 'hod'),
        s('Principal Approval','',        true,  'principal'),
      ];
      case 'principal': return [
        s('Leave Request', 'school_admin', true, 'principal'),
      ];
      case 'parent': return [
        s('Leave Request', 'class_teacher', false, 'parent'),
        s('Admin Approval','',              true,  'school_admin'),
      ];
      default: return [s('Leave Request', 'school_admin', true, leaveRole || 'employee')];
    }
  }
  if (type === 'attendance') return [
    s('Attendance Marked', '', false, 'teacher'),
    s('Regularisation Request', 'hod', false, 'teacher'),
    s('Admin Approval', '', true, 'school_admin'),
  ];
  if (type === 'fee') return [
    s('Fee Request', 'accountant', false, 'parent'),
    s('Accounts Review', 'principal', false, 'accountant'),
    s('Approval & Receipt', '', true, 'principal'),
  ];
  if (type === 'query_parents') return [
    s('Query Submitted', 'school_admin', false, 'parent'),
    s('Assigned & Responded', 'school_admin', false, 'school_admin'),
    s('Closure', '', true, 'school_admin'),
  ];
  // query_school_admin
  return [
    s('Query Submitted', 'super_admin', false, 'school_admin'),
    s('Internal Assignment', 'super_admin', false, 'super_admin'),
    s('Resolution & Close', '', true, 'super_admin'),
  ];
}

const BLANK_STAGE: Stage = {
  stageName: '', initiatorRole: '', approverRole: '', approverUserId: '',
  spocUserId: '', systemTrigger: '', isFinal: false, emailEnabled: false,
  notifyEnabled: true, notifyMessage: '',
};

// ── Stage Card ─────────────────────────────────────────────────────────────────

function StageCard({
  stage, index, total, users, isFirst,
  onChange, onRemove, onMove,
}: {
  stage:    Stage;
  index:    number;
  total:    number;
  users:    any[];
  isFirst:  boolean;
  onChange: (f: keyof Stage, v: any) => void;
  onRemove: () => void;
  onMove:   (dir: -1 | 1) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const approverUsers = stage.approverRole
    ? users.filter((u: any) => u.roles?.some((r: any) => r.role_code === stage.approverRole))
    : users;

  return (
    <div className={`card overflow-hidden transition-all ${stage.isFinal ? 'ring-1 ring-emerald-300 dark:ring-emerald-700' : ''}`}>
      {/* ─ Header row ─ */}
      <div className="flex items-center gap-3 p-4">
        {/* Step badge */}
        <span className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${
          stage.isFinal
            ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
            : 'bg-brand-100 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300'
        }`}>
          {index + 1}
        </span>

        {/* Stage name */}
        <input
          className="input flex-1 text-sm font-medium"
          placeholder={`Stage ${index + 1} name…`}
          value={stage.stageName}
          onChange={e => onChange('stageName', e.target.value)}
        />

        {/* Final badge */}
        <button
          onClick={() => onChange('isFinal', !stage.isFinal)}
          title="Mark as final stage"
          className={`px-2 py-1 rounded text-xs font-semibold border transition-all flex-shrink-0 ${
            stage.isFinal
              ? 'bg-emerald-100 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
              : 'border-surface-200 dark:border-gray-600 text-surface-400 hover:border-emerald-300'
          }`}
        >
          {stage.isFinal ? 'Final' : 'Set Final'}
        </button>

        {/* Move + delete */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button onClick={() => onMove(-1)} disabled={index === 0}
            className="p-1.5 text-surface-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-20 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18,15 12,9 6,15"/></svg>
          </button>
          <button onClick={() => onMove(1)} disabled={index === total - 1}
            className="p-1.5 text-surface-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-20 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6,9 12,15 18,9"/></svg>
          </button>
          <button onClick={onRemove}
            className="p-1.5 text-surface-400 hover:text-red-500 transition-colors ml-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      {/* ─ Core fields ─ */}
      <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Initiator */}
        <div>
          <label className="block text-[11px] font-semibold text-surface-400 uppercase tracking-wide mb-1">Initiator</label>
          <select
            className="input text-sm w-full"
            value={stage.initiatorRole}
            onChange={e => onChange('initiatorRole', e.target.value)}
          >
            <option value="">— System / Auto —</option>
            {ALL_ROLES.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}
          </select>
        </div>

        {/* Approver role */}
        <div>
          <label className="block text-[11px] font-semibold text-surface-400 uppercase tracking-wide mb-1">Approver Role</label>
          <select
            className="input text-sm w-full"
            value={stage.approverRole}
            onChange={e => { onChange('approverRole', e.target.value); onChange('approverUserId', ''); }}
          >
            <option value="">— None / System —</option>
            {ALL_ROLES.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}
          </select>
        </div>

        {/* Specific approver user */}
        <div>
          <label className="block text-[11px] font-semibold text-surface-400 uppercase tracking-wide mb-1">
            Specific Approver <span className="normal-case font-normal">(optional)</span>
          </label>
          <select
            className="input text-sm w-full"
            value={stage.approverUserId}
            onChange={e => onChange('approverUserId', e.target.value)}
            disabled={!stage.approverRole}
          >
            <option value="">— Any matching user —</option>
            {approverUsers.map((u: any) => (
              <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
            ))}
          </select>
        </div>

        {/* SPOC — disabled on first stage */}
        <div className={isFirst ? 'opacity-40' : ''}>
          <label className="block text-[11px] font-semibold text-surface-400 uppercase tracking-wide mb-1">
            SPOC <span className="normal-case font-normal">{isFirst ? '(not on first stage)' : '(optional)'}</span>
          </label>
          <select
            className="input text-sm w-full"
            value={stage.spocUserId}
            onChange={e => onChange('spocUserId', e.target.value)}
            disabled={isFirst}
          >
            <option value="">— No SPOC —</option>
            {users.map((u: any) => (
              <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ─ Expand toggle for notifications / trigger ─ */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-4 py-2.5 border-t border-surface-100 dark:border-gray-700 text-xs text-surface-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-surface-50 dark:hover:bg-gray-700/30 transition-colors"
      >
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <polyline points="6,9 12,15 18,9"/>
        </svg>
        {expanded ? 'Hide' : 'Notifications & system trigger'}
        {(stage.notifyEnabled || stage.emailEnabled || stage.systemTrigger) && !expanded && (
          <span className="ml-auto bg-brand-100 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 text-[10px] font-bold px-1.5 py-0.5 rounded">configured</span>
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-3 space-y-3 border-t border-surface-100 dark:border-gray-700 bg-surface-50 dark:bg-gray-800/30">
          {/* Notification toggles */}
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded accent-brand-500"
                checked={stage.notifyEnabled}
                onChange={e => onChange('notifyEnabled', e.target.checked)}
              />
              <span className="text-xs text-surface-500 dark:text-gray-400">In-app notification</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded accent-brand-500"
                checked={stage.emailEnabled}
                onChange={e => onChange('emailEnabled', e.target.checked)}
              />
              <span className="text-xs text-surface-500 dark:text-gray-400">Email notification</span>
            </label>
          </div>

          {(stage.notifyEnabled || stage.emailEnabled) && (
            <input
              className="input text-xs w-full"
              placeholder="Custom notification message (optional)…"
              value={stage.notifyMessage}
              onChange={e => onChange('notifyMessage', e.target.value)}
            />
          )}

          {/* System trigger */}
          <input
            className="input text-xs w-full text-surface-500 dark:text-gray-400"
            placeholder="System action / trigger description (optional)…"
            value={stage.systemTrigger}
            onChange={e => onChange('systemTrigger', e.target.value)}
          />
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function WorkflowPage() {
  const { id: schoolId } = useParams<{ id: string }>();

  const [activeType,      setActiveType]     = useState<WorkflowType>('leave');
  const [activeLeaveRole, setActiveLeaveRole] = useState('teacher');
  const [stageMap,        setStageMap]        = useState<Record<string, Stage[]>>({});
  const [loadedKeys,      setLoadedKeys]      = useState<Set<string>>(new Set());
  const [loadingKey,      setLoadingKey]      = useState('');
  const [saving,          setSaving]          = useState(false);
  const [savedKey,        setSavedKey]        = useState('');
  const [error,           setError]           = useState('');
  const [users,           setUsers]           = useState<any[]>([]);

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
  const authHdr = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetch(`/api/super-admin/schools/${schoolId}/users`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setUsers(d.users || [])).catch(() => {});
  }, [schoolId]);

  const cacheKey = useCallback((type: WorkflowType, leaveRole?: string) =>
    type === 'leave' ? `leave_${leaveRole}` : type, []);

  const loadWorkflow = useCallback(async (type: WorkflowType, leaveRole?: string) => {
    const key = cacheKey(type, leaveRole);
    if (loadedKeys.has(key)) return;
    setLoadingKey(key);
    try {
      const url = type === 'leave'
        ? `/api/super-admin/schools/${schoolId}/workflow?type=leave&role=${leaveRole}`
        : `/api/super-admin/schools/${schoolId}/workflow?type=${type}`;
      const res  = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();

      const saved: Stage[] = (data.workflow?.stages ?? []).map((s: any) => ({
        stageName:      s.stageName      ?? '',
        initiatorRole:  s.initiatorRole  ?? '',
        approverRole:   s.approverRole   ?? '',
        approverUserId: s.approverUserId ?? '',
        spocUserId:     s.spocUserId     ?? '',
        systemTrigger:  s.systemTrigger  ?? '',
        isFinal:        s.isFinal        ?? false,
        emailEnabled:   s.emailEnabled   ?? false,
        notifyEnabled:  s.notifyEnabled  ?? true,
        notifyMessage:  s.notifyMessage  ?? '',
      }));

      setStageMap(prev => ({
        ...prev,
        [key]: saved.length > 0 ? saved : defaultStages(type, leaveRole),
      }));
      setLoadedKeys(prev => new Set([...prev, key]));
    } catch {
      setStageMap(prev => ({ ...prev, [key]: defaultStages(type, leaveRole) }));
    }
    setLoadingKey('');
  }, [schoolId, token, loadedKeys, cacheKey]);

  useEffect(() => {
    if (activeType !== 'leave') loadWorkflow(activeType);
  }, [activeType]);

  useEffect(() => {
    if (activeType === 'leave') loadWorkflow('leave', activeLeaveRole);
  }, [activeType, activeLeaveRole]);

  const currentKey    = cacheKey(activeType, activeLeaveRole);
  const currentStages = stageMap[currentKey] ?? [];
  const isLoading     = loadingKey === currentKey;
  const activeInfo    = REGISTRY.find(r => r.type === activeType)!;

  function setCurrentStages(fn: (prev: Stage[]) => Stage[]) {
    setStageMap(prev => ({ ...prev, [currentKey]: fn(prev[currentKey] ?? []) }));
  }

  const updateStage = (i: number, f: keyof Stage, v: any) =>
    setCurrentStages(stages => { const arr = [...stages]; arr[i] = { ...arr[i], [f]: v }; return arr; });

  const addStage    = () => setCurrentStages(s => [...s, { ...BLANK_STAGE }]);
  const removeStage = (i: number) => setCurrentStages(s => s.filter((_, idx) => idx !== i));
  const moveStage   = (i: number, dir: -1 | 1) => setCurrentStages(s => {
    const arr = [...s]; const ni = i + dir;
    if (ni < 0 || ni >= arr.length) return arr;
    [arr[i], arr[ni]] = [arr[ni], arr[i]]; return arr;
  });

  const resetDefaults = () => setCurrentStages(() => defaultStages(activeType, activeLeaveRole));

  async function save() {
    setSaving(true); setError(''); setSavedKey('');
    try {
      const body = activeType === 'leave'
        ? { type: 'leave', role: activeLeaveRole, stages: currentStages }
        : { type: activeType, stages: currentStages };

      const res  = await fetch(`/api/super-admin/schools/${schoolId}/workflow`, {
        method: 'POST', headers: authHdr, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setSavedKey(currentKey);
      setTimeout(() => setSavedKey(''), 2500);
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  }

  const colorClass = COLOR_MAP[activeInfo.color];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Workflow Configuration</h1>
        <p className="text-sm text-surface-400 mt-0.5">
          Set up approval stages for each workflow. For Admission workflow, go to the Admissions module.
        </p>
      </div>

      {/* Workflow type tabs */}
      <div className="flex gap-1 flex-wrap border-b border-surface-100 dark:border-gray-800">
        {REGISTRY.map(wf => (
          <button
            key={wf.type}
            onClick={() => setActiveType(wf.type)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
              activeType === wf.type
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-surface-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {wf.icon} {wf.label}
          </button>
        ))}
      </div>

      {/* Info banner */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${colorClass}`}>
        <span className="text-xl flex-shrink-0">{activeInfo.icon}</span>
        <p>{activeInfo.description}</p>
        {activeType === 'leave' && (
          <span className="ml-auto text-xs opacity-70 whitespace-nowrap">Select a role →</span>
        )}
      </div>

      <div className="flex gap-6">
        {/* Leave role sidebar */}
        {activeType === 'leave' && (
          <div className="w-44 flex-shrink-0">
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider px-3 mb-2">Applicant Role</p>
            <div className="space-y-0.5">
              {LEAVE_ROLES.map(r => (
                <button
                  key={r.code}
                  onClick={() => setActiveLeaveRole(r.code)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeLeaveRole === r.code
                      ? 'bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300'
                      : 'text-surface-500 dark:text-gray-400 hover:bg-surface-50 dark:hover:bg-gray-700/40'
                  }`}
                >
                  {r.label}
                  {stageMap[`leave_${r.code}`] && (
                    <span className="ml-1 text-[10px] opacity-60">({stageMap[`leave_${r.code}`].length})</span>
                  )}
                </button>
              ))}
            </div>

            {/* Quick tip */}
            <div className="mt-4 mx-3 p-3 bg-surface-50 dark:bg-gray-800/50 rounded-lg text-[11px] text-surface-400 leading-relaxed">
              Each role has its own approval chain. Configure them independently.
            </div>
          </div>
        )}

        {/* Stage builder */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-base">
                {activeType === 'leave'
                  ? `${LEAVE_ROLES.find(r => r.code === activeLeaveRole)?.label} — Approval Stages`
                  : `${activeInfo.label} — Approval Stages`}
              </h2>
              <p className="text-xs text-surface-400 mt-0.5">
                {currentStages.length} stage{currentStages.length !== 1 ? 's' : ''} · SPOC disabled on first stage
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={resetDefaults}
                className="px-3 py-1.5 text-xs font-medium border border-surface-200 dark:border-gray-600 rounded-lg text-surface-500 dark:text-gray-400 hover:border-brand-300 transition-colors"
              >
                Reset defaults
              </button>
              <button onClick={addStage} className="btn btn-secondary text-sm">
                + Add Stage
              </button>
            </div>
          </div>

          {/* Tip for specific workflows */}
          {activeType === 'leave' && activeLeaveRole === 'parent' && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-700 dark:text-blue-300">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Set Approver Role to <strong className="mx-1">Class Teacher</strong> to auto-route to the student's assigned teacher.
            </div>
          )}
          {activeType === 'query_school_admin' && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-700 dark:text-rose-300">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              These queries appear on the <strong className="mx-1">Super Admin portal</strong> and are handled by the platform support team — not school staff.
            </div>
          )}

          {/* Stages */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-surface-100 dark:bg-gray-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : currentStages.length === 0 ? (
            <div className="card p-10 text-center space-y-3">
              <p className="text-3xl">🔧</p>
              <p className="text-sm text-surface-400">No stages yet. Add your first stage or reset to defaults.</p>
              <button onClick={addStage} className="btn btn-primary text-sm mx-auto">Add First Stage</button>
            </div>
          ) : (
            <div className="space-y-3">
              {currentStages.map((stage, i) => (
                <StageCard
                  key={i}
                  stage={stage}
                  index={i}
                  total={currentStages.length}
                  users={users}
                  isFirst={i === 0}
                  onChange={(f, v) => updateStage(i, f, v)}
                  onRemove={() => removeStage(i)}
                  onMove={dir => moveStage(i, dir)}
                />
              ))}
            </div>
          )}

          {/* Flow preview */}
          {currentStages.length > 0 && !isLoading && (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {currentStages.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-lg font-medium ${
                    s.isFinal
                      ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                      : 'bg-surface-100 dark:bg-gray-800 text-surface-500 dark:text-gray-400'
                  }`}>
                    {s.stageName || `Stage ${i + 1}`}
                    {s.spocUserId && <span className="ml-1 opacity-60">· SPOC</span>}
                  </span>
                  {i < currentStages.length - 1 && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-surface-300 dark:text-gray-600 flex-shrink-0"><polyline points="9,18 15,12 9,6"/></svg>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Save bar */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">{error}</p>
          )}
          <div className="flex items-center gap-3 pt-2 border-t border-surface-100 dark:border-gray-700">
            <button
              onClick={save}
              disabled={saving || isLoading}
              className="btn btn-primary disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Workflow'}
            </button>
            {savedKey === currentKey && (
              <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>
                Saved
              </span>
            )}
            <span className="text-xs text-surface-400 ml-auto">Changes apply to new requests immediately</span>
          </div>
        </div>
      </div>
    </div>
  );
}
