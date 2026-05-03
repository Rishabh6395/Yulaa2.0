'use client';

import { useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'leave-types' | 'balance-policy' | 'holidays' | 'workflows';

interface LeaveType { id: string; name: string; code: string; applicableTo: string[]; isActive: boolean; }
interface Policy { id: string; leaveTypeId: string; roleCode: string; daysPerYear: number; daysPerMonth: number; initialBalance: number; carryForward: boolean; maxCarryDays: number; }
interface Holiday { id: string; date: string; name: string; type: 'mandatory' | 'optional'; academicYear: string; }
interface WorkflowStep { label: string; roleId: string; userId: string; }

const STAFF_ROLES = [
  { code: 'teacher',      label: 'Teacher' },
  { code: 'hod',          label: 'HOD' },
  { code: 'principal',    label: 'Principal' },
  { code: 'school_admin', label: 'School Admin' },
  { code: 'employee',     label: 'Employee (All Staff)' },
  { code: 'parent',       label: 'Parent' },
];

const WORKFLOW_META = {
  student: { label: 'Student Leave Workflow', desc: 'Approval chain when a parent applies leave for their child', apiType: 'parent' },
  teacher: { label: 'Teacher Leave Workflow',  desc: 'Approval chain for teacher / HOD / principal leave',      apiType: 'teacher' },
};

const DEFAULT_WORKFLOWS: Record<string, WorkflowStep[]> = {
  student: [
    { label: 'Parent Submits Request',  roleId: '', userId: '' },
    { label: 'Class Teacher Review',    roleId: '', userId: '' },
    { label: 'Principal Approval',      roleId: '', userId: '' },
  ],
  teacher: [
    { label: 'Teacher Submits Request', roleId: '', userId: '' },
    { label: 'HOD / Principal Review',  roleId: '', userId: '' },
    { label: 'Admin Approval',          roleId: '', userId: '' },
  ],
};

const ACADEMIC_YEARS = ['2024-2025', '2025-2026', '2026-2027'];

const WEEKDAYS = [
  { num: 0, short: 'Sun', full: 'Sunday' },
  { num: 1, short: 'Mon', full: 'Monday' },
  { num: 2, short: 'Tue', full: 'Tuesday' },
  { num: 3, short: 'Wed', full: 'Wednesday' },
  { num: 4, short: 'Thu', full: 'Thursday' },
  { num: 5, short: 'Fri', full: 'Friday' },
  { num: 6, short: 'Sat', full: 'Saturday' },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function LeaveConfigPage({ params }: { params: { id: string } }) {
  const schoolId = params.id;
  const [tab, setTab] = useState<Tab>('leave-types');

  // Leave types
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [newLT, setNewLT] = useState({ name: '', code: '', applicableTo: [] as string[] });
  const [ltLoading, setLtLoading] = useState(true);

  // Balance policy matrix
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [carryForwardDate, setCarryForwardDate] = useState('');      // MM-DD
  const [cfDateSaving, setCfDateSaving] = useState(false);
  const [cfRunning, setCfRunning] = useState(false);
  const [cfResult, setCfResult] = useState('');

  // Holidays
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [newHoliday, setNewHoliday] = useState({ date: '', name: '', type: 'mandatory' as 'mandatory' | 'optional' });
  const fileRef = useRef<HTMLInputElement>(null);
  const [holidayUploading, setHolidayUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string>('');

  // Weekoff days
  const [weekoffDays, setWeekoffDays] = useState<number[]>([0, 6]);
  const [weekoffSaving, setWeekoffSaving] = useState(false);

  // Workflows
  const [workflows, setWorkflows] = useState(DEFAULT_WORKFLOWS);
  const [activeWF, setActiveWF] = useState<'student' | 'teacher'>('student');
  const [newStepLabel, setNewStepLabel] = useState('');
  const [roles, setRoles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Shared
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const token = () => (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '');
  const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

  // ── Fetch leave types + policies + holidays ──────────────────────────────
  useEffect(() => {
    setLtLoading(true);
    fetch(`/api/super-admin/schools/${schoolId}/leave-config`, { headers: headers() })
      .then(r => r.json())
      .then(d => {
        setLeaveTypes(d.leaveTypes || []);
        setPolicies(d.policies || []);
        setHolidays(d.holidays || []);
      })
      .catch((err: unknown) => { if (process.env.NODE_ENV === 'development') console.error('[leave-config]', err); })
      .finally(() => setLtLoading(false));
  }, [schoolId]);

  // Fetch carry-forward date from school-level policy resource
  useEffect(() => {
    fetch(`/api/super-admin/schools/${schoolId}/leave-config?resource=policies`, { headers: headers() })
      .then(r => r.json())
      .then(d => { if (d.leaveCarryForwardDate) setCarryForwardDate(d.leaveCarryForwardDate); })
      .catch((err: unknown) => { if (process.env.NODE_ENV === 'development') console.error('[leave-policies]', err); });
  }, [schoolId]);

  // Fetch holidays when year changes
  useEffect(() => {
    fetch(`/api/super-admin/schools/${schoolId}/leave-config?resource=holidays&year=${academicYear}`, { headers: headers() })
      .then(r => r.json())
      .then(d => setHolidays(d.holidays || []))
      .catch((err: unknown) => { if (process.env.NODE_ENV === 'development') console.error('[holidays]', err); });
  }, [academicYear, schoolId]);

  // Fetch weekoff days
  useEffect(() => {
    fetch(`/api/super-admin/schools/${schoolId}/leave-config?resource=weekoffs`, { headers: headers() })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.weekoffDays)) setWeekoffDays(d.weekoffDays); })
      .catch((err: unknown) => { if (process.env.NODE_ENV === 'development') console.error('[weekoffs]', err); });
  }, [schoolId]);

  // Fetch roles + users for workflow
  useEffect(() => {
    fetch(`/api/super-admin/schools/${schoolId}/users`, { headers: headers() })
      .then(r => r.json())
      .then(d => { setRoles(d.roles || []); setUsers(d.users || []); })
      .catch((err: unknown) => { if (process.env.NODE_ENV === 'development') console.error('[school-users]', err); });
  }, [schoolId]);

  // ── Leave type helpers ───────────────────────────────────────────────────
  function toggleApplicable(role: string) {
    setNewLT(n => ({
      ...n,
      applicableTo: n.applicableTo.includes(role)
        ? n.applicableTo.filter(r => r !== role)
        : [...n.applicableTo, role],
    }));
  }

  async function createLeaveType() {
    if (!newLT.name.trim() || !newLT.code.trim()) return;
    try {
      const res = await fetch(`/api/super-admin/schools/${schoolId}/leave-config`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ action: 'create_leave_type', ...newLT }),
      });
      const data = await res.json();
      if (data.leaveType) {
        setLeaveTypes(t => [...t, data.leaveType]);
        setNewLT({ name: '', code: '', applicableTo: [] });
      } else {
        setError(data.error || 'Failed to create leave type');
      }
    } catch { setError('Failed to create leave type'); }
  }

  async function deleteLeaveType(id: string) {
    try {
      await fetch(`/api/super-admin/schools/${schoolId}/leave-config?leaveTypeId=${id}`, {
        method: 'DELETE', headers: headers(),
      });
      setLeaveTypes(t => t.filter(x => x.id !== id));
      setPolicies(p => p.filter(x => x.leaveTypeId !== id));
    } catch { setError('Failed to delete leave type — please try again'); }
  }

  // ── Policy helpers ───────────────────────────────────────────────────────
  function getPolicy(ltId: string, role: string) {
    return policies.find(p => p.leaveTypeId === ltId && p.roleCode === role);
  }

  async function updatePolicy(ltId: string, roleCode: string, field: string, value: any) {
    const existing = getPolicy(ltId, roleCode) || { leaveTypeId: ltId, roleCode, daysPerYear: 0, daysPerMonth: 0, initialBalance: 0, carryForward: false, maxCarryDays: 0 };
    const updated = { ...existing, [field]: value };
    // Keep daysPerYear in sync with daysPerMonth for backwards compat
    if (field === 'daysPerMonth') updated.daysPerYear = updated.daysPerMonth * 12;
    // Optimistic UI
    setPolicies(ps => {
      const idx = ps.findIndex(p => p.leaveTypeId === ltId && p.roleCode === roleCode);
      if (idx >= 0) { const arr = [...ps]; arr[idx] = { ...arr[idx], ...updated } as Policy; return arr; }
      return [...ps, { id: 'tmp', ...updated } as Policy];
    });
    try {
      const res = await fetch(`/api/super-admin/schools/${schoolId}/leave-config`, {
        method: 'PUT', headers: headers(),
        body: JSON.stringify({ action: 'upsert_policy', leaveTypeId: ltId, roleCode, ...updated }),
      });
      const data = await res.json();
      if (data.policy) {
        setPolicies(ps => {
          const idx = ps.findIndex(p => p.leaveTypeId === ltId && p.roleCode === roleCode);
          if (idx >= 0) { const arr = [...ps]; arr[idx] = data.policy; return arr; }
          return [...ps, data.policy];
        });
      }
    } catch { setError('Failed to save leave policy — please try again'); }
  }

  async function saveCarryForwardDate() {
    if (!carryForwardDate) return;
    setCfDateSaving(true);
    try {
      const res = await fetch(`/api/super-admin/schools/${schoolId}/leave-config`, {
        method: 'PUT', headers: headers(),
        body: JSON.stringify({ action: 'set_carry_forward_date', date: carryForwardDate }),
      });
      if (!res.ok) throw new Error();
    } catch { setError('Failed to save carry-forward date'); }
    finally { setCfDateSaving(false); }
  }

  async function executeCarryForward() {
    if (!confirm('Run carry-forward now? Unused leave balances will roll over based on each policy\'s max carry limit.')) return;
    setCfRunning(true); setCfResult('');
    try {
      const res = await fetch(`/api/super-admin/schools/${schoolId}/leave-config`, {
        method: 'PUT', headers: headers(),
        body: JSON.stringify({ action: 'execute_carry_forward' }),
      });
      const data = await res.json();
      setCfResult(data.message || `Carry-forward complete: ${data.updated ?? 0} balance(s) updated`);
    } catch { setError('Failed to execute carry-forward'); }
    finally { setCfRunning(false); }
  }

  // ── Holiday helpers ──────────────────────────────────────────────────────
  async function addHoliday() {
    if (!newHoliday.date || !newHoliday.name.trim()) return;
    try {
      const res = await fetch(`/api/super-admin/schools/${schoolId}/leave-config`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ action: 'add_holiday', ...newHoliday, academicYear }),
      });
      const data = await res.json();
      if (data.holiday) {
        setHolidays(h => [...h, data.holiday].sort((a, b) => a.date.localeCompare(b.date)));
        setNewHoliday({ date: '', name: '', type: 'mandatory' });
      } else {
        setError(data.error || 'Failed to add holiday');
      }
    } catch { setError('Failed to add holiday'); }
  }

  async function deleteHoliday(id: string) {
    try {
      await fetch(`/api/super-admin/schools/${schoolId}/leave-config?holidayId=${id}`, {
        method: 'DELETE', headers: headers(),
      });
      setHolidays(h => h.filter(x => x.id !== id));
    } catch { setError('Failed to delete holiday'); }
  }

  async function handleHolidayFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setHolidayUploading(true);
    setUploadResult('');
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const fileExt = ext === 'csv' ? 'csv' : 'xlsx';
      const buf = await file.arrayBuffer();
      // Convert ArrayBuffer → base64
      let binary = '';
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const fileData = btoa(binary);

      const res = await fetch(`/api/super-admin/schools/${schoolId}/leave-config`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ action: 'bulk_holidays', fileData, fileExt, academicYear }),
      });
      const data = await res.json();
      if (typeof data.added === 'number') {
        setUploadResult(`${data.added} holiday(s) imported successfully`);
        // Refresh holiday list
        const refreshed = await fetch(
          `/api/super-admin/schools/${schoolId}/leave-config?resource=holidays&year=${academicYear}`,
          { headers: headers() },
        ).then(r => r.json());
        setHolidays(refreshed.holidays || []);
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch { setError('Failed to upload file'); }
    finally { setHolidayUploading(false); e.target.value = ''; }
  }

  // ── Weekoff helpers ──────────────────────────────────────────────────────
  function toggleWeekoff(day: number) {
    setWeekoffDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day],
    );
  }

  async function saveWeekoffs() {
    setWeekoffSaving(true);
    try {
      await fetch(`/api/super-admin/schools/${schoolId}/leave-config`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ action: 'upsert_weekoffs', days: weekoffDays }),
      });
    } catch { setError('Failed to save weekly off days'); }
    finally { setWeekoffSaving(false); }
  }

  // ── Workflow helpers ─────────────────────────────────────────────────────
  const steps = workflows[activeWF] || [];
  function updateStep(i: number, field: keyof WorkflowStep, val: string) {
    setWorkflows(w => {
      const arr = [...w[activeWF]];
      arr[i] = { ...arr[i], [field]: val };
      if (field === 'roleId') arr[i].userId = '';
      return { ...w, [activeWF]: arr };
    });
  }
  function addStep() {
    if (!newStepLabel.trim()) return;
    setWorkflows(w => ({ ...w, [activeWF]: [...w[activeWF], { label: newStepLabel.trim(), roleId: '', userId: '' }] }));
    setNewStepLabel('');
  }
  function removeStep(i: number) {
    setWorkflows(w => ({ ...w, [activeWF]: w[activeWF].filter((_, idx) => idx !== i) }));
  }
  function moveStep(i: number, dir: -1 | 1) {
    const arr = [...steps]; const ni = i + dir;
    if (ni < 0 || ni >= arr.length) return;
    [arr[i], arr[ni]] = [arr[ni], arr[i]];
    setWorkflows(w => ({ ...w, [activeWF]: arr }));
  }
  function usersForStep(step: WorkflowStep) {
    if (!step.roleId) return users;
    return users.filter((u: any) => u.userRoles?.some((ur: any) => ur.role?.id === step.roleId || ur.roleId === step.roleId));
  }

  async function save() {
    setSaving(true); setError('');
    try {
      const apiType = WORKFLOW_META[activeWF].apiType;
      const res = await fetch(`/api/super-admin/schools/${schoolId}/leave-config`, {
        method: 'PUT', headers: headers(),
        body: JSON.stringify({
          action: 'upsert_workflow',
          type: apiType,
          steps: steps.map(s => ({
            label:          s.label,
            approverRole:   s.roleId   || undefined,
            approverUserId: s.userId   || undefined,
          })),
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { setError('Failed to save workflow'); }
    finally { setSaving(false); }
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'leave-types',    label: 'Leave Type Master' },
    { id: 'balance-policy', label: 'Balance Policy' },
    { id: 'holidays',       label: 'Holiday Calendar' },
    { id: 'workflows',      label: 'Approval Workflows' },
  ];

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Leave Configuration</h1>
        <p className="text-sm text-surface-400 mt-0.5">Leave types, balance policies, holiday calendar and approval workflows.</p>
      </div>

      {/* Sync notice */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-emerald-700 dark:text-emerald-400 w-fit">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
        Leave, attendance and timetable sync in real-time for Teachers, HOD, Principal and School Admin.
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
          {error}
          <button onClick={() => setError('')} className="ml-auto">×</button>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-surface-100 dark:bg-gray-800 rounded-xl w-fit flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-surface-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Leave Type Master ─────────────────────────────────────────────── */}
      {tab === 'leave-types' && (
        <div className="space-y-6 max-w-3xl">
          <div className="card p-6 space-y-5">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Leave Type Master</h2>
              <p className="text-xs text-surface-400 mt-0.5">Define all leave types used in this school. Assign which roles each type applies to.</p>
            </div>

            {ltLoading ? (
              <div className="text-sm text-surface-400 py-4 text-center">Loading...</div>
            ) : leaveTypes.length === 0 ? (
              <div className="text-sm text-surface-400 py-6 text-center border-2 border-dashed border-surface-200 dark:border-gray-700 rounded-xl">
                No leave types yet. Add your first one below.
              </div>
            ) : (
              <div className="space-y-2">
                {/* Header */}
                <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-3 px-3 text-xs font-semibold text-surface-400 uppercase tracking-wide">
                  <span>Name</span><span>Code</span><span>Applies To</span><span className="w-6" />
                </div>
                {leaveTypes.map(lt => (
                  <div key={lt.id} className={`grid grid-cols-[1fr_1fr_auto_auto] gap-3 items-center p-3 rounded-xl ${lt.isActive ? 'bg-surface-50 dark:bg-gray-700/40' : 'bg-surface-50/50 dark:bg-gray-800/40 opacity-60'}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${lt.isActive ? 'bg-emerald-400' : 'bg-surface-300'}`} />
                      <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">{lt.name}</span>
                    </div>
                    <code className="text-xs bg-surface-100 dark:bg-gray-700 text-surface-500 px-2 py-0.5 rounded w-fit">{lt.code}</code>
                    <div className="flex flex-wrap gap-1">
                      {lt.applicableTo.length === 0
                        ? <span className="text-xs text-surface-300">All roles</span>
                        : lt.applicableTo.map(r => (
                          <span key={r} className="text-xs bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 px-1.5 py-0.5 rounded">
                            {STAFF_ROLES.find(sr => sr.code === r)?.label ?? r}
                          </span>
                        ))
                      }
                    </div>
                    <button onClick={() => deleteLeaveType(lt.id)} className="w-6 text-surface-300 hover:text-red-500 transition-colors">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6"/><path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2-2v2"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new */}
            <div className="border-t border-surface-100 dark:border-gray-700 pt-4 space-y-3">
              <p className="text-xs font-semibold text-surface-400 uppercase tracking-wide">Add New Leave Type</p>
              <div className="grid grid-cols-2 gap-3">
                <input className="input-field" placeholder="Name (e.g. Sick Leave)" value={newLT.name}
                  onChange={e => setNewLT(n => ({ ...n, name: e.target.value, code: e.target.value.toLowerCase().replace(/\s+/g, '_') }))} />
                <input className="input-field font-mono" placeholder="Code (e.g. sick_leave)" value={newLT.code}
                  onChange={e => setNewLT(n => ({ ...n, code: e.target.value.toLowerCase().replace(/\s+/g, '_') }))} />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-surface-400">Applicable to (leave blank for all roles incl. students):</p>
                <div className="flex flex-wrap gap-2">
                  {STAFF_ROLES.map(r => (
                    <button key={r.code} onClick={() => toggleApplicable(r.code)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${newLT.applicableTo.includes(r.code) ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300' : 'border-surface-200 dark:border-gray-700 text-surface-400'}`}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={createLeaveType} className="btn btn-primary">+ Create Leave Type</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Balance Policy ────────────────────────────────────────────────── */}
      {tab === 'balance-policy' && (
        <div className="space-y-4 max-w-5xl">

          {/* Carry-Forward Date */}
          <div className="card p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Carry-Forward Settings</h2>
              <p className="text-xs text-surface-400 mt-0.5">
                Set the date on which the carry-forward process runs automatically each year. Unused leaves lapse; only the max allowed carry amount transfers.
              </p>
            </div>
            <div className="flex items-end gap-3 flex-wrap">
              <div className="space-y-1">
                <label className="text-xs font-medium text-surface-400 uppercase tracking-wide">Carry-Forward Date (MM-DD)</label>
                <input
                  type="text" placeholder="MM-DD e.g. 03-31"
                  maxLength={5}
                  pattern="\d{2}-\d{2}"
                  className="input w-36"
                  value={carryForwardDate}
                  onChange={e => setCarryForwardDate(e.target.value)}
                />
                <p className="text-xs text-surface-300">Leaves that exceed the max carry limit are lapsed on this date.</p>
              </div>
              <button onClick={saveCarryForwardDate} disabled={cfDateSaving || !carryForwardDate}
                className="btn btn-secondary text-xs flex items-center gap-1.5 mb-5">
                {cfDateSaving
                  ? <><svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Saving...</>
                  : 'Save Date'
                }
              </button>
              <div className="mb-5 border-l border-surface-200 dark:border-gray-700 pl-4 ml-1">
                <p className="text-xs text-surface-400 mb-2">Run carry-forward manually (e.g. year-end migration):</p>
                <button onClick={executeCarryForward} disabled={cfRunning}
                  className="btn btn-secondary text-xs flex items-center gap-1.5 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30">
                  {cfRunning
                    ? <><svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Running...</>
                    : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>Execute Carry-Forward Now</>
                  }
                </button>
              </div>
            </div>
            {cfResult && (
              <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20,6 9,17 4,12"/></svg>
                {cfResult}
              </div>
            )}
          </div>

          {/* Policy matrix */}
          <div className="card p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Leave Balance Policy</h2>
              <p className="text-xs text-surface-400 mt-0.5">
                Set monthly accrual, initial balance, and carry-forward limit per leave type per role. Students have no balance — all leave is approval-only.
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-400 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Leave accrues monthly. Initial balance is granted at the start of the year. Max carry defines how many unused days roll over on the carry-forward date.
            </div>

            {leaveTypes.length === 0 ? (
              <p className="text-sm text-surface-400 py-4 text-center">Create leave types first from the "Leave Type Master" tab.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-xs text-surface-400 uppercase tracking-wide">
                      <th className="text-left py-2 pr-4 font-semibold min-w-[140px]">Leave Type</th>
                      {STAFF_ROLES.map(r => (
                        <th key={r.code} className="text-center py-2 px-3 font-semibold min-w-[150px]">{r.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100 dark:divide-gray-700/60">
                    {leaveTypes.map(lt => (
                      <tr key={lt.id} className="group">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-brand-400 rounded-full shrink-0" />
                            <span className="font-medium text-gray-800 dark:text-gray-200">{lt.name}</span>
                          </div>
                          <code className="text-xs text-surface-300 ml-4">{lt.code}</code>
                        </td>
                        {STAFF_ROLES.map(r => {
                          const p = getPolicy(lt.id, r.code);
                          const applies = lt.applicableTo.length === 0 || lt.applicableTo.includes(r.code);
                          if (!applies) return (
                            <td key={r.code} className="py-3 px-3 text-center">
                              <span className="text-xs text-surface-300">N/A</span>
                            </td>
                          );
                          return (
                            <td key={r.code} className="py-3 px-3">
                              <div className="space-y-2">
                                {/* Monthly accrual */}
                                <div className="space-y-0.5">
                                  <span className="text-xs text-surface-400">Days/month</span>
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="number" min={0} max={31} step={0.5}
                                      className="input text-center w-16 text-sm py-1"
                                      placeholder="0"
                                      value={p?.daysPerMonth ?? ''}
                                      onChange={e => updatePolicy(lt.id, r.code, 'daysPerMonth', Number(e.target.value))}
                                    />
                                    {(p?.daysPerMonth ?? 0) > 0 && (
                                      <span className="text-xs text-surface-300">= {(p!.daysPerMonth * 12)} /yr</span>
                                    )}
                                  </div>
                                </div>
                                {/* Initial balance */}
                                <div className="space-y-0.5">
                                  <span className="text-xs text-surface-400">Initial balance</span>
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="number" min={0} max={365}
                                      className="input text-center w-16 text-sm py-1"
                                      placeholder="0"
                                      value={p?.initialBalance ?? ''}
                                      onChange={e => updatePolicy(lt.id, r.code, 'initialBalance', Number(e.target.value))}
                                    />
                                    <span className="text-xs text-surface-300">days</span>
                                  </div>
                                </div>
                                {/* Carry forward */}
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input type="checkbox" className="rounded" checked={p?.carryForward ?? false}
                                    onChange={e => updatePolicy(lt.id, r.code, 'carryForward', e.target.checked)} />
                                  <span className="text-xs text-surface-400">Carry fwd</span>
                                </label>
                                {p?.carryForward && (
                                  <div className="flex items-center gap-1.5">
                                    <input type="number" min={0} max={365} className="input text-center w-16 text-xs py-0.5"
                                      placeholder="max"
                                      value={p?.maxCarryDays ?? ''}
                                      onChange={e => updatePolicy(lt.id, r.code, 'maxCarryDays', Number(e.target.value))} />
                                    <span className="text-xs text-surface-400">max carry</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Holiday Calendar ──────────────────────────────────────────────── */}
      {tab === 'holidays' && (
        <div className="space-y-6 max-w-3xl">
          {/* Weekly Off Configuration */}
          <div className="card p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Weekly Off Days</h2>
              <p className="text-xs text-surface-400 mt-0.5">Mark which days of the week are weekly offs. These reflect across all attendance calendars.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map(d => (
                <button key={d.num} onClick={() => toggleWeekoff(d.num)}
                  className={`flex flex-col items-center px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${weekoffDays.includes(d.num) ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300' : 'border-surface-200 dark:border-gray-700 text-surface-400 hover:border-brand-300'}`}>
                  <span className="font-semibold">{d.short}</span>
                </button>
              ))}
            </div>
            <button onClick={saveWeekoffs} disabled={weekoffSaving}
              className="btn btn-secondary text-xs flex items-center gap-1.5 w-fit">
              {weekoffSaving
                ? <><svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Saving...</>
                : 'Save Weekly Off Days'
              }
            </button>
          </div>

          {/* Year + upload */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Holiday Calendar</h2>
                <p className="text-xs text-surface-400 mt-0.5">Mandatory holidays apply to all. Optional holidays can be chosen by staff individually.</p>
              </div>
              <select className="input w-36" value={academicYear} onChange={e => setAcademicYear(e.target.value)}>
                {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2.5 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <span>
                  <strong>Note:</strong> Holidays do <em>not</em> sync to the leave module calendar view — they are blocked dates only.
                  Staff cannot apply leave on holiday dates. Punch in/out is still captured on holidays.
                  Week-off days are configured separately and sync to attendance &amp; leave calendars.
                </span>
              </div>
            </div>

            {/* Upload + template */}
            <div className="flex flex-wrap items-center gap-3 p-3 bg-surface-50 dark:bg-gray-700/40 rounded-xl">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-surface-400"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
              <div className="flex-1 min-w-0">
                <span className="text-sm text-gray-700 dark:text-gray-300">Upload holiday list for {academicYear}</span>
                <p className="text-xs text-surface-400 mt-0.5">Columns: Date (YYYY-MM-DD), Name, Type (mandatory/optional). Week-off rows are ignored.</p>
              </div>
              <button
                onClick={async () => {
                  const token = localStorage.getItem('token') ?? '';
                  const res = await fetch(`/api/super-admin/schools/${schoolId}/leave-config?action=holiday_template`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = 'holiday-template.xlsx'; a.click();
                  URL.revokeObjectURL(url);
                }}
                className="btn btn-secondary text-xs flex items-center gap-1.5 shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Template
              </button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleHolidayFile} />
              <button onClick={() => { setUploadResult(''); fileRef.current?.click(); }} disabled={holidayUploading}
                className="btn btn-secondary text-xs flex items-center gap-1.5 shrink-0">
                {holidayUploading
                  ? <><svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Uploading...</>
                  : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>Upload Excel/CSV</>
                }
              </button>
            </div>
            {uploadResult && (
              <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 px-1">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20,6 9,17 4,12"/></svg>
                {uploadResult}
              </div>
            )}
          </div>

          {/* Holiday list */}
          <div className="card p-6 space-y-4">
            {/* Mandatory */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-red-400 rounded-full" />
                <p className="text-xs font-semibold text-surface-400 uppercase tracking-wide">Mandatory Holidays</p>
                <span className="text-xs text-surface-300">({holidays.filter(h => h.type === 'mandatory').length})</span>
              </div>
              {holidays.filter(h => h.type === 'mandatory').length === 0 && (
                <p className="text-xs text-surface-300 pl-4">No mandatory holidays added.</p>
              )}
              {holidays.filter(h => h.type === 'mandatory').map(h => (
                <HolidayRow key={h.id} holiday={h} onDelete={() => deleteHoliday(h.id)} />
              ))}
            </div>

            {/* Optional */}
            <div className="space-y-2 pt-2 border-t border-surface-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-blue-400 rounded-full" />
                <p className="text-xs font-semibold text-surface-400 uppercase tracking-wide">Optional Holidays</p>
                <span className="text-xs text-surface-300">({holidays.filter(h => h.type === 'optional').length})</span>
              </div>
              <p className="text-xs text-surface-300 pl-4">Staff can voluntarily take these as leave from their balance.</p>
              {holidays.filter(h => h.type === 'optional').map(h => (
                <HolidayRow key={h.id} holiday={h} onDelete={() => deleteHoliday(h.id)} />
              ))}
            </div>

            {/* Add holiday */}
            <div className="pt-3 border-t border-surface-100 dark:border-gray-700 space-y-3">
              <p className="text-xs font-semibold text-surface-400 uppercase tracking-wide">Add Holiday</p>
              <div className="flex flex-wrap gap-2">
                <input className="input w-36" type="date" value={newHoliday.date}
                  onChange={e => setNewHoliday(h => ({ ...h, date: e.target.value }))} />
                <input className="input flex-1 min-w-[160px]" placeholder="Holiday name"
                  value={newHoliday.name}
                  onChange={e => setNewHoliday(h => ({ ...h, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addHoliday()} />
                <select className="input w-36" value={newHoliday.type}
                  onChange={e => setNewHoliday(h => ({ ...h, type: e.target.value as any }))}>
                  <option value="mandatory">Mandatory</option>
                  <option value="optional">Optional</option>
                </select>
                <button onClick={addHoliday} className="btn btn-secondary">Add</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Approval Workflows ────────────────────────────────────────────── */}
      {tab === 'workflows' && (
        <div className="space-y-6">
          <div className="flex gap-3 flex-wrap">
            {(['student', 'teacher'] as const).map(wf => (
              <button key={wf} onClick={() => { setActiveWF(wf); setNewStepLabel(''); }}
                className={`px-5 py-3 rounded-xl border-2 text-sm font-medium transition-all text-left ${activeWF === wf ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300' : 'border-surface-200 dark:border-gray-700 text-surface-400 hover:border-brand-300'}`}>
                <div className="font-semibold">{WORKFLOW_META[wf].label}</div>
                <div className="text-xs mt-0.5 opacity-75">{workflows[wf].length} stages</div>
              </button>
            ))}
          </div>

          <div className="card p-5 space-y-4 max-w-4xl">
            <p className="text-xs text-surface-400">{WORKFLOW_META[activeWF].desc}</p>

            {/* Column headers */}
            <div className="hidden sm:grid sm:grid-cols-[auto_1fr_1fr_1fr_auto] gap-3 px-3 items-center">
              <div className="w-7" />
              <div className="text-xs font-semibold text-surface-400 uppercase tracking-wide">Stage Name</div>
              <div className="text-xs font-semibold text-surface-400 uppercase tracking-wide">Assigned Role</div>
              <div className="text-xs font-semibold text-surface-400 uppercase tracking-wide">Assigned User</div>
              <div className="w-20" />
            </div>

            {/* Steps */}
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 p-3 bg-surface-50 dark:bg-gray-700/40 rounded-xl items-center">
                  <span className="hidden sm:flex w-7 h-7 bg-brand-100 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400 text-xs font-bold rounded-full items-center justify-center shrink-0">{i + 1}</span>
                  <input className="text-sm bg-white dark:bg-gray-800 border border-surface-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-brand-400 w-full"
                    value={step.label} onChange={e => updateStep(i, 'label', e.target.value)} />
                  <select className="text-sm bg-white dark:bg-gray-800 border border-surface-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-brand-400 w-full"
                    value={step.roleId} onChange={e => updateStep(i, 'roleId', e.target.value)}>
                    <option value="">— Any Role —</option>
                    {roles.map((r: any) => <option key={r.id} value={r.id}>{r.displayName || r.code}</option>)}
                  </select>
                  <select className="text-sm bg-white dark:bg-gray-800 border border-surface-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-brand-400 w-full"
                    value={step.userId} onChange={e => updateStep(i, 'userId', e.target.value)}>
                    <option value="">— Any User —</option>
                    {usersForStep(step).map((u: any) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
                  </select>
                  <div className="flex items-center gap-0.5 justify-end">
                    <button onClick={() => moveStep(i, -1)} disabled={i === 0} className="p-1.5 text-surface-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18,15 12,9 6,15"/></svg>
                    </button>
                    <button onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1} className="p-1.5 text-surface-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6,9 12,15 18,9"/></svg>
                    </button>
                    <button onClick={() => removeStep(i)} className="p-1.5 text-surface-400 hover:text-red-500 transition-colors">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input className="input flex-1" placeholder="New stage name..." value={newStepLabel}
                onChange={e => setNewStepLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && addStep()} />
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

// ─── Sub-components ────────────────────────────────────────────────────────────
function HolidayRow({ holiday, onDelete }: { holiday: Holiday; onDelete: () => void }) {
  const d = new Date(holiday.date);
  const fmt = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-50 dark:bg-gray-700/40">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${holiday.type === 'mandatory' ? 'bg-red-400' : 'bg-blue-400'}`} />
        <span className="text-xs font-mono text-surface-400 w-24 shrink-0">{fmt} <span className="text-surface-300">({dayName})</span></span>
        <span className="text-sm text-gray-800 dark:text-gray-200">{holiday.name}</span>
      </div>
      <button onClick={onDelete} className="text-surface-300 hover:text-red-500 transition-colors p-1">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  );
}

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
