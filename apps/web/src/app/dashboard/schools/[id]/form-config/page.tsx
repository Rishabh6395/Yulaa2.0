'use client';

import { useEffect, useState, useCallback } from 'react';
import { FORM_DEFINITIONS } from '@/lib/formDefinitions';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FieldRule {
  visible:  boolean;
  editable: boolean;
  required: boolean;
  label:    string;
}

interface DynamicField { id: string; label: string; type: 'text' | 'dropdown'; slot: string }

// Use shared definitions — single source of truth
const FORMS = FORM_DEFINITIONS;

const DEFAULT_RULE: FieldRule = { visible: true, editable: true, required: false, label: '' };

const TYPE_ICONS: Record<string, string> = {
  text: 'T', tel: '☎', email: '@', date: '📅', select: '▾',
  textarea: '¶', file: '📎', number: '#', dropdown: '▾',
};

type AllConfigs = Record<string, Record<string, Record<string, FieldRule>>>;

function defaultRules(fields: Array<{ id: string }>): Record<string, FieldRule> {
  return Object.fromEntries(fields.map(f => [f.id, { ...DEFAULT_RULE }]));
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function FormConfigPage({ params }: { params: { id: string } }) {
  const schoolId = params.id;

  const [activeForm,    setActiveForm]    = useState(FORMS[0].id);
  const [activeRole,    setActiveRole]    = useState(FORMS[0].roles[0].id);
  const [configs,       setConfigs]       = useState<AllConfigs>({});
  const [dynFields,     setDynFields]     = useState<Record<string, DynamicField[]>>({}); // formId → extra fields
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [saved,         setSaved]         = useState(false);
  const [syncing,       setSyncing]       = useState(false);
  const [error,         setError]         = useState('');
  const [editingLabel,  setEditingLabel]  = useState<string | null>(null); // fieldId being edited

  const form    = FORMS.find(f => f.id === activeForm)!;
  const allDyn  = dynFields[activeForm] ?? [];
  const allFields: Array<StaticField | DynamicField> = [...form.fields, ...allDyn];

  // ── Load configs + dynamic fields ──────────────────────────────────────────

  useEffect(() => {
    setLoading(true);
    const token = localStorage.getItem('token') ?? '';
    const hdrs  = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`/api/form-config?schoolId=${schoolId}`, { headers: hdrs }).then(r => r.json()),
      fetch(`/api/masters/content-types?schoolId=${schoolId}`, { headers: hdrs }).then(r => r.json()),
    ]).then(([cfgData, ctData]) => {
      // ── Form configs: normalise legacy string → object format ─────────────
      const raw: Record<string, Record<string, Record<string, any>>> = cfgData.configs ?? {};
      const normalised: AllConfigs = {};
      for (const [fId, roleMap] of Object.entries(raw)) {
        normalised[fId] = {};
        for (const [role, rules] of Object.entries(roleMap)) {
          normalised[fId][role] = {};
          for (const [key, val] of Object.entries(rules as Record<string, any>)) {
            if (typeof val === 'string') {
              normalised[fId][role][key] = {
                visible:  val !== 'hidden',
                editable: true,
                required: val === 'required',
                label:    '',
              };
            } else {
              normalised[fId][role][key] = { ...DEFAULT_RULE, ...(val as object) };
            }
          }
        }
      }
      setConfigs(normalised);

      // ── Dynamic fields: group by formName ─────────────────────────────────
      const cts: any[] = ctData.contentTypes ?? [];
      const byForm: Record<string, DynamicField[]> = {};
      for (const form of FORMS) {
        byForm[form.id] = cts
          .filter(ct => ct.formName === form.id && ct.isActive)
          .map(ct => ({
            id:    ct.fieldSlot,
            label: ct.label,
            type:  ct.fieldType === 'dropdown' ? 'dropdown' : 'text',
            slot:  ct.fieldSlot,
          }));
      }
      setDynFields(byForm);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [schoolId]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getRule = useCallback(
    (fId: string, role: string, fieldId: string): FieldRule =>
      configs[fId]?.[role]?.[fieldId] ?? { ...DEFAULT_RULE },
    [configs],
  );

  const getRules = useCallback(
    (fId: string, role: string): Record<string, FieldRule> => {
      const saved = configs[fId]?.[role];
      const f = FORMS.find(x => x.id === fId)!;
      const dyn = dynFields[fId] ?? [];
      const allF = [...f.fields, ...dyn];
      if (!saved) return defaultRules(allF);
      const result: Record<string, FieldRule> = defaultRules(allF);
      for (const key of Object.keys(result)) {
        if (saved[key]) result[key] = { ...DEFAULT_RULE, ...saved[key] };
      }
      return result;
    },
    [configs, dynFields],
  );

  const currentRules = getRules(activeForm, activeRole);

  function setRuleField(fieldId: string, patch: Partial<FieldRule>) {
    setConfigs(c => ({
      ...c,
      [activeForm]: {
        ...c[activeForm],
        [activeRole]: {
          ...getRules(activeForm, activeRole),
          [fieldId]: { ...getRule(activeForm, activeRole, fieldId), ...patch },
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
        [activeRole]: Object.fromEntries(
          allF.map(f => [f.id, { ...getRule(activeForm, activeRole, f.id), visible: v, editable: v ? getRule(activeForm, activeRole, f.id).editable : false }]),
        ),
      },
    }));
    setSaved(false);
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function save() {
    setSaving(true); setError('');
    try {
      const token = localStorage.getItem('token') ?? '';
      const res = await fetch('/api/form-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ schoolId, formId: activeForm, role: activeRole, fieldRules: currentRules }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Save failed'); }
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
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
      // Reload page to reflect synced configs
      window.location.reload();
    } catch (e: any) { setError(e.message); setSyncing(false); }
  }

  const switchForm = (fId: string) => {
    setActiveForm(fId);
    setActiveRole(FORMS.find(x => x.id === fId)!.roles[0].id);
    setSaved(false); setError(''); setEditingLabel(null);
  };

  const visibleCount  = allFields.filter(f => currentRules[f.id]?.visible).length;
  const editableCount = allFields.filter(f => currentRules[f.id]?.visible && currentRules[f.id]?.editable).length;
  const requiredCount = allFields.filter(f => currentRules[f.id]?.required).length;
  const savedRolesForForm = Object.keys(configs[activeForm] ?? {}).length;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Form Configuration</h1>
          <p className="text-sm text-surface-400 mt-0.5">
            Set field visibility, edit permissions and label overrides per form and per role.
          </p>
        </div>
        <button
          onClick={syncFromTemplate}
          disabled={syncing}
          className="btn btn-secondary text-sm flex items-center gap-1.5"
        >
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

          {/* ── Form selector sidebar ───────────────────────────────────────── */}
          <div className="w-52 shrink-0 space-y-1">
            {FORMS.map(f => {
              const savedCount = Object.keys(configs[f.id] ?? {}).length;
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
                    {savedCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shrink-0">
                        {savedCount}/{f.roles.length}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-surface-300 dark:text-gray-600">{f.module}</span>
                </button>
              );
            })}
          </div>

          {/* ── Editor panel ─────────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Role tabs */}
            <div className="card px-4 py-3">
              <p className="text-xs text-surface-400 mb-2 uppercase tracking-wide font-medium">Role</p>
              <div className="flex flex-wrap gap-2">
                {form.roles.map(r => {
                  const hasSaved = !!configs[activeForm]?.[r.id];
                  return (
                    <button key={r.id} onClick={() => { setActiveRole(r.id); setSaved(false); setEditingLabel(null); }}
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
                    {visibleCount} visible · {editableCount} editable · {requiredCount} required
                    {allDyn.length > 0 && <span className="text-brand-500 ml-2">+{allDyn.length} custom fields</span>}
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

              {/* Static fields */}
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

              {/* Dynamic additional fields */}
              {allDyn.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-surface-300 dark:text-gray-600 mb-1.5 font-medium">
                    Additional Fields (Content Type Master)
                  </p>
                  <FieldList
                    fields={allDyn}
                    rules={currentRules}
                    editingLabel={editingLabel}
                    onEditLabel={setEditingLabel}
                    onRuleChange={setRuleField}
                  />
                </div>
              )}

              {allDyn.length === 0 && (
                <p className="text-xs text-surface-300 dark:text-gray-600 italic pt-1">
                  No custom fields defined yet. Add them via Masters → Content Types.
                </p>
              )}

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
                <p className="text-xs font-medium text-surface-400 uppercase tracking-wide mb-3">Summary — all roles</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-surface-100 dark:border-gray-700">
                        <th className="text-left py-1.5 pr-4 font-medium text-surface-500 dark:text-gray-400 w-44">Field</th>
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
                          </td>
                          {form.roles.map(r => {
                            const rule = getRules(activeForm, r.id)[field.id] ?? DEFAULT_RULE;
                            return (
                              <td key={r.id} className="text-center py-1.5 px-2">
                                <SummaryDot rule={rule} />
                              </td>
                            );
                          })}
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

// ─── Field list component ──────────────────────────────────────────────────────

function FieldList({
  fields, rules, editingLabel, onEditLabel, onRuleChange,
}: {
  fields: Array<{ id: string; label: string; type: string }>;
  rules: Record<string, FieldRule>;
  editingLabel: string | null;
  onEditLabel: (id: string | null) => void;
  onRuleChange: (fieldId: string, patch: Partial<FieldRule>) => void;
}) {
  return (
    <div className="space-y-0.5">
      {fields.map(field => {
        const rule = rules[field.id] ?? DEFAULT_RULE;
        const isEditing = editingLabel === field.id;

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

            {/* Label (clickable to edit) */}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <input
                  autoFocus
                  className="w-full text-sm border border-brand-300 dark:border-brand-700 rounded px-1.5 py-0.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  value={rule.label || field.label}
                  onChange={e => onRuleChange(field.id, { label: e.target.value })}
                  onBlur={() => onEditLabel(null)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') onEditLabel(null); }}
                  placeholder={field.label}
                />
              ) : (
                <button
                  className="text-left w-full"
                  onClick={() => onEditLabel(field.id)}
                  title="Click to edit label"
                >
                  <span className={`text-sm ${rule.visible ? 'text-gray-800 dark:text-gray-200' : 'line-through text-surface-300 dark:text-gray-600'}`}>
                    {rule.label || field.label}
                  </span>
                  {rule.label && rule.label !== field.label && (
                    <span className="ml-1.5 text-[10px] text-brand-400 italic">custom</span>
                  )}
                </button>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Visible toggle */}
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

              {/* Editable toggle (only when visible) */}
              {rule.visible && (
                <button
                  onClick={() => onRuleChange(field.id, { editable: !rule.editable })}
                  title={rule.editable ? 'Switch to view-only' : 'Switch to editable'}
                  className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${
                    rule.editable
                      ? 'text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}
                >
                  {rule.editable ? 'Editable' : 'View-only'}
                </button>
              )}

              {/* Required toggle (only when visible + editable) */}
              {rule.visible && rule.editable && (
                <button
                  onClick={() => onRuleChange(field.id, { required: !rule.required })}
                  title={rule.required ? 'Mark optional' : 'Mark required'}
                  className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${
                    rule.required
                      ? 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400'
                      : 'text-surface-300 dark:text-gray-600 hover:text-surface-500'
                  }`}
                >
                  {rule.required ? 'Required' : 'Optional'}
                </button>
              )}

              {/* Edit label pencil icon */}
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

// ─── Summary dot ──────────────────────────────────────────────────────────────

function SummaryDot({ rule }: { rule: FieldRule }) {
  if (!rule.visible)   return <span className="inline-block w-2 h-2 rounded-full bg-surface-200 dark:bg-gray-700" title="Hidden" />;
  if (rule.required)   return <span className="inline-block w-2 h-2 rounded-full bg-red-400" title="Required" />;
  if (rule.editable)   return <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" title="Visible + Editable" />;
  return                      <span className="inline-block w-2 h-2 rounded-full bg-blue-400" title="View-only" />;
}
