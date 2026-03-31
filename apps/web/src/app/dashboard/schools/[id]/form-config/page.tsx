'use client';

import { useEffect, useState, useCallback } from 'react';

type FieldRule = 'required' | 'optional' | 'hidden';

interface FormField { id: string; label: string; type: string; note?: string }
interface RoleDef   { id: string; label: string; color: string }
interface FormDef   { id: string; label: string; description: string; fields: FormField[]; roles: RoleDef[] }

// ─── FORMS aligned with actual DB models and UI pages ─────────────────────────

const FORMS: FormDef[] = [
  {
    id: 'admission',
    label: 'Admission Form',
    description: 'Controls the public /apply page (Applicant role) and the admin "New Application" modal. Only fields that exist in the actual admission flow are listed here.',
    roles: [
      { id: 'applicant', label: 'Applicant (Public /apply)', color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/30 dark:text-violet-400' },
      { id: 'admin',     label: 'School Admin / Principal',  color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400' },
      { id: 'teacher',   label: 'Teacher',                   color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/30 dark:text-teal-400' },
    ],
    fields: [
      // Parent fields
      { id: 'parentName',       label: 'Parent / Guardian Name',  type: 'text' },
      { id: 'parentPhone',      label: 'Parent Phone',            type: 'tel' },
      { id: 'parentEmail',      label: 'Parent Email',            type: 'email' },
      { id: 'parentOccupation', label: 'Parent Occupation',       type: 'text',     note: 'Public apply form only' },
      { id: 'address',          label: 'Residential Address',     type: 'textarea', note: 'Public apply form only' },
      // Child fields
      { id: 'childName',        label: 'Child Full Name',         type: 'text' },
      { id: 'childDOB',         label: 'Child Date of Birth',     type: 'date' },
      { id: 'childGender',      label: 'Child Gender',            type: 'select',   note: 'Public apply form only' },
      { id: 'gradeApplying',    label: 'Grade Applying For',      type: 'select' },
      { id: 'bloodGroup',       label: 'Blood Group',             type: 'select',   note: 'Public apply form only' },
      { id: 'previousSchool',   label: 'Previous School',         type: 'text' },
      { id: 'medicalNotes',     label: 'Medical / Allergy Notes', type: 'textarea', note: 'Public apply form only' },
    ],
  },
  {
    id: 'student_profile',
    label: 'Student Profile',
    description: 'Controls which fields are shown when adding or editing a student record in the Students page. Fields listed here exist in the Student database model.',
    roles: [
      { id: 'admin',   label: 'School Admin / Principal', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400' },
      { id: 'teacher', label: 'Teacher',                  color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/30 dark:text-teal-400' },
    ],
    fields: [
      // Core identifiers — always visible but can be optional
      { id: 'dob',             label: 'Date of Birth',         type: 'date' },
      { id: 'gender',          label: 'Gender',                type: 'select' },
      { id: 'address',         label: 'Address',               type: 'textarea' },
      { id: 'bloodGroup',      label: 'Blood Group',           type: 'select' },
      { id: 'aadhaarNo',       label: 'Aadhaar Number',        type: 'text' },
      { id: 'emergencyContact',label: 'Emergency Contact',     type: 'tel' },
      // Parent / Guardian (linked to student record)
      { id: 'parentName',      label: 'Parent / Guardian Name', type: 'text' },
      { id: 'parentPhone',     label: 'Parent Phone',           type: 'tel' },
      { id: 'parentEmail',     label: 'Parent Email',           type: 'email' },
    ],
  },
  {
    id: 'leave_request',
    label: 'Leave Request Form',
    description: 'Controls the leave application form used by students, teachers and parents. Fields listed here exist in the LeaveRequest database model.',
    roles: [
      { id: 'admin',   label: 'School Admin / Principal', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400' },
      { id: 'teacher', label: 'Teacher',                  color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/30 dark:text-teal-400' },
      { id: 'student', label: 'Student',                  color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400' },
      { id: 'parent',  label: 'Parent',                   color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/30 dark:text-orange-400' },
    ],
    fields: [
      { id: 'leaveType',  label: 'Leave Type',   type: 'select' },
      { id: 'startDate',  label: 'From Date',    type: 'date' },
      { id: 'endDate',    label: 'To Date',      type: 'date' },
      { id: 'reason',     label: 'Reason',       type: 'textarea' },
    ],
  },
  {
    id: 'fee_payment',
    label: 'Fee Payment Form',
    description: 'Controls the payment recording form when marking a fee invoice as paid. Fields listed here exist in the FeePayment database model.',
    roles: [
      { id: 'admin',  label: 'School Admin / Principal', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400' },
      { id: 'parent', label: 'Parent',                   color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/30 dark:text-orange-400' },
    ],
    fields: [
      { id: 'paymentMode', label: 'Payment Mode',           type: 'select' },
      { id: 'referenceNo', label: 'Reference / Cheque No.', type: 'text' },
      { id: 'remarks',     label: 'Remarks / Note',         type: 'textarea' },
    ],
  },
];

const RULE_OPTIONS: { value: FieldRule; label: string; color: string }[] = [
  { value: 'required', label: 'Required', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400' },
  { value: 'optional', label: 'Optional', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400' },
  { value: 'hidden',   label: 'Hidden',   color: 'text-surface-400 bg-surface-100 dark:bg-gray-700 dark:text-gray-500' },
];

const TYPE_ICONS: Record<string, string> = {
  text: 'T', tel: '☎', email: '@', date: '📅', select: '▾', textarea: '¶', file: '📎',
};

type AllConfigs = Record<string, Record<string, Record<string, FieldRule>>>;

function defaultRules(form: FormDef): Record<string, FieldRule> {
  return Object.fromEntries(form.fields.map(f => [f.id, 'optional']));
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function FormConfigPage({ params }: { params: { id: string } }) {
  const schoolId = params.id;

  const [activeForm, setActiveForm] = useState(FORMS[0].id);
  const [activeRole, setActiveRole] = useState(FORMS[0].roles[0].id);
  const [configs,    setConfigs]    = useState<AllConfigs>({});
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [error,      setError]      = useState('');

  const form = FORMS.find(f => f.id === activeForm)!;

  const switchForm = (fId: string) => {
    setActiveForm(fId);
    const f = FORMS.find(x => x.id === fId)!;
    setActiveRole(f.roles[0].id);
    setSaved(false); setError('');
  };

  useEffect(() => {
    setLoading(true);
    fetch(`/api/form-config?schoolId=${schoolId}`)
      .then(r => r.json())
      .then(d => { setConfigs(d.configs ?? {}); setLoading(false); })
      .catch(() => setLoading(false));
  }, [schoolId]);

  const getRules = useCallback(
    (fId: string, role: string): Record<string, FieldRule> =>
      configs[fId]?.[role] ?? defaultRules(FORMS.find(x => x.id === fId)!),
    [configs],
  );

  const currentRules = getRules(activeForm, activeRole);

  function setRule(fieldId: string, rule: FieldRule) {
    setConfigs(c => ({
      ...c,
      [activeForm]: { ...c[activeForm], [activeRole]: { ...getRules(activeForm, activeRole), [fieldId]: rule } },
    }));
    setSaved(false);
  }

  function setAllRule(rule: FieldRule) {
    setConfigs(c => ({
      ...c,
      [activeForm]: { ...c[activeForm], [activeRole]: Object.fromEntries(form.fields.map(f => [f.id, rule])) },
    }));
    setSaved(false);
  }

  async function save() {
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/form-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, formId: activeForm, role: activeRole, fieldRules: currentRules }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Save failed'); }
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  const requiredCount = form.fields.filter(f => currentRules[f.id] === 'required').length;
  const hiddenCount   = form.fields.filter(f => currentRules[f.id] === 'hidden').length;
  const savedRolesForForm = Object.keys(configs[activeForm] ?? {}).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Form Configuration</h1>
        <p className="text-sm text-surface-400 mt-0.5">
          Set field visibility and validation rules per form and per role. Each form only lists fields that actually exist in that form's UI and database.
        </p>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-surface-400 text-sm">Loading configuration…</div>
      ) : (
        <div className="flex gap-6">

          {/* ── Form selector sidebar ─────────────────────────────────────── */}
          <div className="w-52 shrink-0 space-y-1">
            {FORMS.map(f => {
              const saved = Object.keys(configs[f.id] ?? {}).length;
              return (
                <button key={f.id} onClick={() => switchForm(f.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-between gap-2 ${
                    activeForm === f.id
                      ? 'bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300 font-medium'
                      : 'text-surface-400 hover:bg-surface-50 dark:hover:bg-gray-700/40'
                  }`}
                >
                  <span>{f.label}</span>
                  {saved > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shrink-0">
                      {saved}/{f.roles.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Editor panel ─────────────────────────────────────────────── */}
          <div className="flex-1 space-y-4">

            {/* Form description */}
            <div className="card px-4 py-3 flex items-start gap-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-500 mt-0.5 shrink-0">
                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
              </svg>
              <p className="text-xs text-surface-500 dark:text-gray-400 leading-relaxed">{form.description}</p>
            </div>

            {/* Role tabs */}
            <div className="card px-4 py-3">
              <p className="text-xs text-surface-400 mb-2 uppercase tracking-wide font-medium">Configure rules for role</p>
              <div className="flex flex-wrap gap-2">
                {form.roles.map(r => {
                  const hasSaved = !!configs[activeForm]?.[r.id];
                  return (
                    <button key={r.id} onClick={() => { setActiveRole(r.id); setSaved(false); }}
                      className={`relative text-xs px-3 py-1.5 rounded-lg font-medium transition-all border ${
                        activeRole === r.id
                          ? `${r.color} border-current ring-1 ring-current ring-offset-1`
                          : 'text-surface-400 border-surface-100 dark:border-gray-700 hover:border-surface-300'
                      }`}
                    >
                      {r.label}
                      {hasSaved && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500" />}
                    </button>
                  );
                })}
              </div>
              {activeRole === 'applicant' && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  These rules control the <strong>live public /apply page</strong> parents use to apply.
                </p>
              )}
            </div>

            {/* Field rules editor */}
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                    {form.label}
                    <span className="ml-2 text-xs font-normal text-surface-400">
                      · {form.roles.find(r => r.id === activeRole)?.label}
                    </span>
                  </h2>
                  <p className="text-xs text-surface-400 mt-0.5">
                    {requiredCount} required · {form.fields.length - requiredCount - hiddenCount} optional · {hiddenCount} hidden
                  </p>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {RULE_OPTIONS.map(r => (
                    <button key={r.value} onClick={() => setAllRule(r.value)}
                      className={`text-xs px-2 py-1 rounded font-medium ${r.color}`}>
                      All {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                {form.fields.map(field => {
                  const rule = currentRules[field.id] ?? 'optional';
                  return (
                    <div key={field.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <span className="w-7 text-center text-xs text-surface-300 dark:text-gray-600 font-mono shrink-0">
                        {TYPE_ICONS[field.type] || 'T'}
                      </span>
                      <span className={`flex-1 text-sm min-w-0 ${rule === 'hidden' ? 'text-surface-300 dark:text-gray-600 line-through' : 'text-gray-800 dark:text-gray-200'}`}>
                        {field.label}
                        {field.note && (
                          <span className="ml-2 text-[10px] text-surface-300 dark:text-gray-600 not-italic">({field.note})</span>
                        )}
                      </span>
                      <div className="flex gap-1 shrink-0">
                        {RULE_OPTIONS.map(r => (
                          <button key={r.value} onClick={() => setRule(field.id, r.value)}
                            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                              rule === r.value ? r.color : 'text-surface-300 dark:text-gray-600 hover:text-surface-500'
                            }`}>
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">{error}</p>
              )}

              <div className="flex items-center gap-3 pt-3 border-t border-surface-100 dark:border-gray-700">
                <button onClick={save} disabled={saving} className="btn btn-primary">
                  {saving ? 'Saving…' : `Save — ${form.roles.find(r => r.id === activeRole)?.label}`}
                </button>
                {saved && (
                  <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    Saved
                  </span>
                )}
                {savedRolesForForm > 0 && !saved && (
                  <span className="text-xs text-surface-400 ml-auto">
                    {savedRolesForForm}/{form.roles.length} roles configured
                  </span>
                )}
              </div>
            </div>

            {/* Summary matrix */}
            {savedRolesForForm > 0 && (
              <div className="card p-4">
                <p className="text-xs font-medium text-surface-400 uppercase tracking-wide mb-3">Configuration summary — all roles</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-surface-100 dark:border-gray-700">
                        <th className="text-left py-1.5 pr-4 font-medium text-surface-500 dark:text-gray-400 w-44">Field</th>
                        {form.roles.map(r => (
                          <th key={r.id} className="text-center py-1.5 px-3 font-medium text-surface-500 dark:text-gray-400 whitespace-nowrap">{r.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {form.fields.map(field => (
                        <tr key={field.id} className="border-b border-surface-50 dark:border-gray-800/50 hover:bg-surface-50 dark:hover:bg-gray-800/30">
                          <td className="py-1.5 pr-4 text-gray-700 dark:text-gray-300">{field.label}</td>
                          {form.roles.map(r => {
                            const rule = getRules(activeForm, r.id)[field.id] ?? 'optional';
                            const dot = rule === 'required' ? 'bg-emerald-500' : rule === 'optional' ? 'bg-blue-400' : 'bg-surface-200 dark:bg-gray-700';
                            return (
                              <td key={r.id} className="text-center py-1.5 px-3">
                                <span className={`inline-block w-2 h-2 rounded-full ${dot}`} title={rule} />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex items-center gap-4 mt-3 text-[10px] text-surface-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"/>Required</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block"/>Optional</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-surface-200 dark:bg-gray-700 inline-block"/>Hidden</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
