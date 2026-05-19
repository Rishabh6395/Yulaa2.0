'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { FORM_DEFINITIONS, type FieldDef } from '@/lib/formDefinitions';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FieldRule {
  visible:  boolean;
  editable: boolean;
  required: boolean;
  label:    string;
}

interface DynamicField {
  id:         string;   // fieldSlot — used as rule key
  ctId:       string;   // ContentTypeMaster DB record id
  label:      string;
  type:       string;
  slot:       string;
  options:    string[]; // for select/dropdown
}

interface NewFieldForm {
  label:     string;
  fieldType: string;
  options:   string; // comma-separated
}

const BLANK_NEW_FIELD: NewFieldForm = { label: '', fieldType: 'text', options: '' };

const FIELD_TYPES = [
  { value: 'text',     label: 'Text' },
  { value: 'email',    label: 'Email' },
  { value: 'tel',      label: 'Phone / Tel' },
  { value: 'number',   label: 'Number' },
  { value: 'date',     label: 'Date' },
  { value: 'textarea', label: 'Long Text (Textarea)' },
  { value: 'select',   label: 'Dropdown / Select' },
  { value: 'file',     label: 'File Upload' },
  { value: 'checkbox', label: 'Checkbox (Yes / No)' },
];

const MASTER_LABELS: Record<string, string> = {
  gender:        'Gender Master',
  bloodGroup:    'Blood Group Master',
  grade:         'Grade Master',
  class:         'Class Data',
  qualification: 'Qualification Master',
  examType:      'Exam Type Master',
  teacher:       'Teacher Data',
  relationship:  'Relationship Master',
};

const FORMS = FORM_DEFINITIONS;
const DEFAULT_RULE: FieldRule = { visible: true, editable: true, required: false, label: '' };
const ORG_ROLE = 'org';

const TYPE_ICONS: Record<string, string> = {
  text: 'T', tel: '☎', email: '@', date: '📅', select: '▾',
  textarea: '¶', file: '📎', number: '#', dropdown: '▾', checkbox: '☑',
};

type AllConfigs = Record<string, Record<string, Record<string, FieldRule>>>;

function defaultRules(fields: Array<{ id: string }>): Record<string, FieldRule> {
  return Object.fromEntries(fields.map(f => [f.id, { ...DEFAULT_RULE }]));
}

function slugify(label: string): string {
  return 'custom_' + label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function FormConfigPage() {
  const params   = useParams<{ id: string }>();
  const schoolId = params.id;

  const [activeForm,    setActiveForm]    = useState(FORMS[0].id);
  const [activeRole,    setActiveRole]    = useState(FORMS[0].roles[0].id);
  const [configScope,   setConfigScope]   = useState<'role' | 'org'>('role');
  const [configs,       setConfigs]       = useState<AllConfigs>({});
  const [dynFields,     setDynFields]     = useState<Record<string, DynamicField[]>>({});
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [saved,         setSaved]         = useState(false);
  const [syncing,       setSyncing]       = useState(false);
  const [error,         setError]         = useState('');
  const [editingLabel,  setEditingLabel]  = useState<string | null>(null);

  // ── Field builder state ────────────────────────────────────────────────────
  const [showAddField,  setShowAddField]  = useState(false);
  const [newField,      setNewField]      = useState<NewFieldForm>(BLANK_NEW_FIELD);
  const [fieldSaving,   setFieldSaving]   = useState(false);
  const [fieldError,    setFieldError]    = useState('');
  const [editingCtId,   setEditingCtId]   = useState<string | null>(null);
  const [editField,     setEditField]     = useState<NewFieldForm>(BLANK_NEW_FIELD);

  const form   = FORMS.find(f => f.id === activeForm)!;
  const allDyn = dynFields[activeForm] ?? [];
  const allFields: Array<FieldDef | DynamicField> = [...form.fields, ...allDyn];

  const effectiveRole = configScope === 'org' ? ORG_ROLE : activeRole;

  // ── Load configs + dynamic fields ──────────────────────────────────────────

  const loadData = useCallback(() => {
    setLoading(true);
    const token = localStorage.getItem('token') ?? '';
    const hdrs  = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`/api/form-config?schoolId=${schoolId}`, { headers: hdrs }).then(r => r.json()),
      fetch(`/api/masters/content-types?schoolId=${schoolId}&includeInactive=true`, { headers: hdrs }).then(r => r.json()),
    ]).then(([cfgData, ctData]) => {
      const raw: Record<string, Record<string, Record<string, any>>> = cfgData.configs ?? {};
      const normalised: AllConfigs = {};
      for (const [fId, roleMap] of Object.entries(raw)) {
        normalised[fId] = {};
        for (const [role, rules] of Object.entries(roleMap)) {
          normalised[fId][role] = {};
          for (const [key, val] of Object.entries(rules as Record<string, any>)) {
            if (typeof val === 'string') {
              normalised[fId][role][key] = { visible: val !== 'hidden', editable: true, required: val === 'required', label: '' };
            } else {
              normalised[fId][role][key] = { ...DEFAULT_RULE, ...(val as object) };
            }
          }
        }
      }
      setConfigs(normalised);

      const cts: any[] = ctData.contentTypes ?? [];
      const byForm: Record<string, DynamicField[]> = {};
      for (const f of FORMS) {
        byForm[f.id] = cts
          .filter(ct => ct.formName === f.id)
          .map(ct => ({
            id:      ct.fieldSlot,
            ctId:    ct.id,
            label:   ct.label,
            type:    ct.fieldType ?? 'text',
            slot:    ct.fieldSlot,
            options: ct.options ?? [],
          }));
      }
      setDynFields(byForm);
    }).catch((err: unknown) => {
      if (process.env.NODE_ENV === 'development') console.error('[form-config]', err);
    }).finally(() => setLoading(false));
  }, [schoolId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Config rule helpers ────────────────────────────────────────────────────

  const getRule = useCallback(
    (fId: string, role: string, fieldId: string): FieldRule =>
      configs[fId]?.[role]?.[fieldId] ?? { ...DEFAULT_RULE },
    [configs],
  );

  const getRules = useCallback(
    (fId: string, role: string): Record<string, FieldRule> => {
      const savedRules = configs[fId]?.[role];
      const f   = FORMS.find(x => x.id === fId)!;
      const dyn = dynFields[fId] ?? [];
      const allF = [...f.fields, ...dyn];
      if (!savedRules) return defaultRules(allF);
      const result: Record<string, FieldRule> = defaultRules(allF);
      for (const key of Object.keys(result)) {
        if (savedRules[key]) result[key] = { ...DEFAULT_RULE, ...savedRules[key] };
      }
      return result;
    },
    [configs, dynFields],
  );

  const currentRules = getRules(activeForm, effectiveRole);

  function setRuleField(fieldId: string, patch: Partial<FieldRule>) {
    setConfigs(c => ({
      ...c,
      [activeForm]: {
        ...c[activeForm],
        [effectiveRole]: {
          ...getRules(activeForm, effectiveRole),
          [fieldId]: { ...getRule(activeForm, effectiveRole, fieldId), ...patch },
        },
      },
    }));
    setSaved(false);
  }

  function setAllVisible(v: boolean) {
    const allF = [...form.fields, ...(dynFields[activeForm] ?? [])];
    setConfigs(c => ({
      ...c,
      [activeForm]: {
        ...c[activeForm],
        [effectiveRole]: Object.fromEntries(
          allF.map(f => [f.id, {
            ...getRule(activeForm, effectiveRole, f.id),
            visible:  v,
            editable: v ? getRule(activeForm, effectiveRole, f.id).editable : false,
          }]),
        ),
      },
    }));
    setSaved(false);
  }

  // ── Save field rules ───────────────────────────────────────────────────────

  async function save() {
    setSaving(true); setError('');
    try {
      const token = localStorage.getItem('token') ?? '';
      const res = await fetch('/api/form-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ schoolId, formId: activeForm, role: effectiveRole, fieldRules: currentRules }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Save failed'); }
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  // ── Add custom field ───────────────────────────────────────────────────────

  async function addCustomField() {
    if (!newField.label.trim()) { setFieldError('Field label is required'); return; }
    setFieldSaving(true); setFieldError('');
    const token = localStorage.getItem('token') ?? '';
    try {
      const fieldSlot = slugify(newField.label);
      const options   = newField.fieldType === 'select'
        ? newField.options.split(',').map(s => s.trim()).filter(Boolean)
        : [];
      const res = await fetch('/api/masters/content-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          schoolId,
          formName:  activeForm,
          fieldSlot,
          fieldType: newField.fieldType,
          label:     newField.label.trim(),
          options,
          sortOrder: (dynFields[activeForm]?.length ?? 0) + 1,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to add field');
      setNewField(BLANK_NEW_FIELD);
      setShowAddField(false);
      loadData();
    } catch (e: any) { setFieldError(e.message); }
    finally { setFieldSaving(false); }
  }

  // ── Edit custom field ──────────────────────────────────────────────────────

  function startEditField(df: DynamicField) {
    setEditingCtId(df.ctId);
    setEditField({
      label:     df.label,
      fieldType: df.type,
      options:   df.options.join(', '),
    });
    setFieldError('');
  }

  async function saveEditField() {
    if (!editingCtId) return;
    if (!editField.label.trim()) { setFieldError('Field label is required'); return; }
    setFieldSaving(true); setFieldError('');
    const token = localStorage.getItem('token') ?? '';
    try {
      const options = editField.fieldType === 'select'
        ? editField.options.split(',').map(s => s.trim()).filter(Boolean)
        : [];
      const res = await fetch('/api/masters/content-types', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: editingCtId, label: editField.label.trim(), fieldType: editField.fieldType, options }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to update field');
      setEditingCtId(null);
      loadData();
    } catch (e: any) { setFieldError(e.message); }
    finally { setFieldSaving(false); }
  }

  // ── Delete custom field ────────────────────────────────────────────────────

  async function deleteCustomField(df: DynamicField) {
    if (!confirm(`Delete field "${df.label}"? This will also remove any saved rules for this field.`)) return;
    const token = localStorage.getItem('token') ?? '';
    try {
      const res = await fetch('/api/masters/content-types', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: df.ctId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Delete failed'); }
      loadData();
    } catch (e: any) { setError(e.message); }
  }

  // ── Sync from template ─────────────────────────────────────────────────────

  async function syncFromTemplate() {
    if (!confirm('This will overwrite all form configs for this school with the Super Admin template. Continue?')) return;
    setSyncing(true); setError('');
    try {
      const token = localStorage.getItem('token') ?? '';
      const res = await fetch('/api/form-config/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ schoolId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Sync failed');
      window.location.reload();
    } catch (e: any) { setError(e.message); setSyncing(false); }
  }

  const switchForm = (fId: string) => {
    setActiveForm(fId);
    setActiveRole(FORMS.find(x => x.id === fId)!.roles[0].id);
    setConfigScope('role');
    setSaved(false); setError(''); setEditingLabel(null);
    setShowAddField(false); setEditingCtId(null); setFieldError('');
  };

  const visibleCount  = allFields.filter(f => currentRules[f.id]?.visible).length;
  const editableCount = allFields.filter(f => currentRules[f.id]?.visible && currentRules[f.id]?.editable).length;
  const requiredCount = allFields.filter(f => currentRules[f.id]?.required).length;

  const savedKeys     = Object.keys(configs[activeForm] ?? {});
  const savedOrgKey   = savedKeys.includes(ORG_ROLE);
  const savedRoleKeys = savedKeys.filter(k => k !== ORG_ROLE);

  const scopeLabel = configScope === 'org'
    ? 'Organization (School-wide)'
    : (form.roles.find(r => r.id === activeRole)?.label ?? activeRole);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Form Configuration</h1>
          <p className="text-sm text-surface-400 mt-0.5">
            Configure field visibility, permissions, labels, and add custom fields — per form, per role.
          </p>
        </div>
        <button onClick={syncFromTemplate} disabled={syncing}
          className="btn btn-secondary text-sm flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          {syncing ? 'Syncing…' : 'Sync from Template'}
        </button>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-surface-400 text-sm">Loading configuration…</div>
      ) : (
        <div className="flex gap-6">

          {/* ── Form selector sidebar ──────────────────────────────────────── */}
          <div className="w-52 shrink-0 space-y-1">
            {FORMS.map(f => {
              const keys       = Object.keys(configs[f.id] ?? {});
              const orgSaved   = keys.includes(ORG_ROLE);
              const rolesSaved = keys.filter(k => k !== ORG_ROLE).length;
              const customCnt  = (dynFields[f.id] ?? []).length;
              return (
                <button key={f.id} onClick={() => switchForm(f.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    activeForm === f.id
                      ? 'bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300 font-medium'
                      : 'text-surface-400 hover:bg-surface-50 dark:hover:bg-gray-700/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{f.label}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {orgSaved && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">Org</span>
                      )}
                      {rolesSaved > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                          {rolesSaved}/{f.roles.length}
                        </span>
                      )}
                      {customCnt > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                          +{customCnt}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-surface-300 dark:text-gray-600">{f.module}</span>
                </button>
              );
            })}
          </div>

          {/* ── Editor panel ──────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Config scope + role selector */}
            <div className="card px-4 py-4 space-y-3">
              <div>
                <p className="text-xs text-surface-400 mb-2 uppercase tracking-wide font-medium">Config Level</p>
                <div className="inline-flex rounded-lg border border-surface-200 dark:border-gray-700 overflow-hidden">
                  <button
                    onClick={() => { setConfigScope('role'); setSaved(false); setEditingLabel(null); }}
                    className={`px-4 py-2 text-xs font-medium transition-colors ${
                      configScope === 'role'
                        ? 'bg-brand-600 text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-surface-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                      </svg>
                      Role-based
                    </span>
                  </button>
                  <button
                    onClick={() => { setConfigScope('org'); setSaved(false); setEditingLabel(null); }}
                    className={`px-4 py-2 text-xs font-medium transition-colors border-l border-surface-200 dark:border-gray-700 ${
                      configScope === 'org'
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-surface-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                      </svg>
                      Organization (School-wide)
                    </span>
                  </button>
                </div>
              </div>

              {configScope === 'role' && (
                <div>
                  <p className="text-xs text-surface-400 mb-1.5 uppercase tracking-wide font-medium">Role</p>
                  <div className="relative inline-block">
                    <select
                      value={activeRole}
                      onChange={e => { setActiveRole(e.target.value); setSaved(false); setEditingLabel(null); }}
                      className="appearance-none pl-3 pr-8 py-2 text-sm rounded-lg border border-surface-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-400 transition-colors cursor-pointer"
                    >
                      {form.roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                    </select>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                    {configs[activeForm]?.[activeRole] && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-900" />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.roles.map(r => {
                      const isSaved  = !!configs[activeForm]?.[r.id];
                      const isActive = activeRole === r.id;
                      return (
                        <button key={r.id} onClick={() => { setActiveRole(r.id); setSaved(false); setEditingLabel(null); }}
                          className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                            isActive
                              ? 'bg-brand-100 dark:bg-brand-950/50 border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300 font-medium'
                              : isSaved
                                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                                : 'border-surface-200 dark:border-gray-700 text-surface-400 hover:border-surface-300'
                          }`}
                        >
                          {isSaved && !isActive && <span className="mr-0.5">✓</span>}
                          {r.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {configScope === 'org' && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-500 mt-0.5 shrink-0">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <p className="text-xs text-violet-700 dark:text-violet-400">
                    Organization-wide config applies to <strong>all users</strong> in this school, regardless of role.
                    {savedOrgKey && <span className="ml-1 text-emerald-600 dark:text-emerald-400 font-medium">✓ Saved</span>}
                  </p>
                </div>
              )}
            </div>

            {/* ── Field rules + custom field builder ──────────────────────── */}
            <div className="card p-5 space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                    {form.label}
                    <span
                      style={{ backgroundColor: configScope === 'org' ? '#7c3aed' : '#2564eb9d' }}
                      className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-md !text-white"
                    >
                      {configScope === 'org' ? 'Org-wide' : scopeLabel}
                    </span>
                  </h2>
                  <p className="text-xs text-surface-400 mt-0.5">
                    {visibleCount} visible · {editableCount} editable · {requiredCount} required
                    {allDyn.length > 0 && <span className="text-amber-500 ml-2">+{allDyn.length} custom</span>}
                  </p>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  <button onClick={() => setAllVisible(true)}
                    className="text-xs px-2 py-1 rounded font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30">
                    Show All
                  </button>
                  <button onClick={() => setAllVisible(false)}
                    className="text-xs px-2 py-1 rounded font-medium text-surface-400 bg-surface-100 dark:bg-gray-700">
                    Hide All
                  </button>
                </div>
              </div>

              {/* Standard / static fields */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-surface-300 dark:text-gray-600 mb-1.5 font-medium">
                  Standard Fields
                </p>
                <FieldList
                  fields={form.fields}
                  rules={currentRules}
                  editingLabel={editingLabel}
                  onEditLabel={setEditingLabel}
                  onRuleChange={setRuleField}
                />
              </div>

              {/* Custom fields section */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] uppercase tracking-widest text-surface-300 dark:text-gray-600 font-medium">
                    Custom Fields
                    {allDyn.length > 0 && (
                      <span className="ml-2 normal-case text-amber-500 font-semibold">{allDyn.length} added</span>
                    )}
                  </p>
                  {!showAddField && (
                    <button
                      onClick={() => { setShowAddField(true); setFieldError(''); setNewField(BLANK_NEW_FIELD); }}
                      className="flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      Add Field
                    </button>
                  )}
                </div>

                {/* Existing custom fields */}
                {allDyn.length > 0 && (
                  <div className="space-y-0.5 mb-3">
                    {allDyn.map(df => (
                      editingCtId === df.ctId
                        ? (
                          /* ── Inline edit form ── */
                          <div key={df.ctId} className="rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-950/20 p-3 space-y-2">
                            <p className="text-xs font-semibold text-brand-700 dark:text-brand-300">Edit Custom Field</p>
                            <div className="flex flex-wrap gap-2">
                              <input
                                className="flex-1 min-w-32 text-sm border border-surface-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-400"
                                placeholder="Field label"
                                value={editField.label}
                                onChange={e => setEditField(f => ({ ...f, label: e.target.value }))}
                              />
                              <select
                                value={editField.fieldType}
                                onChange={e => setEditField(f => ({ ...f, fieldType: e.target.value }))}
                                className="text-sm border border-surface-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-400"
                              >
                                {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                              </select>
                            </div>
                            {editField.fieldType === 'select' && (
                              <div>
                                <input
                                  className="w-full text-sm border border-surface-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-400"
                                  placeholder="Comma-separated options: Option A, Option B, Option C"
                                  value={editField.options}
                                  onChange={e => setEditField(f => ({ ...f, options: e.target.value }))}
                                />
                                <p className="text-[10px] text-surface-400 mt-1">Separate each option with a comma</p>
                              </div>
                            )}
                            {fieldError && <p className="text-xs text-red-500">{fieldError}</p>}
                            <div className="flex gap-2">
                              <button onClick={saveEditField} disabled={fieldSaving}
                                className="btn btn-primary text-xs py-1 px-3">
                                {fieldSaving ? 'Saving…' : 'Save'}
                              </button>
                              <button onClick={() => { setEditingCtId(null); setFieldError(''); }}
                                className="text-xs px-3 py-1 rounded-lg border border-surface-200 dark:border-gray-700 text-surface-400 hover:bg-surface-50">
                                Cancel
                              </button>
                            </div>
                          </div>
                        )
                        : (
                          /* ── Custom field row ── */
                          <div key={df.ctId}
                            className={`flex items-center gap-2 px-2.5 py-2 rounded-xl transition-colors group ${
                              !currentRules[df.id]?.visible ? 'opacity-40' : ''
                            } hover:bg-surface-50 dark:hover:bg-gray-700/30`}
                          >
                            <span className="w-5 text-center text-xs text-amber-500 font-mono shrink-0 select-none" title="Custom field">
                              {TYPE_ICONS[df.type] ?? 'T'}
                            </span>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-gray-800 dark:text-gray-200">
                                {currentRules[df.id]?.label || df.label}
                              </span>
                              <span className="ml-2 text-[10px] font-medium text-amber-500 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded-full">
                                {FIELD_TYPES.find(t => t.value === df.type)?.label ?? df.type}
                              </span>
                              {df.options.length > 0 && (
                                <span className="ml-1.5 text-[10px] text-surface-400 italic">
                                  {df.options.slice(0, 3).join(', ')}{df.options.length > 3 ? '…' : ''}
                                </span>
                              )}
                            </div>
                            {/* Field rule controls */}
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => setRuleField(df.id, { visible: !currentRules[df.id]?.visible, editable: currentRules[df.id]?.visible ? false : true })}
                                className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${
                                  currentRules[df.id]?.visible
                                    ? 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400'
                                    : 'text-surface-400 bg-surface-100 dark:bg-gray-700'
                                }`}
                              >
                                {currentRules[df.id]?.visible ? 'Visible' : 'Hidden'}
                              </button>
                              {currentRules[df.id]?.visible && (
                                <button
                                  onClick={() => setRuleField(df.id, { editable: !currentRules[df.id]?.editable })}
                                  className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${
                                    currentRules[df.id]?.editable
                                      ? 'text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400'
                                      : 'text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400'
                                  }`}
                                >
                                  {currentRules[df.id]?.editable ? 'Editable' : 'View-only'}
                                </button>
                              )}
                              {currentRules[df.id]?.visible && currentRules[df.id]?.editable && (
                                <button
                                  onClick={() => setRuleField(df.id, { required: !currentRules[df.id]?.required })}
                                  className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${
                                    currentRules[df.id]?.required
                                      ? 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400'
                                      : 'text-surface-300 dark:text-gray-600 hover:text-surface-500'
                                  }`}
                                >
                                  {currentRules[df.id]?.required ? 'Required' : 'Optional'}
                                </button>
                              )}
                              {/* Edit / Delete actions */}
                              <button
                                onClick={() => startEditField(df)}
                                title="Edit field"
                                className="opacity-0 group-hover:opacity-100 text-surface-300 dark:text-gray-600 hover:text-brand-500 transition-all"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                              </button>
                              <button
                                onClick={() => deleteCustomField(df)}
                                title="Delete field"
                                className="opacity-0 group-hover:opacity-100 text-surface-300 dark:text-gray-600 hover:text-red-500 transition-all"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                                  <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                        )
                    ))}
                  </div>
                )}

                {/* Add custom field inline form */}
                {showAddField ? (
                  <div className="rounded-xl border border-dashed border-brand-300 dark:border-brand-700 bg-brand-50/50 dark:bg-brand-950/10 p-4 space-y-3">
                    <p className="text-xs font-semibold text-brand-700 dark:text-brand-300 flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      New Custom Field — {form.label}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <input
                        autoFocus
                        className="flex-1 min-w-40 text-sm border border-surface-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-400"
                        placeholder="Field label (e.g. Emergency Contact Name)"
                        value={newField.label}
                        onChange={e => setNewField(f => ({ ...f, label: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') addCustomField(); }}
                      />
                      <select
                        value={newField.fieldType}
                        onChange={e => setNewField(f => ({ ...f, fieldType: e.target.value }))}
                        className="text-sm border border-surface-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-400"
                      >
                        {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    {newField.fieldType === 'select' && (
                      <div>
                        <input
                          className="w-full text-sm border border-surface-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-400"
                          placeholder="Comma-separated options: Option A, Option B, Option C"
                          value={newField.options}
                          onChange={e => setNewField(f => ({ ...f, options: e.target.value }))}
                        />
                        <p className="text-[10px] text-surface-400 mt-1">Separate each option with a comma</p>
                      </div>
                    )}
                    {fieldError && (
                      <p className="text-xs text-red-500 dark:text-red-400">{fieldError}</p>
                    )}
                    <div className="flex gap-2">
                      <button onClick={addCustomField} disabled={fieldSaving || !newField.label.trim()}
                        className="btn btn-primary text-xs py-1.5 px-4">
                        {fieldSaving ? 'Adding…' : 'Add Field'}
                      </button>
                      <button
                        onClick={() => { setShowAddField(false); setFieldError(''); setNewField(BLANK_NEW_FIELD); }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-surface-200 dark:border-gray-700 text-surface-400 hover:bg-surface-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : allDyn.length === 0 && (
                  <button
                    onClick={() => { setShowAddField(true); setFieldError(''); }}
                    className="w-full py-3 rounded-xl border border-dashed border-surface-200 dark:border-gray-700 text-xs text-surface-400 hover:border-brand-300 hover:text-brand-500 dark:hover:border-brand-700 dark:hover:text-brand-400 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Add a custom field to this form
                  </button>
                )}
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">{error}</p>
              )}

              <div className="flex items-center gap-3 pt-3 border-t border-surface-100 dark:border-gray-700">
                {configScope === 'org' ? (
                  <button onClick={save} disabled={saving}
                    style={{ backgroundColor: '#7c3aed', color: '#ffffff' }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-violet-700 hover:opacity-90 disabled:opacity-60 transition-opacity"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                    </svg>
                    {saving ? 'Saving…' : 'Save Org Config'}
                  </button>
                ) : (
                  <button onClick={save} disabled={saving} className="btn btn-primary">
                    {saving ? 'Saving…' : `Save — ${scopeLabel}`}
                  </button>
                )}
                {saved && (
                  <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    Saved
                  </span>
                )}
                <span className="text-xs text-surface-400 ml-auto">
                  {savedRoleKeys.length > 0 && `${savedRoleKeys.length}/${form.roles.length} roles`}
                  {savedRoleKeys.length > 0 && savedOrgKey && ' · '}
                  {savedOrgKey && <span className="text-violet-500">Org config saved</span>}
                </span>
              </div>
            </div>

            {/* Summary matrix */}
            {(savedRoleKeys.length > 0 || savedOrgKey) && (
              <div className="card p-4">
                <p className="text-xs font-medium text-surface-400 uppercase tracking-wide mb-3">Summary — all configurations</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-surface-100 dark:border-gray-700">
                        <th className="text-left py-1.5 pr-4 font-medium text-surface-500 dark:text-gray-400 w-44">Field</th>
                        {savedOrgKey && (
                          <th className="text-center py-1.5 px-2 font-medium text-violet-500 dark:text-violet-400 whitespace-nowrap text-[10px]">Org</th>
                        )}
                        {form.roles.map(r => (
                          <th key={r.id} className="text-center py-1.5 px-2 font-medium text-surface-500 dark:text-gray-400 whitespace-nowrap text-[10px]">
                            {r.label.split(' ')[0]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {allFields.map(field => (
                        <tr key={field.id} className="border-b border-surface-50 dark:border-gray-800/50">
                          <td className="py-1.5 pr-4 text-gray-700 dark:text-gray-300 truncate max-w-[11rem]">
                            {field.label}
                            {'ctId' in field && (
                              <span className="ml-1 text-[9px] text-amber-500 font-medium">custom</span>
                            )}
                          </td>
                          {savedOrgKey && (
                            <td className="text-center py-1.5 px-2">
                              <SummaryDot rule={getRules(activeForm, ORG_ROLE)[field.id] ?? DEFAULT_RULE} />
                            </td>
                          )}
                          {form.roles.map(r => (
                            <td key={r.id} className="text-center py-1.5 px-2">
                              <SummaryDot rule={getRules(activeForm, r.id)[field.id] ?? DEFAULT_RULE} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[10px] text-surface-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"/>Visible + Editable</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block"/>Visible + View-only</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-surface-200 dark:bg-gray-700 inline-block"/>Hidden</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"/>Required</span>
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

// ─── FieldList — standard fields with master lock indicator ───────────────────

function FieldList({
  fields, rules, editingLabel, onEditLabel, onRuleChange,
}: {
  fields: Array<FieldDef>;
  rules:  Record<string, FieldRule>;
  editingLabel: string | null;
  onEditLabel:  (id: string | null) => void;
  onRuleChange: (fieldId: string, patch: Partial<FieldRule>) => void;
}) {
  return (
    <div className="space-y-0.5">
      {fields.map(field => {
        const rule      = rules[field.id] ?? DEFAULT_RULE;
        const isEditing = editingLabel === field.id;
        const locked    = !!field.fromMaster;

        return (
          <div key={field.id}
            className={`flex items-center gap-2 px-2.5 py-2 rounded-xl transition-colors ${
              !rule.visible ? 'opacity-40' : ''
            } hover:bg-surface-50 dark:hover:bg-gray-700/30`}
          >
            {/* Type icon */}
            <span className="w-5 text-center text-xs text-surface-300 dark:text-gray-600 font-mono shrink-0">
              {TYPE_ICONS[field.type] ?? 'T'}
            </span>

            {/* Label */}
            <div className="flex-1 min-w-0 flex items-center gap-1.5">
              {isEditing ? (
                <input
                  autoFocus
                  className="flex-1 text-sm border border-brand-300 dark:border-brand-700 rounded px-1.5 py-0.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  value={rule.label || field.label}
                  onChange={e => onRuleChange(field.id, { label: e.target.value })}
                  onBlur={() => onEditLabel(null)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') onEditLabel(null); }}
                  placeholder={field.label}
                />
              ) : (
                <button className="text-left" onClick={() => onEditLabel(field.id)} title="Click to edit label">
                  <span className={`text-sm ${rule.visible ? 'text-gray-800 dark:text-gray-200' : 'line-through text-surface-300 dark:text-gray-600'}`}>
                    {rule.label || field.label}
                  </span>
                  {rule.label && rule.label !== field.label && (
                    <span className="ml-1.5 text-[10px] text-brand-400 italic">custom label</span>
                  )}
                </button>
              )}
              {/* Master-linked lock badge */}
              {locked && (
                <span
                  className="shrink-0 flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                  title={`Options come from ${MASTER_LABELS[field.fromMaster!] ?? field.fromMaster} — field type cannot be changed`}
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                  {MASTER_LABELS[field.fromMaster!] ?? field.fromMaster}
                </span>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onRuleChange(field.id, { visible: !rule.visible, editable: rule.visible ? false : rule.editable })}
                title={rule.visible ? 'Hide field' : 'Show field'}
                className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${
                  rule.visible
                    ? 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'text-surface-400 bg-surface-100 dark:bg-gray-700'
                }`}
              >
                {rule.visible ? 'Visible' : 'Hidden'}
              </button>
              {rule.visible && (
                <button
                  onClick={() => onRuleChange(field.id, { editable: !rule.editable })}
                  className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${
                    rule.editable
                      ? 'text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}
                >
                  {rule.editable ? 'Editable' : 'View-only'}
                </button>
              )}
              {rule.visible && rule.editable && (
                <button
                  onClick={() => onRuleChange(field.id, { required: !rule.required })}
                  className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${
                    rule.required
                      ? 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400'
                      : 'text-surface-300 dark:text-gray-600 hover:text-surface-500'
                  }`}
                >
                  {rule.required ? 'Required' : 'Optional'}
                </button>
              )}
              <button
                onClick={() => onEditLabel(isEditing ? null : field.id)}
                title="Edit label"
                className="text-surface-300 dark:text-gray-600 hover:text-brand-500 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Summary dot ───────────────────────────────────────────────────────────────

function SummaryDot({ rule }: { rule: FieldRule }) {
  if (!rule.visible)  return <span className="inline-block w-2 h-2 rounded-full bg-surface-200 dark:bg-gray-700" title="Hidden" />;
  if (rule.required)  return <span className="inline-block w-2 h-2 rounded-full bg-red-400" title="Required" />;
  if (rule.editable)  return <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" title="Visible + Editable" />;
  return                     <span className="inline-block w-2 h-2 rounded-full bg-blue-400" title="View-only" />;
}
