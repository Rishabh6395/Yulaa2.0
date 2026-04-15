'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'textarea';
  required?: boolean;
  options?: string[];
  placeholder?: string;
  default?: any;
  width?: 'sm' | 'md' | 'lg';
}

interface MasterPageProps {
  title: string;
  description: string;
  apiPath: string;
  dataKey: string;
  itemKey: string;
  fields: FieldDef[];
  /** Extra columns beyond name/code. Each item in `rows` has the field values. */
  extraColumns?: { key: string; label: string; render?: (val: any, row: any) => React.ReactNode }[];
  backHref?: string;
}

function emptyForm(fields: FieldDef[]) {
  return Object.fromEntries(fields.map(f => [f.key, f.default ?? (f.type === 'number' ? 0 : f.type === 'multiselect' ? [] : '')]));
}

function getToken() {
  if (typeof document === 'undefined') return '';
  return document.cookie.split(';').map(c => c.trim()).find(c => c.startsWith('token='))?.split('=')[1] ?? '';
}

const ACTIVE_CLS = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800';
const INACTIVE_CLS = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-surface-100 dark:bg-gray-800 text-surface-400 dark:text-gray-500 border border-surface-200 dark:border-gray-700';

export default function MasterPage({ title, description, apiPath, dataKey, itemKey, fields, extraColumns = [], backHref = '/dashboard/masters' }: MasterPageProps) {
  const searchParams = useSearchParams();
  // schoolId comes from ?schoolId= (super admin via school config) or falls back to user's own school
  const schoolIdParam = searchParams.get('schoolId') ?? undefined;

  // Build URL with schoolId and includeInactive=true (management view always shows all items)
  function withSchool(path: string) {
    const sep = path.includes('?') ? '&' : '?';
    const withInactive = `${path}${sep}includeInactive=true`;
    if (!schoolIdParam) return withInactive;
    return `${withInactive}&schoolId=${schoolIdParam}`;
  }

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState<Record<string, any>>(emptyForm(fields));
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(withSchool(apiPath), { headers: { Authorization: `Bearer ${getToken()}` } });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Failed to load'); return; }
      setRows(json[dataKey] ?? []);
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }, [apiPath, dataKey, schoolIdParam]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setFormErr('');
    try {
      const body = schoolIdParam ? { ...form, schoolId: schoolIdParam } : form;
      const res = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { setFormErr(json.error ?? 'Failed to save'); return; }
      setForm(emptyForm(fields));
      load();
    } catch { setFormErr('Network error'); }
    finally { setSaving(false); }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setFormErr('');
    try {
      const res = await fetch(apiPath, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ id: editId, ...editForm }),
      });
      const json = await res.json();
      if (!res.ok) { setFormErr(json.error ?? 'Failed to save'); return; }
      setEditId(null);
      load();
    } catch { setFormErr('Network error'); }
    finally { setSaving(false); }
  }

  async function toggleActive(row: any) {
    await fetch(apiPath, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ id: row.id, isActive: !row.isActive }),
    });
    load();
  }

  function startEdit(row: any) {
    setEditId(row.id);
    setEditForm(Object.fromEntries(fields.map(f => [f.key, row[f.key] ?? (f.type === 'multiselect' ? [] : '')])));
    setFormErr('');
  }

  function renderField(f: FieldDef, val: any, onChange: (v: any) => void) {
    const base = 'border border-surface-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full';
    if (f.type === 'select') return (
      <select value={val} onChange={e => onChange(e.target.value)} className={base}>
        <option value="">— select —</option>
        {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
    if (f.type === 'multiselect') return (
      <div className="flex flex-wrap gap-2">
        {f.options?.map(o => (
          <label key={o} className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="checkbox" checked={Array.isArray(val) && val.includes(o)} onChange={e => {
              const arr: string[] = Array.isArray(val) ? [...val] : [];
              onChange(e.target.checked ? [...arr, o] : arr.filter(x => x !== o));
            }} className="rounded" />
            {o}
          </label>
        ))}
      </div>
    );
    if (f.type === 'textarea') return <textarea value={val} onChange={e => onChange(e.target.value)} rows={2} placeholder={f.placeholder} className={base} />;
    return <input type={f.type === 'number' ? 'number' : 'text'} value={val} onChange={e => onChange(f.type === 'number' ? Number(e.target.value) : e.target.value)} placeholder={f.placeholder ?? f.label} className={base} />;
  }

  const nameField = fields.find(f => f.key === 'name');
  const otherFields = fields.filter(f => f.key !== 'name');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={schoolIdParam ? `${backHref}?schoolId=${schoolIdParam}` : backHref} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-gray-800 text-surface-400 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">{title}</h1>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>

      {/* Add form */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Add New</h2>
        <form onSubmit={handleAdd} className="space-y-3">
          <div className={`grid gap-3 ${fields.length > 2 ? 'sm:grid-cols-2 lg:grid-cols-3' : fields.length === 2 ? 'sm:grid-cols-2' : 'max-w-xs'}`}>
            {fields.map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-surface-400 dark:text-gray-500 mb-1">{f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}</label>
                {renderField(f, form[f.key], v => setForm(p => ({ ...p, [f.key]: v })))}
              </div>
            ))}
          </div>
          {formErr && !editId && <p className="text-xs text-red-500">{formErr}</p>}
          <button type="submit" disabled={saving} className="btn-primary text-sm px-4 py-2">
            {saving ? 'Saving…' : 'Add'}
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-surface-400">Loading…</div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-500">{error}</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-surface-400">No entries yet. Add one above.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100 dark:border-gray-800 bg-surface-50 dark:bg-gray-900/50">
                <th className="text-left px-4 py-3 font-medium text-surface-500 dark:text-gray-400">Name</th>
                {otherFields.filter(f => f.key !== 'sortOrder').map(f => (
                  <th key={f.key} className="text-left px-4 py-3 font-medium text-surface-500 dark:text-gray-400">{f.label}</th>
                ))}
                {extraColumns.map(c => (
                  <th key={c.key} className="text-left px-4 py-3 font-medium text-surface-500 dark:text-gray-400">{c.label}</th>
                ))}
                <th className="text-left px-4 py-3 font-medium text-surface-500 dark:text-gray-400">Status</th>
                <th className="text-right px-4 py-3 font-medium text-surface-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-gray-800">
              {rows.map(row => (
                editId === row.id ? (
                  <tr key={row.id} className="bg-blue-50/50 dark:bg-blue-950/20">
                    <td className="px-4 py-3" colSpan={otherFields.filter(f => f.key !== 'sortOrder').length + extraColumns.length + 3}>
                      <form onSubmit={handleEdit} className="flex flex-wrap gap-3 items-end">
                        {fields.map(f => (
                          <div key={f.key} className={f.type === 'multiselect' ? 'w-full' : 'w-40'}>
                            <label className="block text-xs font-medium text-surface-400 mb-1">{f.label}</label>
                            {renderField(f, editForm[f.key], v => setEditForm(p => ({ ...p, [f.key]: v })))}
                          </div>
                        ))}
                        {formErr && <p className="text-xs text-red-500 w-full">{formErr}</p>}
                        <div className="flex gap-2">
                          <button type="submit" disabled={saving} className="btn-primary text-xs px-3 py-1.5">{saving ? 'Saving…' : 'Save'}</button>
                          <button type="button" onClick={() => { setEditId(null); setFormErr(''); }} className="btn-secondary text-xs px-3 py-1.5">Cancel</button>
                        </div>
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr key={row.id} className="hover:bg-surface-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{row.name}</td>
                    {otherFields.filter(f => f.key !== 'sortOrder').map(f => (
                      <td key={f.key} className="px-4 py-3 text-surface-500 dark:text-gray-400">
                        {Array.isArray(row[f.key]) ? row[f.key].join(', ') : String(row[f.key] ?? '—')}
                      </td>
                    ))}
                    {extraColumns.map(c => (
                      <td key={c.key} className="px-4 py-3 text-surface-500 dark:text-gray-400">
                        {c.render ? c.render(row[c.key], row) : String(row[c.key] ?? '—')}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <span className={row.isActive ? ACTIVE_CLS : INACTIVE_CLS}>
                        <span className={`w-1.5 h-1.5 rounded-full ${row.isActive ? 'bg-emerald-500' : 'bg-surface-400'}`} />
                        {row.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => startEdit(row)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-500 transition-colors" title="Edit">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button onClick={() => toggleActive(row)} className={`p-1.5 rounded-lg transition-colors ${row.isActive ? 'hover:bg-red-50 dark:hover:bg-red-950/30 text-red-400' : 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-500'}`} title={row.isActive ? 'Deactivate' : 'Activate'}>
                          {row.isActive
                            ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
