'use client';

import { useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'schedule' | 'student-leave' | 'teacher-leave' | 'workflows';

interface LeaveType {
  id: string;
  label: string;
  hasBalance: boolean;
  defaultBalance?: number;
}

interface WorkflowStep {
  label: string;
  roleId: string;
  userId: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DEFAULT_STUDENT_LEAVE_TYPES: LeaveType[] = [
  { id: 'sick',      label: 'Sick Leave',      hasBalance: false },
  { id: 'emergency', label: 'Emergency Leave',  hasBalance: false },
  { id: 'other',     label: 'Other',            hasBalance: false },
];

const DEFAULT_TEACHER_LEAVE_TYPES: LeaveType[] = [
  { id: 'sick',     label: 'Sick Leave',    hasBalance: true, defaultBalance: 10 },
  { id: 'casual',   label: 'Casual Leave',  hasBalance: true, defaultBalance: 12 },
  { id: 'earned',   label: 'Earned Leave',  hasBalance: true, defaultBalance: 15 },
  { id: 'maternity',label: 'Maternity Leave', hasBalance: true, defaultBalance: 90 },
  { id: 'other',    label: 'Other',         hasBalance: false },
];

const WORKFLOW_DEFS = {
  student: {
    label: 'Student Leave Workflow',
    desc: 'Approval chain when a parent applies leave for their child',
    defaultSteps: [
      { label: 'Parent Submits Request', roleId: '', userId: '' },
      { label: 'Class Teacher Review',   roleId: '', userId: '' },
      { label: 'Principal Approval',     roleId: '', userId: '' },
    ],
  },
  teacher: {
    label: 'Teacher Leave Workflow',
    desc: 'Approval chain for teacher leave applications',
    defaultSteps: [
      { label: 'Teacher Submits Request', roleId: '', userId: '' },
      { label: 'HOD / Principal Review',  roleId: '', userId: '' },
      { label: 'Admin Approval',          roleId: '', userId: '' },
    ],
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function LeaveConfigPage({ params }: { params: { id: string } }) {
  const schoolId = params.id;
  const [tab, setTab] = useState<Tab>('schedule');

  // Schedule
  const [workingDays, setWorkingDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const [holidays, setHolidays] = useState<{ date: string; name: string }[]>([
    { date: '2025-01-26', name: 'Republic Day' },
    { date: '2025-08-15', name: 'Independence Day' },
    { date: '2025-10-02', name: 'Gandhi Jayanti' },
  ]);
  const [newHoliday, setNewHoliday] = useState({ date: '', name: '' });

  // Leave types
  const [studentLeaveTypes, setStudentLeaveTypes] = useState<LeaveType[]>(DEFAULT_STUDENT_LEAVE_TYPES);
  const [teacherLeaveTypes, setTeacherLeaveTypes] = useState<LeaveType[]>(DEFAULT_TEACHER_LEAVE_TYPES);
  const [newStudentLeave, setNewStudentLeave] = useState('');
  const [newTeacherLeave, setNewTeacherLeave] = useState('');

  // Workflows
  const [workflows, setWorkflows] = useState<Record<string, WorkflowStep[]>>({
    student: WORKFLOW_DEFS.student.defaultSteps.map(s => ({ ...s })),
    teacher: WORKFLOW_DEFS.teacher.defaultSteps.map(s => ({ ...s })),
  });
  const [activeWorkflow, setActiveWorkflow] = useState<'student' | 'teacher'>('student');
  const [newStepLabel, setNewStepLabel] = useState('');

  // Teacher balance upload
  const [balanceUploading, setBalanceUploading] = useState(false);
  const [balanceUploaded, setBalanceUploaded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Roles & users from API
  const [roles, setRoles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token') || '';
    fetch(`/api/super-admin/schools/${schoolId}/users`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setRoles(d.roles || []); setUsers(d.users || []); })
      .catch(() => {});
  }, [schoolId]);

  // Shared save
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  async function save() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  // ── Schedule helpers ────────────────────────────────────────────────────────
  function toggleDay(d: string) {
    setWorkingDays(n => n.includes(d) ? n.filter(x => x !== d) : [...n, d]);
  }
  function addHoliday() {
    if (!newHoliday.date || !newHoliday.name) return;
    setHolidays(h => [...h, newHoliday].sort((a, b) => a.date.localeCompare(b.date)));
    setNewHoliday({ date: '', name: '' });
  }

  // ── Leave type helpers ──────────────────────────────────────────────────────
  function addStudentLeave() {
    if (!newStudentLeave.trim()) return;
    setStudentLeaveTypes(t => [...t, { id: Date.now().toString(), label: newStudentLeave.trim(), hasBalance: false }]);
    setNewStudentLeave('');
  }
  function addTeacherLeave() {
    if (!newTeacherLeave.trim()) return;
    setTeacherLeaveTypes(t => [...t, { id: Date.now().toString(), label: newTeacherLeave.trim(), hasBalance: true, defaultBalance: 0 }]);
    setNewTeacherLeave('');
  }
  function updateTeacherBalance(id: string, balance: number) {
    setTeacherLeaveTypes(t => t.map(lt => lt.id === id ? { ...lt, defaultBalance: balance } : lt));
  }
  function toggleTeacherBalance(id: string) {
    setTeacherLeaveTypes(t => t.map(lt => lt.id === id ? { ...lt, hasBalance: !lt.hasBalance } : lt));
  }

  // ── Workflow helpers ────────────────────────────────────────────────────────
  const steps = workflows[activeWorkflow] || [];

  function updateStep(idx: number, field: keyof WorkflowStep, value: string) {
    setWorkflows(w => {
      const arr = [...w[activeWorkflow]];
      arr[idx] = { ...arr[idx], [field]: value };
      if (field === 'roleId') arr[idx].userId = '';
      return { ...w, [activeWorkflow]: arr };
    });
  }
  function addStep() {
    if (!newStepLabel.trim()) return;
    setWorkflows(w => ({ ...w, [activeWorkflow]: [...w[activeWorkflow], { label: newStepLabel.trim(), roleId: '', userId: '' }] }));
    setNewStepLabel('');
  }
  function removeStep(idx: number) {
    setWorkflows(w => ({ ...w, [activeWorkflow]: w[activeWorkflow].filter((_, i) => i !== idx) }));
  }
  function moveStep(idx: number, dir: -1 | 1) {
    const arr = [...steps];
    const ni = idx + dir;
    if (ni < 0 || ni >= arr.length) return;
    [arr[idx], arr[ni]] = [arr[ni], arr[idx]];
    setWorkflows(w => ({ ...w, [activeWorkflow]: arr }));
  }
  function usersForStep(step: WorkflowStep) {
    if (!step.roleId) return users;
    return users.filter((u: any) => u.userRoles?.some((ur: any) => ur.roleId === step.roleId || ur.role?.id === step.roleId));
  }

  // ── Balance file upload ─────────────────────────────────────────────────────
  async function handleBalanceFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return;
    setBalanceUploading(true);
    await new Promise(r => setTimeout(r, 1000)); // placeholder
    setBalanceUploading(false);
    setBalanceUploaded(true);
    setTimeout(() => setBalanceUploaded(false), 3000);
    e.target.value = '';
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  const TABS: { id: Tab; label: string }[] = [
    { id: 'schedule',      label: 'Schedule & Holidays' },
    { id: 'student-leave', label: 'Student Leave' },
    { id: 'teacher-leave', label: 'Teacher Leave' },
    { id: 'workflows',     label: 'Approval Workflows' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Leave Configuration</h1>
        <p className="text-sm text-surface-400 mt-0.5">Manage leave types, approval workflows and holiday schedule.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-surface-100 dark:bg-gray-800 rounded-xl w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-surface-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Schedule & Holidays ──────────────────────────────────────────────── */}
      {tab === 'schedule' && (
        <div className="space-y-6 max-w-2xl">
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Working Days</h2>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map(d => (
                <button
                  key={d}
                  onClick={() => toggleDay(d)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${workingDays.includes(d) ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300' : 'border-surface-200 dark:border-gray-700 text-surface-400'}`}
                >
                  {d.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Holiday Calendar</h2>
            <div className="space-y-2">
              {holidays.map(h => (
                <div key={h.date} className="flex items-center justify-between p-2.5 rounded-lg bg-surface-50 dark:bg-gray-700/40">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-surface-400">{h.date}</span>
                    <span className="text-sm text-gray-800 dark:text-gray-200">{h.name}</span>
                  </div>
                  <button onClick={() => setHolidays(hs => hs.filter(x => x.date !== h.date))} className="text-surface-300 hover:text-red-500 transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input className="input w-36" type="date" value={newHoliday.date} onChange={e => setNewHoliday(h => ({ ...h, date: e.target.value }))} />
              <input className="input flex-1" placeholder="Holiday name" value={newHoliday.name} onChange={e => setNewHoliday(h => ({ ...h, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addHoliday()} />
              <button onClick={addHoliday} className="btn btn-secondary">Add</button>
            </div>
            <p className="text-xs text-surface-400">
              Or{' '}
              <label className="text-brand-600 hover:text-brand-700 cursor-pointer font-medium">
                upload Excel/CSV
                <input type="file" accept=".xlsx,.csv" className="hidden" />
              </label>
              {' '}with (Date, Name) columns.
            </p>
          </div>

          <SaveBar saving={saving} saved={saved} onSave={save} />
        </div>
      )}

      {/* ── Student Leave ────────────────────────────────────────────────────── */}
      {tab === 'student-leave' && (
        <div className="space-y-6 max-w-2xl">
          <div className="card p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Student Leave Types</h2>
              <p className="text-xs text-surface-400 mt-0.5">Parents apply these on behalf of their child. No balance tracking for students.</p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-400 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Students have no leave balance — all leave is approval-based only.
            </div>

            <div className="space-y-2">
              {studentLeaveTypes.map(lt => (
                <div key={lt.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-gray-700/40">
                  <div className="w-2 h-2 bg-brand-400 rounded-full shrink-0" />
                  <span className="flex-1 text-sm text-gray-800 dark:text-gray-200">{lt.label}</span>
                  <span className="text-xs text-surface-400 bg-surface-100 dark:bg-gray-700 px-2 py-0.5 rounded">No Balance</span>
                  {!['sick', 'emergency', 'other'].includes(lt.id) && (
                    <button onClick={() => setStudentLeaveTypes(t => t.filter(x => x.id !== lt.id))} className="text-surface-300 hover:text-red-500 transition-colors">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Add leave type (e.g. Medical Leave)..."
                value={newStudentLeave}
                onChange={e => setNewStudentLeave(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addStudentLeave()}
              />
              <button onClick={addStudentLeave} className="btn btn-secondary">Add</button>
            </div>
          </div>

          <SaveBar saving={saving} saved={saved} onSave={save} />
        </div>
      )}

      {/* ── Teacher Leave ────────────────────────────────────────────────────── */}
      {tab === 'teacher-leave' && (
        <div className="space-y-6 max-w-2xl">
          <div className="card p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Teacher Leave Types &amp; Default Balance</h2>
              <p className="text-xs text-surface-400 mt-0.5">Set default annual leave balance per type. Override per teacher using the upload below.</p>
            </div>

            <div className="space-y-2">
              {/* Header row */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-3 text-xs font-semibold text-surface-400 uppercase tracking-wide">
                <span>Leave Type</span>
                <span className="w-28 text-center">Balance (days/yr)</span>
                <span className="w-20 text-center">Has Balance</span>
                <span className="w-6" />
              </div>

              {teacherLeaveTypes.map(lt => (
                <div key={lt.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center p-3 rounded-xl bg-surface-50 dark:bg-gray-700/40">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-violet-400 rounded-full shrink-0" />
                    <span className="text-sm text-gray-800 dark:text-gray-200">{lt.label}</span>
                  </div>
                  <div className="w-28">
                    {lt.hasBalance ? (
                      <input
                        type="number"
                        className="input text-center w-full"
                        value={lt.defaultBalance ?? ''}
                        min={0}
                        max={365}
                        onChange={e => updateTeacherBalance(lt.id, Number(e.target.value))}
                      />
                    ) : (
                      <span className="block text-center text-xs text-surface-400">—</span>
                    )}
                  </div>
                  <div className="w-20 flex justify-center">
                    <div
                      onClick={() => toggleTeacherBalance(lt.id)}
                      className={`w-10 h-5 rounded-full transition-colors cursor-pointer relative ${lt.hasBalance ? 'bg-brand-500' : 'bg-surface-300 dark:bg-gray-600'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${lt.hasBalance ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                  </div>
                  {!['sick', 'casual', 'earned', 'maternity', 'other'].includes(lt.id) && (
                    <button onClick={() => setTeacherLeaveTypes(t => t.filter(x => x.id !== lt.id))} className="w-6 text-surface-300 hover:text-red-500 transition-colors">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  )}
                  {['sick', 'casual', 'earned', 'maternity', 'other'].includes(lt.id) && <div className="w-6" />}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Add leave type (e.g. Study Leave)..."
                value={newTeacherLeave}
                onChange={e => setNewTeacherLeave(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTeacherLeave()}
              />
              <button onClick={addTeacherLeave} className="btn btn-secondary">Add</button>
            </div>
          </div>

          {/* Leave Balance Upload */}
          <div className="card p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Upload Teacher Leave Balances</h2>
              <p className="text-xs text-surface-400 mt-0.5">Upload an Excel file to set individual teacher balances. Overrides the default values above.</p>
            </div>

            <div className="bg-surface-50 dark:bg-gray-700/40 rounded-xl border-2 border-dashed border-surface-200 dark:border-gray-600 p-6 text-center">
              <div className="text-3xl mb-2">📊</div>
              <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mb-1">Teacher Leave Balance Excel</p>
              <p className="text-xs text-surface-400 mb-4">Columns: Teacher Email, Sick, Casual, Earned, Maternity, (custom types...)</p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleBalanceFile} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={balanceUploading}
                className="btn btn-secondary flex items-center gap-2 mx-auto"
              >
                {balanceUploading ? (
                  <>
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    Choose File
                  </>
                )}
              </button>
              {balanceUploaded && (
                <p className="text-sm text-emerald-600 font-medium mt-3 flex items-center justify-center gap-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20,6 9,17 4,12"/></svg>
                  Balances uploaded successfully!
                </p>
              )}
            </div>

            <div className="text-xs text-surface-400 space-y-1">
              <p className="font-medium text-gray-600 dark:text-gray-400">Template format:</p>
              <div className="font-mono bg-surface-50 dark:bg-gray-800 rounded-lg p-3 text-xs overflow-x-auto">
                teacher_email | sick | casual | earned | maternity<br />
                john@school.com | 10 | 12 | 15 | 0<br />
                jane@school.com | 10 | 12 | 15 | 90
              </div>
              <button className="text-brand-600 hover:text-brand-700 font-medium">
                Download template →
              </button>
            </div>
          </div>

          <SaveBar saving={saving} saved={saved} onSave={save} />
        </div>
      )}

      {/* ── Approval Workflows ───────────────────────────────────────────────── */}
      {tab === 'workflows' && (
        <div className="space-y-6">
          {/* Workflow selector */}
          <div className="flex gap-3">
            {(['student', 'teacher'] as const).map(wf => (
              <button
                key={wf}
                onClick={() => { setActiveWorkflow(wf); setNewStepLabel(''); }}
                className={`px-5 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${activeWorkflow === wf ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300' : 'border-surface-200 dark:border-gray-700 text-surface-400 hover:border-brand-300'}`}
              >
                <div className="font-semibold">{WORKFLOW_DEFS[wf].label}</div>
                <div className="text-xs mt-0.5 opacity-75">{steps.length} step{steps.length !== 1 ? 's' : ''}</div>
              </button>
            ))}
          </div>

          <div className="card p-5 space-y-4 max-w-4xl">
            <div>
              <p className="text-xs text-surface-400">{WORKFLOW_DEFS[activeWorkflow].desc}</p>
            </div>

            {/* Column headers */}
            <div className="hidden sm:grid sm:grid-cols-[auto_1fr_1fr_1fr_auto] gap-3 px-3 items-center">
              <div className="w-6" />
              <div className="text-xs font-semibold text-surface-400 uppercase tracking-wide">Stage Name</div>
              <div className="text-xs font-semibold text-surface-400 uppercase tracking-wide">Assigned Role</div>
              <div className="text-xs font-semibold text-surface-400 uppercase tracking-wide">Assigned User</div>
              <div className="w-16" />
            </div>

            {/* Steps */}
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 p-3 bg-surface-50 dark:bg-gray-700/40 rounded-xl items-center">
                  <span className="hidden sm:flex w-6 h-6 bg-brand-100 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400 text-xs font-bold rounded-full items-center justify-center shrink-0">
                    {i + 1}
                  </span>

                  {/* Mobile label */}
                  <div className="sm:hidden text-xs font-semibold text-surface-400 mb-1">Step {i + 1}</div>

                  <input
                    className="text-sm bg-white dark:bg-gray-800 border border-surface-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-brand-400 w-full"
                    value={step.label}
                    onChange={e => updateStep(i, 'label', e.target.value)}
                  />

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

                  <select
                    className="text-sm bg-white dark:bg-gray-800 border border-surface-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-brand-400 w-full"
                    value={step.userId}
                    onChange={e => updateStep(i, 'userId', e.target.value)}
                  >
                    <option value="">— Any User —</option>
                    {usersForStep(step).map((u: any) => (
                      <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                    ))}
                  </select>

                  <div className="flex items-center gap-0.5 justify-end">
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
                placeholder="New stage name..."
                value={newStepLabel}
                onChange={e => setNewStepLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addStep()}
              />
              <button onClick={addStep} className="btn btn-secondary">+ Add Stage</button>
            </div>

            <div className="pt-2 border-t border-surface-100 dark:border-gray-700">
              <SaveBar saving={saving} saved={saved} onSave={save} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared SaveBar ────────────────────────────────────────────────────────────
function SaveBar({ saving, saved, onSave }: { saving: boolean; saved: boolean; onSave: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={onSave} disabled={saving} className="btn btn-primary">
        {saving ? 'Saving...' : 'Save Configuration'}
      </button>
      {saved && (
        <span className="text-sm text-emerald-600 font-medium flex items-center gap-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20,6 9,17 4,12"/></svg>
          Saved!
        </span>
      )}
    </div>
  );
}
