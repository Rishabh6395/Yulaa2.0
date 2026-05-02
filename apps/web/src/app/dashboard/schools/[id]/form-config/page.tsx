'use client';

import { useEffect, useState, useCallback } from 'react';
import { FORM_DEFINITIONS, type FieldDef } from '@/lib/formDefinitions';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FieldRule {
  visible:  boolean;
  editable: boolean;
  required: boolean;
  label:    string;
}

interface DynamicField { id: string; label: string; type: 'text' | 'dropdown'; slot: string }

const FORMS = FORM_DEFINITIONS;

const DEFAULT_RULE: FieldRule = { visible: true, editable: true, required: false, label: '' };

const TYPE_ICONS: Record<string, string> = {
  text: 'T', tel: '☎', email: '@', date: '📅', select: '▾',
  textarea: '¶', file: '📎', number: '#', dropdown: '▾',
};

type AllConfigs = Record<string, Record<string, Record<string, FieldRule>>>;

const ORG_ROLE = 'org'; // sentinel value for org-wide config

function defaultRules(fields: Array<{ id: string }>): Record<string, FieldRule> {
  return Object.fromEntries(fields.map(f => [f.id, { ...DEFAULT_RULE }]));
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function FormConfigPage({ params }: { params: { id: string } }) {
  const schoolId = params.id;

  const [activeForm,   setActiveForm]   = useState(FORMS[0].id);
  const [activeRole,   setActiveRole]   = useState(FORMS[0].roles[0].id);
  const [configScope,  setConfigScope]  = useState<'role' | 'org'>('role');
  const [configs,      setConfigs]      = useState<AllConfigs>({});
  const [dynFields,    setDynFields]    = useState<Record<string, DynamicField[]>>({});
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [syncing,      setSyncing]      = useState(false);
  const [error,        setError]        = useState('');
  const [editingLabel, setEditingLabel] = useState<string | null>(null);

  const form      = FORMS.find(f => f.id === activeForm)!;
  const allDyn    = dynFields[activeForm] ?? [];
  const allFields: Array<FieldDef | DynamicField> = [...form.fields, ...allDyn];

  // The effective role key used for save/load — either a real role id or ORG_ROLE
  const effectiveRole = configScope === 'org' ? ORG_ROLE : activeRole;

  // ── Load configs + dynamic fields ──────────────────────────────────────────

  useEffect(() => {
    setLoading(true);
    const token = localStorage.getItem('token') ?? '';
    const hdrs  = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`/api/form-config?schoolId=${schoolId}`, { headers: hdrs }).then(r => r.json()),
      fetch(`/api/masters/content-types?schoolId=${schoolId}`, { headers: hdrs }).then(r => r.json()),
    ]).then(([cfgData, ctData]) => {
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

      const cts: any[] = ctData.contentTypes ?? [];
      const byForm: Record<string, DynamicField[]> = {};
      for (const f of FORMS) {
        byForm[f.id] = cts
          .filter(ct => ct.formName === f.id && ct.isActive)
          .map(ct => ({
            id:    ct.fieldSlot,
            label: ct.label,
            type:  ct.fieldType === 'dropdown' ? 'dropdown' : 'text',
            slot:  ct.fieldSlot,
          }));
      }
      setDynFields(byForm);
    }).catch((err: unknown) => { if (process.env.NODE_ENV === 'development') console.error('[form-config]', err); }).finally(() => setLoading(false));
  }, [schoolId]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getRule = useCallback(
    (fId: string, role: string, fieldId: string): FieldRule =>
      configs[fId]?.[role]?.[fieldId] ?? { ...DEFAULT_RULE },
    [configs],
  );

  const getRules = useCallback(
    (fId: string, role: string): Record<string, FieldRule> => {
      const savedRules = configs[fId]?.[role];
      const f  = FORMS.find(x => x.id === fId)!;
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

  // ── Save ───────────────────────────────────────────────────────────────────

  async function save() {
    setSaving(true); setError('');
    try {
      const token = localStorage.getItem('token') ?? '';
      const res = await fetch('/api/form-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          schoolId,
          formId:     activeForm,
          role:       effectiveRole,
          fieldRules: currentRules,
        }),
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
      window.location.reload();
    } catch (e: any) { setError(e.message); setSyncing(false); }
  }

  const switchForm = (fId: string) => {
    setActiveForm(fId);
    setActiveRole(FORMS.find(x => x.id === fId)!.roles[0].id);
    setConfigScope('role');
    setSaved(false); setError(''); setEditingLabel(null);
  };

  const visibleCount  = allFields.filter(f => currentRules[f.id]?.visible).length;
  const editableCount = allFields.filter(f => currentRules[f.id]?.visible && currentRules[f.id]?.editable).length;
  const requiredCount = allFields.filter(f => currentRules[f.id]?.required).length;

  // All saved keys for this form (role ids + 'org' if present)
  const savedKeys     = Object.keys(configs[activeForm] ?? {});
  const savedOrgKey   = savedKeys.includes(ORG_ROLE);
  const savedRoleKeys = savedKeys.filter(k => k !== ORG_ROLE);

  // Label shown in the save button and editor header
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
            Set field visibility, edit permissions and label overrides per form — by role or organization-wide.
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
              const keys    = Object.keys(configs[f.id] ?? {});
              const orgSaved  = keys.includes(ORG_ROLE);
              const rolesSaved = keys.filter(k => k !== ORG_ROLE).length;
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
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                          Org
                        </span>
                      )}
                      {rolesSaved > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                          {rolesSaved}/{f.roles.length}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-surface-300 dark:text-gray-600">{f.module}</span>
                </button>
              );
            })}
          </div>

          {/* ── Editor panel ─────────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* ── Config scope + role selector ─────────────────────────────── */}
            <div className="card px-4 py-4 space-y-3">
              {/* Scope toggle */}
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

              {/* Role dropdown — only for role-based scope */}
              {configScope === 'role' && (
                <div>
                  <p className="text-xs text-surface-400 mb-1.5 uppercase tracking-wide font-medium">Role</p>
                  <div className="relative inline-block">
                    <select
                      value={activeRole}
                      onChange={e => { setActiveRole(e.target.value); setSaved(false); setEditingLabel(null); }}
                      className="appearance-none pl-3 pr-8 py-2 text-sm rounded-lg border border-surface-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-400 transition-colors cursor-pointer"
                    >
                      {form.roles.map(r => (
                        <option key={r.id} value={r.id}>{r.label}</option>
                      ))}
                    </select>
                    <svg
                      width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400"
                    >
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                    {/* saved indicator dot */}
                    {configs[activeForm]?.[activeRole] && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-900" />
                    )}
                  </div>

                  {/* Saved status chips for all roles */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.roles.map(r => {
                      const isSaved = !!configs[activeForm]?.[r.id];
                      const isActive = activeRole === r.id;
                      return (
                        <button
                          key={r.id}
                          onClick={() => { setActiveRole(r.id); setSaved(false); setEditingLabel(null); }}
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

              {/* Org scope info banner */}
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

            {/* Field rules editor */}
            <div className="card p-5 space-y-4">
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
                {configScope === 'org' ? (
                  <button
                    onClick={save}
                    disabled={saving}
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
                        {/* Org column */}
                        {savedOrgKey && (
                          <th className="text-center py-1.5 px-2 font-medium text-violet-500 dark:text-violet-400 whitespace-nowrap text-[10px]">
                            Org
                          </th>
                        )}
                        {/* Role columns */}
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
