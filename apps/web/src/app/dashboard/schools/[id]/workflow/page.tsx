'use client';

import { useEffect, useState, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type WorkflowType =
  | 'admission'
  | 'leave'
  | 'attendance'
  | 'fee'
  | 'query_parents'
  | 'query_school_admin';

interface WorkflowStage {
  stageName:      string;
  initiatorRole:  string;
  approverRole:   string;
  approverUserId: string;
  systemTrigger:  string;
  isFinal:        boolean;
  emailEnabled:   boolean;
  notifyEnabled:  boolean;
  notifyMessage:  string;
}

interface WorkflowParam {
  name:         string;
  description:  string;
  configuredBy: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_ROLES = [
  { code: 'parent',        label: 'Parent' },
  { code: 'school_admin',  label: 'School Admin' },
  { code: 'teacher',       label: 'Teacher' },
  { code: 'hod',           label: 'HOD' },
  { code: 'principal',     label: 'Principal' },
  { code: 'employee',      label: 'Employee' },
  { code: 'class_teacher', label: 'Class Teacher' },
  { code: 'super_admin',   label: 'Super Admin' },
  { code: 'accountant',    label: 'Accountant' },
];

const LEAVE_ROLES = [
  { code: 'employee', label: 'Employee' },
  { code: 'teacher',  label: 'Teacher' },
  { code: 'hod',      label: 'HOD' },
  { code: 'principal',label: 'Principal' },
  { code: 'parent',   label: 'Parent / Student' },
];

const WORKFLOW_REGISTRY: {
  type:        WorkflowType;
  label:       string;
  module:      string;
  initiators:  string;
  syncsInto:   string;
  description: string;
  color:       string;
}[] = [
  {
    type: 'admission', label: 'Admission',
    module: 'Admission', initiators: 'Parents',
    syncsInto: 'All Modules',
    description: 'Multi-level approval chain. Typically: Parent submits → Admin reviews → Principal approves → Admin confirms enrolment.',
    color: 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40',
  },
  {
    type: 'leave', label: 'Leave',
    module: 'Leave', initiators: 'Parents, Employee',
    syncsInto: 'Attendance, Leave, Timetable, Scheduling',
    description: 'Role-wise approval chain. Parent leave: Class Teacher → Admin. Employee leave: HOD → Admin → Principal.',
    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40',
  },
  {
    type: 'attendance', label: 'Attendance',
    module: 'Attendance', initiators: 'Teachers, Employee',
    syncsInto: 'Attendance',
    description: 'Teacher marks attendance; system flags anomalies; regularisation requests flow through HOD → Admin.',
    color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40',
  },
  {
    type: 'fee', label: 'Fee',
    module: 'Fee', initiators: 'Parents',
    syncsInto: 'Fee',
    description: 'Parent submits payment request / concession → Accounts → Admin → Principal (for waivers). Auto-receipt on completion.',
    color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40',
  },
  {
    type: 'query_parents', label: 'Query – Parents',
    module: 'Query', initiators: 'Parents',
    syncsInto: 'Query',
    description: 'Parent raises query → School Admin assigns → Teacher/HOD responds → Admin closes.',
    color: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40',
  },
  {
    type: 'query_school_admin', label: 'Query – School Admin',
    module: 'Query', initiators: 'School Admin',
    syncsInto: 'Query',
    description: 'School Admin raises platform queries. Auto-reflects on Super Admin portal for internal team resolution.',
    color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40',
  },
];

// Default parameters per workflow type
const WORKFLOW_PARAMS: Record<WorkflowType, WorkflowParam[]> = {
  admission: [
    { name: 'Student Grade / Class applied for',   description: 'Route or filter the workflow based on the class applied.', configuredBy: 'Super Admin / School Admin' },
    { name: 'Academic Year',                        description: 'Scope the admission to a specific academic year.',          configuredBy: 'Super Admin / School Admin' },
    { name: 'Quota (General / Mgmt / Sports …)',    description: 'Apply quota-specific rules at each stage.',                configuredBy: 'Super Admin / School Admin' },
    { name: 'Document checklist completion',        description: 'Gate progression to next stage on document upload.',       configuredBy: 'Super Admin / School Admin' },
    { name: 'Previous school records',              description: 'Required for transfer students at the review stage.',      configuredBy: 'Super Admin / School Admin' },
  ],
  leave: [
    { name: 'Leave Type',                           description: 'Route or condition the workflow by leave type.',           configuredBy: 'Super Admin / School Admin' },
    { name: 'Date range (from – to)',               description: 'Duration used to validate leave balance.',                 configuredBy: 'Super Admin / School Admin' },
    { name: 'Reason / Description',                 description: 'Mandatory reason field at submission.',                   configuredBy: 'Super Admin / School Admin' },
    { name: 'Attachment (medical certificate…)',    description: 'Required for medical leave types.',                       configuredBy: 'Super Admin / School Admin' },
    { name: 'Employee / Student role filter',       description: 'Selects the correct approval chain per role.',            configuredBy: 'Super Admin / School Admin' },
  ],
  attendance: [
    { name: 'Date / Period',                        description: 'The date and class period for attendance.',                configuredBy: 'Super Admin / School Admin' },
    { name: 'Attendance status',                    description: 'Present / Absent / Late / Half Day.',                     configuredBy: 'Super Admin / School Admin' },
    { name: 'Geo-fence compliance flag',            description: 'Auto-flagged by system for out-of-bounds check-ins.',     configuredBy: 'Super Admin / School Admin' },
    { name: 'Correction reason',                    description: 'Required when submitting a regularisation request.',      configuredBy: 'Super Admin / School Admin' },
    { name: 'Role filter (Student / Teacher…)',     description: 'Determines the correct regularisation approval chain.',   configuredBy: 'Super Admin / School Admin' },
  ],
  fee: [
    { name: 'Fee category',                         description: 'Tuition / Transport / Hostel — routes the workflow.',     configuredBy: 'Super Admin / School Admin' },
    { name: 'Amount',                               description: 'Fee amount; threshold may trigger Principal approval.',   configuredBy: 'Super Admin / School Admin' },
    { name: 'Payment mode',                         description: 'Online / Offline / Instalment.',                          configuredBy: 'Super Admin / School Admin' },
    { name: 'Concession type & reason',             description: 'Required for concession or waiver requests.',             configuredBy: 'Super Admin / School Admin' },
    { name: 'Academic year / term',                 description: 'Scope the fee request to a term or full year.',           configuredBy: 'Super Admin / School Admin' },
  ],
  query_parents: [
    { name: 'Query type',                           description: 'Academic / Fee / Complaint / General.',                   configuredBy: 'Super Admin / School Admin' },
    { name: 'Priority (High / Medium / Low)',        description: 'Sets SLA and escalation rules.',                         configuredBy: 'Super Admin / School Admin' },
    { name: 'Assigned department',                  description: 'Department the query is routed to.',                     configuredBy: 'Super Admin / School Admin' },
    { name: 'Due date for resolution',              description: 'SLA deadline for closure.',                               configuredBy: 'Super Admin / School Admin' },
    { name: 'Attachment (if any)',                  description: 'Supporting document or screenshot.',                      configuredBy: 'Super Admin / School Admin' },
  ],
  query_school_admin: [
    { name: 'Query category',                       description: 'Technical / Operational / Feature Request / Bug Report.', configuredBy: 'Super Admin / School Admin' },
    { name: 'Priority',                             description: 'Sets internal SLA and assignment urgency.',               configuredBy: 'Super Admin / School Admin' },
    { name: 'Affected module',                      description: 'Which module the issue relates to.',                     configuredBy: 'Super Admin / School Admin' },
    { name: 'School identifier',                    description: 'Auto-attached from school context.',                     configuredBy: 'Super Admin / School Admin' },
    { name: 'Screenshots / Attachments',            description: 'Supporting evidence for the query.',                     configuredBy: 'Super Admin / School Admin' },
  ],
};

// Default stages per workflow type (pre-fills when no saved config exists)
const DEFAULT_STAGES: Record<WorkflowType, (role?: string) => WorkflowStage[]> = {
  admission: () => [
    { stageName: 'Application Submission', initiatorRole: 'parent',       approverRole: '',            approverUserId: '', systemTrigger: 'Notify School Admin; create draft admission record.',                        isFinal: false, emailEnabled: false, notifyEnabled: true,  notifyMessage: '' },
    { stageName: 'Initial Review',         initiatorRole: 'school_admin', approverRole: 'school_admin',approverUserId: '', systemTrigger: 'Notify Parents of status; flag incomplete docs.',                           isFinal: false, emailEnabled: false, notifyEnabled: true,  notifyMessage: '' },
    { stageName: 'Principal Approval',     initiatorRole: 'principal',    approverRole: 'principal',   approverUserId: '', systemTrigger: 'Notify School Admin of final decision.',                                    isFinal: false, emailEnabled: false, notifyEnabled: true,  notifyMessage: '' },
    { stageName: 'Confirmation & Enrolment',initiatorRole:'school_admin', approverRole: 'school_admin',approverUserId: '', systemTrigger: 'Create student record; trigger fee module; notify parents.',                isFinal: true,  emailEnabled: true,  notifyEnabled: true,  notifyMessage: '' },
  ],
  leave: (role = 'teacher') => {
    switch (role) {
      case 'employee':
      case 'teacher':
        return [
          { stageName: 'Leave Application',  initiatorRole: role,          approverRole: 'hod',          approverUserId: '', systemTrigger: 'Notify approver; flag on attendance calendar.', isFinal: false, emailEnabled: false, notifyEnabled: true,  notifyMessage: '' },
          { stageName: 'HOD Review',         initiatorRole: 'hod',         approverRole: 'hod',          approverUserId: '', systemTrigger: 'Notify next approver or applicant.',             isFinal: false, emailEnabled: false, notifyEnabled: true,  notifyMessage: '' },
          { stageName: 'Admin Approval',     initiatorRole: 'school_admin',approverRole: 'school_admin', approverUserId: '', systemTrigger: 'Update attendance record; notify applicant.',    isFinal: true,  emailEnabled: false, notifyEnabled: true,  notifyMessage: '' },
        ];
      case 'hod':
        return [
          { stageName: 'Leave Application',  initiatorRole: 'hod',         approverRole: 'principal',    approverUserId: '', systemTrigger: 'Notify approver; flag on attendance calendar.', isFinal: false, emailEnabled: false, notifyEnabled: true,  notifyMessage: '' },
          { stageName: 'Principal Approval', initiatorRole: 'principal',   approverRole: 'principal',    approverUserId: '', systemTrigger: 'Update attendance record; notify HOD.',          isFinal: true,  emailEnabled: false, notifyEnabled: true,  notifyMessage: '' },
        ];
      case 'principal':
        return [
          { stageName: 'Leave Application',  initiatorRole: 'principal',   approverRole: 'school_admin', approverUserId: '', systemTrigger: 'Notify School Admin.',                          isFinal: true,  emailEnabled: false, notifyEnabled: true,  notifyMessage: '' },
        ];
      case 'parent':
        return [
          { stageName: 'Leave Application',  initiatorRole: 'parent',      approverRole: 'class_teacher',approverUserId: '', systemTrigger: 'Notify class teacher; flag on attendance.',     isFinal: false, emailEnabled: false, notifyEnabled: true,  notifyMessage: '' },
          { stageName: 'Admin Approval',     initiatorRole: 'school_admin',approverRole: 'school_admin', approverUserId: '', systemTrigger: 'Update attendance; notify parents.',             isFinal: true,  emailEnabled: false, notifyEnabled: true,  notifyMessage: '' },
        ];
      default:
        return [
          { stageName: 'Leave Application',  initiatorRole: role,          approverRole: 'school_admin', approverUserId: '', systemTrigger: 'Notify approver.',                              isFinal: true,  emailEnabled: false, notifyEnabled: true,  notifyMessage: '' },
        ];
    }
  },
  attendance: () => [
    { stageName: 'Attendance Marking',       initiatorRole: 'teacher',      approverRole: '',            approverUserId: '', systemTrigger: 'Update attendance register; flag anomalies.',                             isFinal: false, emailEnabled: false, notifyEnabled: true,  notifyMessage: '' },
    { stageName: 'Anomaly / Late Flag',       initiatorRole: '',             approverRole: '',            approverUserId: '', systemTrigger: 'System auto-flags: alert Admin dashboard; log irregularity.',             isFinal: false, emailEnabled: false, notifyEnabled: true,  notifyMessage: '' },
    { stageName: 'Regularisation Request',    initiatorRole: 'teacher',      approverRole: 'hod',         approverUserId: '', systemTrigger: 'Notify Admin / HOD for review.',                                         isFinal: false, emailEnabled: false, notifyEnabled: true,  notifyMessage: '' },
    { stageName: 'Admin Approval',            initiatorRole: '',             approverRole: 'school_admin',approverUserId: '', systemTrigger: 'Update attendance record; notify employee/teacher.',                      isFinal: true,  emailEnabled: false, notifyEnabled: true,  notifyMessage: '' },
  ],
  fee: () => [
    { stageName: 'Fee Request / Concession',  initiatorRole: 'parent',       approverRole: '',            approverUserId: '', systemTrigger: 'Notify Accounts team; create pending ledger entry.',                      isFinal: false, emailEnabled: false, notifyEnabled: true,  notifyMessage: '' },
    { stageName: 'Accounts Review',           initiatorRole: '',             approverRole: 'accountant',  approverUserId: '', systemTrigger: 'Verify payment details or concession eligibility; notify Admin.',         isFinal: false, emailEnabled: false, notifyEnabled: true,  notifyMessage: '' },
    { stageName: 'Admin / Principal Approval',initiatorRole: '',             approverRole: 'principal',   approverUserId: '', systemTrigger: 'Approve concession or instalment plan; notify Parents of decision.',      isFinal: false, emailEnabled: false, notifyEnabled: true,  notifyMessage: '' },
    { stageName: 'Confirmation & Receipt',    initiatorRole: '',             approverRole: '',            approverUserId: '', systemTrigger: 'System auto: generate receipt; update fee ledger; send to parent.',        isFinal: true,  emailEnabled: true,  notifyEnabled: true,  notifyMessage: '' },
  ],
  query_parents: () => [
    { stageName: 'Query Submission',          initiatorRole: 'parent',       approverRole: '',            approverUserId: '', systemTrigger: 'Notify School Admin; log query with timestamp.',                          isFinal: false, emailEnabled: false, notifyEnabled: true,  notifyMessage: '' },
    { stageName: 'Query Assignment',          initiatorRole: '',             approverRole: 'school_admin',approverUserId: '', systemTrigger: 'Notify assigned teacher / HOD.',                                          isFinal: false, emailEnabled: false, notifyEnabled: true,  notifyMessage: '' },
    { stageName: 'Response / Resolution',     initiatorRole: '',             approverRole: 'teacher',     approverUserId: '', systemTrigger: 'Notify parent of response.',                                              isFinal: false, emailEnabled: false, notifyEnabled: true,  notifyMessage: '' },
    { stageName: 'Closure Confirmation',      initiatorRole: '',             approverRole: 'school_admin',approverUserId: '', systemTrigger: 'Close query; archive; notify parent.',                                    isFinal: true,  emailEnabled: true,  notifyEnabled: true,  notifyMessage: '' },
  ],
  query_school_admin: () => [
    { stageName: 'Query Submission',          initiatorRole: 'school_admin', approverRole: '',            approverUserId: '', systemTrigger: 'Log query with timestamp; notify School Admin.',                          isFinal: false, emailEnabled: false, notifyEnabled: true,  notifyMessage: '' },
    { stageName: 'Super Admin Visibility',    initiatorRole: '',             approverRole: '',            approverUserId: '', systemTrigger: 'System auto: query visible on Super Admin portal immediately.',            isFinal: false, emailEnabled: false, notifyEnabled: false, notifyMessage: '' },
    { stageName: 'Internal Team Assignment',  initiatorRole: '',             approverRole: 'super_admin', approverUserId: '', systemTrigger: 'Assign ticket; notify School Admin of ETA.',                              isFinal: false, emailEnabled: false, notifyEnabled: true,  notifyMessage: '' },
    { stageName: 'Resolution & Closure',      initiatorRole: '',             approverRole: 'super_admin', approverUserId: '', systemTrigger: 'Notify School Admin; archive on both portals.',                           isFinal: true,  emailEnabled: true,  notifyEnabled: true,  notifyMessage: '' },
  ],
};

// ── Stage Row ─────────────────────────────────────────────────────────────────

function StageRow({
  stage, index, total, users,
  onChange, onRemove, onMove,
}: {
  stage:    WorkflowStage;
  index:    number;
  total:    number;
  users:    any[];
  onChange: (field: keyof WorkflowStage, val: any) => void;
  onRemove: () => void;
  onMove:   (dir: -1 | 1) => void;
}) {
  const filteredUsers = stage.approverRole
    ? users.filter((u: any) => u.userRoles?.some((r: any) => r.role?.code === stage.approverRole))
    : users;

  return (
    <div className="card p-4 space-y-3">
      {/* Row 1 — stage number + name */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="w-7 h-7 bg-brand-100 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
          {index + 1}
        </span>

        <input
          className="input flex-1 min-w-[160px] text-sm font-medium"
          placeholder="Stage name…"
          value={stage.stageName}
          onChange={e => onChange('stageName', e.target.value)}
        />

        <div className="flex items-center gap-0.5 flex-shrink-0 ml-auto">
          <button onClick={() => onMove(-1)} disabled={index === 0}
            className="p-1 text-surface-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18,15 12,9 6,15"/></svg>
          </button>
          <button onClick={() => onMove(1)} disabled={index === total - 1}
            className="p-1 text-surface-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6,9 12,15 18,9"/></svg>
          </button>
          <button onClick={onRemove} className="p-1 text-surface-400 hover:text-red-500 transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      {/* Row 2 — roles + final toggle */}
      <div className="pl-10 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-surface-400 whitespace-nowrap">Initiator</span>
          <select
            className="input text-xs w-36"
            value={stage.initiatorRole}
            onChange={e => onChange('initiatorRole', e.target.value)}
          >
            <option value="">— System / Auto —</option>
            {ALL_ROLES.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-surface-400 whitespace-nowrap">Approver Role</span>
          <select
            className="input text-xs w-36"
            value={stage.approverRole}
            onChange={e => { onChange('approverRole', e.target.value); onChange('approverUserId', ''); }}
          >
            <option value="">— None / System —</option>
            {ALL_ROLES.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}
          </select>
        </div>

        {stage.approverRole && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-surface-400 whitespace-nowrap">Specific User</span>
            <select
              className="input text-xs w-36"
              value={stage.approverUserId}
              onChange={e => onChange('approverUserId', e.target.value)}
            >
              <option value="">— Any user —</option>
              {filteredUsers.map((u: any) => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
              ))}
            </select>
          </div>
        )}

        <label className="flex items-center gap-1.5 shrink-0 cursor-pointer ml-auto"
          title="Final stage — triggers downstream actions on completion">
          <input
            type="checkbox"
            className="w-4 h-4 rounded accent-emerald-500"
            checked={stage.isFinal}
            onChange={e => onChange('isFinal', e.target.checked)}
          />
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">Final stage</span>
        </label>
      </div>

      {/* Row 3 — system trigger */}
      <div className="pl-10">
        <input
          className="input text-xs w-full text-surface-500 dark:text-gray-400"
          placeholder="System trigger / action description (optional)…"
          value={stage.systemTrigger}
          onChange={e => onChange('systemTrigger', e.target.value)}
        />
      </div>

      {/* Row 4 — notifications */}
      <div className="pl-10 flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 rounded accent-brand-500"
            checked={stage.notifyEnabled}
            onChange={e => onChange('notifyEnabled', e.target.checked)} />
          <span className="text-xs text-surface-500 dark:text-gray-400">In-app notification</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 rounded accent-brand-500"
            checked={stage.emailEnabled}
            onChange={e => onChange('emailEnabled', e.target.checked)} />
          <span className="text-xs text-surface-500 dark:text-gray-400">Email notification</span>
        </label>
        {(stage.notifyEnabled || stage.emailEnabled) && (
          <input
            className="input text-xs flex-1 min-w-[200px]"
            placeholder="Custom notification message (optional)…"
            value={stage.notifyMessage}
            onChange={e => onChange('notifyMessage', e.target.value)}
          />
        )}
      </div>
    </div>
  );
}

// ── Parameters Panel ──────────────────────────────────────────────────────────

function ParamsPanel({ params }: { params: WorkflowParam[] }) {
  return (
    <div className="card p-4 space-y-3">
      <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Workflow Parameters</p>
      <div className="space-y-2">
        {params.map((p, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="w-5 h-5 bg-surface-100 dark:bg-gray-800 text-surface-500 dark:text-gray-400 text-[10px] font-bold rounded flex items-center justify-center flex-shrink-0 mt-0.5">
              {i + 1}
            </span>
            <div>
              <p className="text-xs font-medium text-gray-800 dark:text-gray-200">{p.name}</p>
              <p className="text-[11px] text-surface-400 dark:text-gray-500">{p.description}</p>
            </div>
            <span className="ml-auto text-[10px] bg-surface-100 dark:bg-gray-800 text-surface-400 dark:text-gray-500 px-2 py-0.5 rounded whitespace-nowrap flex-shrink-0">
              {p.configuredBy}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function WorkflowPage({ params }: { params: { id: string } }) {
  const schoolId = params.id;

  const [activeType,      setActiveType]      = useState<WorkflowType>('admission');
  const [activeLeaveRole, setActiveLeaveRole] = useState(LEAVE_ROLES[0].code);

  // Keyed by `${type}` or `leave_${role}`
  const [stageMap,    setStageMap]    = useState<Record<string, WorkflowStage[]>>({});
  const [loadedKeys,  setLoadedKeys]  = useState<Set<string>>(new Set());
  const [loadingKey,  setLoadingKey]  = useState('');
  const [saving,      setSaving]      = useState(false);
  const [savedKey,    setSavedKey]    = useState('');
  const [error,       setError]       = useState('');
  const [users,       setUsers]       = useState<any[]>([]);

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Load school users for specific-user override dropdown
  useEffect(() => {
    fetch(`/api/super-admin/schools/${schoolId}/users`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setUsers(d.users || []))
      .catch(() => {});
  }, [schoolId]);

  const cacheKey = useCallback((type: WorkflowType, leaveRole?: string) =>
    type === 'leave' ? `leave_${leaveRole}` : type
  , []);

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

      const saved: WorkflowStage[] = (data.workflow?.stages ?? []).map((s: any) => ({
        stageName:      s.stageName      ?? '',
        initiatorRole:  s.initiatorRole  ?? '',
        approverRole:   s.approverRole   ?? '',
        approverUserId: s.approverUserId ?? '',
        systemTrigger:  s.systemTrigger  ?? '',
        isFinal:        s.isFinal        ?? false,
        emailEnabled:   s.emailEnabled   ?? false,
        notifyEnabled:  s.notifyEnabled  ?? true,
        notifyMessage:  s.notifyMessage  ?? '',
      }));

      const stages = saved.length > 0
        ? saved
        : DEFAULT_STAGES[type](type === 'leave' ? leaveRole : undefined);

      setStageMap(prev => ({ ...prev, [key]: stages }));
      setLoadedKeys(prev => new Set([...prev, key]));
    } catch {
      const fallback = DEFAULT_STAGES[type](type === 'leave' ? leaveRole : undefined);
      setStageMap(prev => ({ ...prev, [key]: fallback }));
    }
    setLoadingKey('');
  }, [schoolId, token, loadedKeys, cacheKey]);

  // Load on tab switch
  useEffect(() => {
    if (activeType !== 'leave') {
      loadWorkflow(activeType);
    }
  }, [activeType]);

  useEffect(() => {
    if (activeType === 'leave') {
      loadWorkflow('leave', activeLeaveRole);
    }
  }, [activeType, activeLeaveRole]);

  const currentKey    = cacheKey(activeType, activeLeaveRole);
  const currentStages = stageMap[currentKey] ?? [];
  const isLoading     = loadingKey === currentKey;
  const currentParams = WORKFLOW_PARAMS[activeType];

  function setCurrentStages(fn: (prev: WorkflowStage[]) => WorkflowStage[]) {
    setStageMap(prev => ({ ...prev, [currentKey]: fn(prev[currentKey] ?? []) }));
  }

  function updateStage(i: number, field: keyof WorkflowStage, val: any) {
    setCurrentStages(stages => {
      const arr = [...stages]; arr[i] = { ...arr[i], [field]: val }; return arr;
    });
  }

  const addStage    = () => setCurrentStages(s => [...s, {
    stageName: '', initiatorRole: '', approverRole: '', approverUserId: '',
    systemTrigger: '', isFinal: false, emailEnabled: false, notifyEnabled: true, notifyMessage: '',
  }]);
  const removeStage = (i: number) => setCurrentStages(s => s.filter((_, idx) => idx !== i));
  const moveStage   = (i: number, dir: -1 | 1) => setCurrentStages(s => {
    const arr = [...s]; const ni = i + dir;
    if (ni < 0 || ni >= arr.length) return arr;
    [arr[i], arr[ni]] = [arr[ni], arr[i]]; return arr;
  });

  async function save() {
    setSaving(true); setError(''); setSavedKey('');
    try {
      const body = activeType === 'leave'
        ? { type: 'leave', role: activeLeaveRole, stages: currentStages }
        : { type: activeType, stages: currentStages };

      const res  = await fetch(`/api/super-admin/schools/${schoolId}/workflow`, {
        method: 'POST', headers, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setSavedKey(currentKey);
      setTimeout(() => setSavedKey(''), 2500);
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  }

  const activeRegistry = WORKFLOW_REGISTRY.find(w => w.type === activeType)!;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Workflow Configuration</h1>
        <p className="text-sm text-surface-400 mt-0.5">
          Configure approval stages, initiator roles, and system triggers for each workflow. All workflows sync to school instances.
        </p>
      </div>

      {/* Workflow tabs */}
      <div className="flex gap-1 flex-wrap border-b border-surface-100 dark:border-gray-800">
        {WORKFLOW_REGISTRY.map(wf => (
          <button
            key={wf.type}
            onClick={() => setActiveType(wf.type)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
              activeType === wf.type
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-surface-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {wf.label}
          </button>
        ))}
      </div>

      {/* Workflow info bar */}
      <div className={`flex items-start gap-3 px-4 py-3 rounded-xl ${activeRegistry.color}`}>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider mb-0.5 opacity-70">
            {activeRegistry.module} Module · Initiators: {activeRegistry.initiators} · Syncs into: {activeRegistry.syncsInto}
          </p>
          <p className="text-sm">{activeRegistry.description}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0 text-[10px] font-bold uppercase tracking-wider opacity-60">
          <span className="px-2 py-1 rounded bg-white/30 dark:bg-black/20">Required</span>
          <span className="px-2 py-1 rounded bg-white/30 dark:bg-black/20">Sync</span>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Leave role selector */}
        {activeType === 'leave' && (
          <div className="w-44 shrink-0 space-y-1">
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider px-3 mb-2">Role</p>
            {LEAVE_ROLES.map(r => (
              <button
                key={r.code}
                onClick={() => setActiveLeaveRole(r.code)}
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

        {/* Stages + params editor */}
        <div className="flex-1 space-y-4 min-w-0">
          {/* Stages header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                {activeType === 'leave'
                  ? `${LEAVE_ROLES.find(r => r.code === activeLeaveRole)?.label} Leave — Approval Stages`
                  : `${activeRegistry.label} — Approval Stages`}
              </h2>
              <p className="text-xs text-surface-400 mt-0.5">
                Each stage: set who initiates, who approves, and what the system does automatically.
              </p>
            </div>
            <button onClick={addStage} className="btn btn-secondary text-sm flex-shrink-0">+ Add Stage</button>
          </div>

          {/* Hint for parent leave */}
          {activeType === 'leave' && activeLeaveRole === 'parent' && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl text-sm text-blue-700 dark:text-blue-300">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 flex-shrink-0">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Set the first approver to <strong className="mx-1">Class Teacher</strong>
              to automatically route to the student's assigned class teacher.
            </div>
          )}

          {/* Hint for query_school_admin */}
          {activeType === 'query_school_admin' && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-sm text-rose-700 dark:text-rose-300">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 flex-shrink-0">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Queries raised by School Admin reflect on the <strong className="mx-1">Super Admin portal</strong> and are handled by the internal platform support team — not school staff.
            </div>
          )}

          {/* Stages list */}
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-28 bg-surface-100 dark:bg-gray-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : currentStages.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-sm text-surface-400 dark:text-gray-500">No stages configured yet.</p>
              <button onClick={addStage} className="mt-3 btn btn-primary text-sm">Add First Stage</button>
            </div>
          ) : (
            <div className="space-y-2">
              {currentStages.map((stage, i) => (
                <StageRow
                  key={i}
                  stage={stage}
                  index={i}
                  total={currentStages.length}
                  users={users}
                  onChange={(f, v) => updateStage(i, f, v)}
                  onRemove={() => removeStage(i)}
                  onMove={dir => moveStage(i, dir)}
                />
              ))}
            </div>
          )}

          {/* Error / Save row */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex items-center gap-3 pt-2 border-t border-surface-100 dark:border-gray-700">
            <button
              onClick={save}
              disabled={saving || isLoading}
              className="btn btn-primary"
            >
              {saving ? 'Saving…' : 'Save Workflow'}
            </button>
            {savedKey === currentKey && (
              <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>
                Saved!
              </span>
            )}
            <span className="text-xs text-surface-400 ml-auto">Changes apply immediately to new requests</span>
          </div>

          {/* Parameters panel */}
          <ParamsPanel params={currentParams} />
        </div>
      </div>
    </div>
  );
}
