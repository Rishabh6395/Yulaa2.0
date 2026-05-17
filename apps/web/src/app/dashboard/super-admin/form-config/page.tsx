'use client';
import { useEffect, useState, useCallback } from 'react';
import { FORM_DEFINITIONS, type FieldDef } from '@/lib/formDefinitions';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DynamicField {
  id:      string;
  ctId:    string;
  label:   string;
  type:    string;
  slot:    string;
  options: string[];
}

interface NewFieldForm {
  label:     string;
  fieldType: string;
  options:   string;
}

const BLANK: NewFieldForm = { label: '', fieldType: 'text', options: '' };

const FIELD_TYPES = [
  { value: 'text',      label: 'Text',                   icon: 'T'  },
  { value: 'email',     label: 'Email',                  icon: '@'  },
  { value: 'tel',       label: 'Phone / Tel',            icon: '☎'  },
  { value: 'number',    label: 'Number',                 icon: '#'  },
  { value: 'date',      label: 'Date',                   icon: '📅' },
  { value: 'textarea',  label: 'Long Text (Textarea)',   icon: '¶'  },
  { value: 'select',    label: 'Dropdown / Select',      icon: '▾'  },
  { value: 'file',      label: 'File Attachment',        icon: '📎' },
  { value: 'image',     label: 'Image Upload',           icon: '🖼' },
  { value: 'checkbox',  label: 'Checkbox (Yes / No)',    icon: '☑'  },
];

const TYPE_ICON: Record<string, string> = Object.fromEntries(
  FIELD_TYPES.map(t => [t.value, t.icon]),
);

const TYPE_LABEL: Record<string, string> = Object.fromEntries(
  FIELD_TYPES.map(t => [t.value, t.label]),
);

const FORMS = FORM_DEFINITIONS;

function slugify(label: string) {
  return 'custom_' + label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function SuperAdminFormConfigPage() {
  const [defaultSchoolId, setDefaultSchoolId] = useState<string | null>(null);
  const [loadingSchool,   setLoadingSchool]   = useState(true);
  const [schoolError,     setSchoolError]     = useState('');

  const [activeForm,    setActiveForm]    = useState(FORMS[0].id);
  const [dynFields,     setDynFields]     = useState<Record<string, DynamicField[]>>({});
  const [loading,       setLoading]       = useState(false);

  const [showAdd,       setShowAdd]       = useState(false);
  const [newField,      setNewField]      = useState<NewFieldForm>(BLANK);
  const [fieldSaving,   setFieldSaving]   = useState(false);
  const [fieldError,    setFieldError]    = useState('');

  const [editingCtId,   setEditingCtId]   = useState<string | null>(null);
  const [editField,     setEditField]     = useState<NewFieldForm>(BLANK);

  const [syncing,       setSyncing]       = useState(false);
  const [syncResult,    setSyncResult]    = useState('');
  const [pageError,     setPageError]     = useState('');

  const token = typeof window !== 'undefined' ? (localStorage.getItem('token') ?? '') : '';
  const hdrs  = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // ── Resolve default school ─────────────────────────────────────────────────

  useEffect(() => {
    setLoadingSchool(true);
    fetch('/api/super-admin/schools', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const schools: any[] = d.schools ?? [];
        const def = schools.find((s: any) => s.isDefault || s.is_default);
        if (!def) { setSchoolError('No default school found. Please set a default school first.'); return; }
        setDefaultSchoolId(def.id);
      })
      .catch(() => setSchoolError('Failed to load schools.'))
      .finally(() => setLoadingSchool(false));
  }, []);

  // ── Load custom fields ─────────────────────────────────────────────────────

  const loadFields = useCallback(() => {
    if (!defaultSchoolId) return;
    setLoading(true);
    fetch(`/api/masters/content-types?schoolId=${defaultSchoolId}&includeInactive=true`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const cts: any[] = d.contentTypes ?? [];
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
      })
      .catch(() => setPageError('Failed to load fields.'))
      .finally(() => setLoading(false));
  }, [defaultSchoolId]);

  useEffect(() => { loadFields(); }, [loadFields]);

  const form    = FORMS.find(f => f.id === activeForm)!;
  const allDyn  = dynFields[activeForm] ?? [];

  // ── Add field ──────────────────────────────────────────────────────────────

  async function addField() {
    if (!newField.label.trim()) { setFieldError('Field label is required'); return; }
    setFieldSaving(true); setFieldError('');
    try {
      const fieldSlot = slugify(newField.label);
      const options   = newField.fieldType === 'select'
        ? newField.options.split(',').map(s => s.trim()).filter(Boolean)
        : [];
      const res = await fetch('/api/masters/content-types', {
        method: 'POST', headers: hdrs,
        body: JSON.stringify({
          schoolId:  defaultSchoolId,
          formName:  activeForm,
          fieldSlot,
          fieldType: newField.fieldType,
          label:     newField.label.trim(),
          options,
          sortOrder: allDyn.length + 1,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to add field');
      setNewField(BLANK); setShowAdd(false);
      loadFields();
    } catch (e: any) { setFieldError(e.message); }
    finally { setFieldSaving(false); }
  }

  // ── Edit field ─────────────────────────────────────────────────────────────

  function startEdit(df: DynamicField) {
    setEditingCtId(df.ctId);
    setEditField({ label: df.label, fieldType: df.type, options: df.options.join(', ') });
    setFieldError('');
  }

  async function saveEdit() {
    if (!editingCtId || !editField.label.trim()) { setFieldError('Field label is required'); return; }
    setFieldSaving(true); setFieldError('');
    try {
      const options = editField.fieldType === 'select'
        ? editField.options.split(',').map(s => s.trim()).filter(Boolean)
        : [];
      const res = await fetch('/api/masters/content-types', {
        method: 'PATCH', headers: hdrs,
        body: JSON.stringify({ id: editingCtId, label: editField.label.trim(), fieldType: editField.fieldType, options }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to update');
      setEditingCtId(null);
      loadFields();
    } catch (e: any) { setFieldError(e.message); }
    finally { setFieldSaving(false); }
  }

  // ── Delete field ───────────────────────────────────────────────────────────

  async function deleteField(df: DynamicField) {
    if (!confirm(`Delete field "${df.label}"?`)) return;
    try {
      const res = await fetch('/api/masters/content-types', {
        method: 'DELETE', headers: hdrs,
        body: JSON.stringify({ id: df.ctId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Delete failed'); }
      loadFields();
    } catch (e: any) { setPageError(e.message); }
  }

  // ── Push template to all schools ───────────────────────────────────────────

  async function pushToAllSchools() {
    if (!confirm('Push these custom fields + form configs to ALL schools as the default template?')) return;
    setSyncing(true); setSyncResult(''); setPageError('');
    try {
      const schoolsRes = await fetch('/api/super-admin/schools', { headers: { Authorization: `Bearer ${token}` } });
      const schoolsData = await schoolsRes.json();
      const schools: any[] = (schoolsData.schools ?? []).filter((s: any) => !s.isDefault && !s.is_default);

      let pushed = 0;
      for (const school of schools) {
        const res = await fetch('/api/form-config/sync', {
          method: 'POST', headers: hdrs,
          body: JSON.stringify({ schoolId: school.id }),
        });
        if (res.ok) pushed++;
      }
      setSyncResult(`Template pushed to ${pushed} / ${schools.length} schools.`);
    } catch (e: any) { setPageError(e.message); }
    finally { setSyncing(false); }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loadingSchool) {
    return <div className="card p-8 text-center text-surface-400 text-sm">Loading default school…</div>;
  }

  if (schoolError) {
    return (
      <div className="card p-8 text-center text-red-500 text-sm">
        {schoolError}
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Form Configuration</h1>
          <p className="text-sm text-surface-400 mt-0.5">
            Manage custom fields on the default template — push to all schools when ready.
          </p>
        </div>
        <button
          onClick={pushToAllSchools}
          disabled={syncing}
          className="btn btn-primary flex items-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          {syncing ? 'Pushing…' : 'Push to All Schools'}
        </button>
      </div>

      {syncResult && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-700 dark:text-emerald-400">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          {syncResult}
        </div>
      )}
      {pageError && (
        <div className="px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
          {pageError}
        </div>
      )}

      <div className="flex gap-6">

        {/* ── Form selector sidebar ──────────────────────────────────────── */}
        <div className="w-52 shrink-0 space-y-1">
          {FORMS.map(f => {
            const cnt = (dynFields[f.id] ?? []).length;
            return (
              <button
                key={f.id}
                onClick={() => { setActiveForm(f.id); setShowAdd(false); setEditingCtId(null); setFieldError(''); }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  activeForm === f.id
                    ? 'bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300 font-medium'
                    : 'text-surface-400 hover:bg-surface-50 dark:hover:bg-gray-700/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{f.label}</span>
                  {cnt > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 shrink-0">
                      +{cnt}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-surface-300 dark:text-gray-600">{f.module}</span>
              </button>
            );
          })}
        </div>

        {/* ── Editor panel ──────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Standard fields reference */}
          <div className="card p-5 space-y-3">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">{form.label}</h2>
              <p className="text-xs text-surface-400 mt-0.5">Standard built-in fields (read-only)</p>
            </div>
            <div className="space-y-0.5">
              {form.fields.map(field => (
                <div key={field.id}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-50 dark:bg-gray-800/40"
                >
                  <span className="w-5 text-center text-xs text-surface-300 dark:text-gray-600 font-mono shrink-0">
                    {TYPE_ICON[field.type] ?? 'T'}
                  </span>
                  <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{field.label}</span>
                  <span className="text-[10px] text-surface-400 dark:text-gray-500">
                    {TYPE_LABEL[field.type] ?? field.type}
                  </span>
                  {field.fromMaster && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center gap-0.5">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                      </svg>
                      master
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Custom fields */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                  Custom Fields
                  {allDyn.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-amber-500">{allDyn.length} added</span>
                  )}
                </h2>
                <p className="text-xs text-surface-400 mt-0.5">Extra fields added to this form template</p>
              </div>
              {!showAdd && !editingCtId && (
                <button
                  onClick={() => { setShowAdd(true); setFieldError(''); setNewField(BLANK); }}
                  className="flex items-center gap-1.5 text-sm font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add Field
                </button>
              )}
            </div>

            {loading ? (
              <p className="text-xs text-surface-400 py-4 text-center">Loading fields…</p>
            ) : (
              <>
                {/* Existing custom fields */}
                {allDyn.length > 0 && (
                  <div className="space-y-1.5">
                    {allDyn.map(df => (
                      editingCtId === df.ctId ? (
                        <div key={df.ctId} className="rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-950/20 p-4 space-y-3">
                          <p className="text-xs font-semibold text-brand-700 dark:text-brand-300">Edit Field</p>
                          <div className="flex flex-wrap gap-2">
                            <input
                              autoFocus
                              className="flex-1 min-w-40 text-sm border border-surface-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-400"
                              placeholder="Field label"
                              value={editField.label}
                              onChange={e => setEditField(f => ({ ...f, label: e.target.value }))}
                            />
                            <select
                              value={editField.fieldType}
                              onChange={e => setEditField(f => ({ ...f, fieldType: e.target.value }))}
                              className="text-sm border border-surface-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-400"
                            >
                              {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                            </select>
                          </div>
                          {editField.fieldType === 'select' && (
                            <div>
                              <input
                                className="w-full text-sm border border-surface-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-400"
                                placeholder="Option A, Option B, Option C"
                                value={editField.options}
                                onChange={e => setEditField(f => ({ ...f, options: e.target.value }))}
                              />
                              <p className="text-[10px] text-surface-400 mt-1">Separate options with a comma</p>
                            </div>
                          )}
                          {fieldError && <p className="text-xs text-red-500">{fieldError}</p>}
                          <div className="flex gap-2">
                            <button onClick={saveEdit} disabled={fieldSaving} className="btn btn-primary text-xs py-1 px-3">
                              {fieldSaving ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              onClick={() => { setEditingCtId(null); setFieldError(''); }}
                              className="text-xs px-3 py-1 rounded-lg border border-surface-200 dark:border-gray-700 text-surface-400 hover:bg-surface-50 dark:hover:bg-gray-800"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div key={df.ctId}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-surface-100 dark:border-gray-700/50 hover:border-surface-200 dark:hover:border-gray-600 transition-colors group"
                        >
                          <span className="w-6 h-6 flex items-center justify-center text-sm rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 shrink-0">
                            {TYPE_ICON[df.type] ?? 'T'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{df.label}</span>
                            <span className="ml-2 text-[10px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded-full">
                              {TYPE_LABEL[df.type] ?? df.type}
                            </span>
                            {df.options.length > 0 && (
                              <p className="text-[11px] text-surface-400 mt-0.5 truncate">
                                Options: {df.options.slice(0, 4).join(', ')}{df.options.length > 4 ? `… +${df.options.length - 4}` : ''}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={() => startEdit(df)}
                              title="Edit"
                              className="p-1.5 rounded-lg text-surface-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-950/30 transition-colors"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => deleteField(df)}
                              title="Delete"
                              className="p-1.5 rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

                {/* Add field form */}
                {showAdd ? (
                  <div className="rounded-xl border border-dashed border-brand-300 dark:border-brand-700 bg-brand-50/50 dark:bg-brand-950/10 p-4 space-y-3">
                    <p className="text-xs font-semibold text-brand-700 dark:text-brand-300 flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      New Custom Field — {form.label}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <input
                        autoFocus
                        className="flex-1 min-w-40 text-sm border border-surface-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-400"
                        placeholder="Field label (e.g. Emergency Contact, Photo ID)"
                        value={newField.label}
                        onChange={e => setNewField(f => ({ ...f, label: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') addField(); }}
                      />
                      <select
                        value={newField.fieldType}
                        onChange={e => setNewField(f => ({ ...f, fieldType: e.target.value }))}
                        className="text-sm border border-surface-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-400"
                      >
                        {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                      </select>
                    </div>
                    {newField.fieldType === 'select' && (
                      <div>
                        <input
                          className="w-full text-sm border border-surface-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-400"
                          placeholder="Option A, Option B, Option C"
                          value={newField.options}
                          onChange={e => setNewField(f => ({ ...f, options: e.target.value }))}
                        />
                        <p className="text-[10px] text-surface-400 mt-1">Separate each option with a comma</p>
                      </div>
                    )}

                    {/* Field type descriptions */}
                    <div className="grid grid-cols-2 gap-1.5 text-[10px] text-surface-400 dark:text-gray-500">
                      {newField.fieldType === 'file' && (
                        <p className="col-span-2 text-amber-600 dark:text-amber-400">Users can upload any file (PDF, DOC, etc.)</p>
                      )}
                      {newField.fieldType === 'image' && (
                        <p className="col-span-2 text-amber-600 dark:text-amber-400">Users can upload image files (JPG, PNG, etc.)</p>
                      )}
                      {newField.fieldType === 'checkbox' && (
                        <p className="col-span-2 text-amber-600 dark:text-amber-400">Renders as a Yes / No toggle</p>
                      )}
                    </div>

                    {fieldError && <p className="text-xs text-red-500 dark:text-red-400">{fieldError}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={addField}
                        disabled={fieldSaving || !newField.label.trim()}
                        className="btn btn-primary text-xs py-1.5 px-4"
                      >
                        {fieldSaving ? 'Adding…' : 'Add Field'}
                      </button>
                      <button
                        onClick={() => { setShowAdd(false); setFieldError(''); setNewField(BLANK); }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-surface-200 dark:border-gray-700 text-surface-400 hover:bg-surface-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : allDyn.length === 0 && !editingCtId && (
                  <button
                    onClick={() => { setShowAdd(true); setFieldError(''); }}
                    className="w-full py-6 rounded-xl border border-dashed border-surface-200 dark:border-gray-700 text-xs text-surface-400 hover:border-brand-300 hover:text-brand-500 dark:hover:border-brand-700 dark:hover:text-brand-400 transition-colors flex flex-col items-center justify-center gap-2"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Add a custom field to {form.label}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Field types reference card */}
          <div className="card p-4">
            <p className="text-xs font-medium text-surface-400 uppercase tracking-wide mb-3">Available Field Types</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {FIELD_TYPES.map(t => (
                <div key={t.value} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-50 dark:bg-gray-800/40">
                  <span className="text-sm">{t.icon}</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">{t.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
