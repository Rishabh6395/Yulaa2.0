'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface ClassItem { id: string; grade: string; section: string; name?: string; }
interface StreamEntry {
  id: string;
  name: string;        // subject name
  classId: string | null;
  isActive: boolean;
  sortOrder: number;
  class: { id: string; grade: string; section: string; name?: string } | null;
}

function classLabel(c: { grade: string; section: string; name?: string | null } | null | undefined) {
  if (!c) return '—';
  return c.name?.trim() ? c.name : `${c.grade} - Section ${c.section}`;
}

const EMPTY_FORM = { classId: '', name: '', sortOrder: '0', isActive: true };

export default function StreamMasterPage() {
  const [entries,   setEntries]   = useState<StreamEntry[]>([]);
  const [classes,   setClasses]   = useState<ClassItem[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [editing,   setEditing]   = useState<StreamEntry | null>(null);
  const [form,      setForm]      = useState({ ...EMPTY_FORM });
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');
  const [filter,    setFilter]    = useState('');     // filter by classId
  const [deleteId,  setDeleteId]  = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // Bulk upload
  const bulkFileRef = useRef<HTMLInputElement>(null);
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ added: number; failed: number; errors: string[] } | null>(null);

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
  const authH   = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sm, cl] = await Promise.all([
        fetch(`/api/masters/streams${showInactive ? '?includeInactive=true' : ''}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch('/api/classes', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      ]);
      setEntries(sm.streamMasters || []);
      setClasses(cl.classes       || []);
    } finally { setLoading(false); }
  }, [token, showInactive]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function openAdd() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setError('');
    setShowForm(true);
  }

  function openEdit(e: StreamEntry) {
    setEditing(e);
    setForm({ classId: e.classId || '', name: e.name, sortOrder: String(e.sortOrder), isActive: e.isActive });
    setError('');
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.classId) { setError('Please select a class.'); return; }
    if (!form.name.trim()) { setError('Subject name is required.'); return; }
    setSaving(true); setError('');
    try {
      const body = editing
        ? { id: editing.id, classId: form.classId, name: form.name.trim(), sortOrder: Number(form.sortOrder), isActive: form.isActive }
        : { classId: form.classId, name: form.name.trim(), sortOrder: Number(form.sortOrder), isActive: form.isActive };
      const res = await fetch('/api/masters/streams', {
        method: editing ? 'PATCH' : 'POST',
        headers: authH,
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || d.message || 'Failed to save subject — please try again'); return; }
      setSuccess(editing ? 'Subject updated.' : 'Subject added.');
      setShowForm(false);
      fetchAll();
      setTimeout(() => setSuccess(''), 3000);
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/masters/streams?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed to delete subject — please try again'); return; }
      setEntries(prev => prev.filter(e => e.id !== id));
      setSuccess('Subject deleted.');
      setTimeout(() => setSuccess(''), 3000);
    } finally { setDeleteId(null); }
  }

  async function toggleActive(entry: StreamEntry) {
    const res = await fetch('/api/masters/streams', {
      method: 'PATCH', headers: authH,
      body: JSON.stringify({ id: entry.id, isActive: !entry.isActive }),
    });
    if (res.ok) fetchAll();
  }

  function downloadStreamTemplate() {
    const rows = ['class_grade,class_section,name,sort_order', '10,A,Mathematics,0', '10,A,Science,1', '10,B,English,0'];
    const blob = new Blob([rows.join('\n') + '\n'], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'subject-master-template.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleBulkUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkUploading(true); setBulkResult(null);
    try {
      const text = await file.text();
      const lines = text.trim().split('\n').filter(Boolean);
      if (lines.length < 2) { setBulkResult({ added: 0, failed: 0, errors: ['File has no data rows'] }); return; }
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const dataRows = lines.slice(1);
      let added = 0; let failed = 0; const errors: string[] = [];
      for (let i = 0; i < dataRows.length; i++) {
        const vals = dataRows[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = vals[idx] ?? ''; });
        const grade = row['class_grade']?.trim();
        const section = row['class_section']?.trim();
        const name = row['name']?.trim();
        if (!name) { failed++; errors.push(`Row ${i + 2}: name is required`); continue; }
        // Resolve classId from grade+section
        let classId: string | undefined;
        if (grade && section) {
          const match = classes.find(c => String(c.grade).toLowerCase() === grade.toLowerCase() && String(c.section).toLowerCase() === section.toLowerCase());
          if (!match) { failed++; errors.push(`Row ${i + 2}: class grade=${grade} section=${section} not found`); continue; }
          classId = match.id;
        }
        if (!classId) { failed++; errors.push(`Row ${i + 2}: class_grade and class_section are required`); continue; }
        try {
          const res = await fetch('/api/masters/streams', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ classId, name, sortOrder: Number(row['sort_order'] ?? 0) }),
          });
          const d = await res.json();
          if (!res.ok) { failed++; errors.push(`Row ${i + 2} (${name}): ${d.error ?? 'Failed'}`); }
          else added++;
        } catch { failed++; errors.push(`Row ${i + 2}: Network error`); }
      }
      setBulkResult({ added, failed, errors });
      if (added > 0) fetchAll();
    } catch { setBulkResult({ added: 0, failed: 0, errors: ['Failed to read file'] }); }
    finally { setBulkUploading(false); e.target.value = ''; }
  }

  const selectedFilterClass = classes.find(c => c.id === filter);
  const filtered = entries.filter(e => !filter || e.classId === filter);

  // Group by class for display
  const grouped: Record<string, StreamEntry[]> = {};
  for (const e of filtered) {
    const key = e.classId || '__none__';
    (grouped[key] ??= []).push(e);
  }
  const groupKeys = Object.keys(grouped).sort((a, b) => {
    if (a === '__none__') return 1;
    if (b === '__none__') return -1;
    const ca = classes.find(c => c.id === a);
    const cb = classes.find(c => c.id === b);
    return (ca ? `${ca.grade}${ca.section}` : '').localeCompare(cb ? `${cb.grade}${cb.section}` : '');
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Subject Master</h1>
          <p className="text-sm text-surface-400 mt-0.5">Manage subjects per class — used in timetable and attendance</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setBulkModal(true); setBulkResult(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-200 dark:border-gray-700 text-sm text-surface-500 dark:text-gray-400 hover:border-brand-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/><path d="M3 17v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3"/></svg>
            Bulk Upload
          </button>
          <button onClick={openAdd} className="btn btn-primary">+ Add Subject</button>
        </div>
      </div>

      {success && (
        <div className="px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-700 dark:text-emerald-400">
          {success}
        </div>
      )}
      {error && !showForm && (
        <div className="px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          {error}
          <button className="ml-auto underline text-xs" onClick={() => setError('')}>Dismiss</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-surface-400 uppercase tracking-wide">Filter by Class</label>
          <select className="input w-52" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">All Classes</option>
            {[...new Set(classes.map(c => c.grade))].sort().map(grade => (
              <optgroup key={grade} label={`Grade ${grade}`}>
                {classes.filter(c => c.grade === grade).map(c => (
                  <option key={c.id} value={c.id}>{classLabel(c)}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-surface-500 cursor-pointer mt-5">
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="w-4 h-4 rounded" />
          Show inactive
        </label>
        <div className="ml-auto mt-5 text-xs text-surface-400">
          {filtered.length} subject{filtered.length !== 1 ? 's' : ''}
          {filter && selectedFilterClass ? ` in ${classLabel(selectedFilterClass)}` : ''}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-12 rounded-xl bg-surface-50 dark:bg-gray-800 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-surface-400">
          <p className="text-4xl mb-3">📚</p>
          <p className="font-semibold mb-1">No subjects yet</p>
          <p className="text-sm">Add subjects per class to use them in timetable scheduling and attendance.</p>
          <button onClick={openAdd} className="btn btn-primary mt-4">+ Add Subject</button>
        </div>
      ) : (
        <div className="space-y-6">
          {groupKeys.map(key => {
            const cls = classes.find(c => c.id === key);
            const items = grouped[key];
            return (
              <div key={key} className="card overflow-hidden">
                {/* Group header */}
                <div className="px-5 py-3 bg-surface-50 dark:bg-gray-800/60 border-b border-surface-100 dark:border-gray-700 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-950/40 flex items-center justify-center text-xs font-bold text-brand-600 dark:text-brand-400">
                    {cls ? cls.grade : '?'}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{cls ? classLabel(cls) : 'Unassigned'}</p>
                    {cls && <p className="text-xs text-surface-400">Grade {cls.grade} · Section {cls.section}</p>}
                  </div>
                  <span className="ml-auto text-xs text-surface-400">{items.length} subject{items.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Subject rows */}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-100 dark:border-gray-700 text-xs text-surface-400 uppercase tracking-wide">
                      <th className="px-5 py-2.5 text-left font-semibold">Subject</th>
                      <th className="px-5 py-2.5 text-left font-semibold">Class</th>
                      <th className="px-5 py-2.5 text-left font-semibold">Section</th>
                      <th className="px-5 py-2.5 text-center font-semibold">Sort</th>
                      <th className="px-5 py-2.5 text-center font-semibold">Status</th>
                      <th className="px-5 py-2.5 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-50 dark:divide-gray-800">
                    {items.map(entry => (
                      <tr key={entry.id} className={`hover:bg-surface-50/60 dark:hover:bg-gray-800/30 transition-colors ${!entry.isActive ? 'opacity-50' : ''}`}>
                        <td className="px-5 py-3 font-medium text-gray-900 dark:text-gray-100">{entry.name}</td>
                        <td className="px-5 py-3 text-surface-500">{entry.class?.grade || '—'}</td>
                        <td className="px-5 py-3 text-surface-500">{entry.class?.section || '—'}</td>
                        <td className="px-5 py-3 text-center text-surface-400 text-xs">{entry.sortOrder}</td>
                        <td className="px-5 py-3 text-center">
                          <button
                            onClick={() => toggleActive(entry)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                              entry.isActive
                                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                : 'bg-surface-100 dark:bg-gray-700 text-surface-500 border-surface-200 dark:border-gray-600'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${entry.isActive ? 'bg-emerald-500' : 'bg-surface-400'}`} />
                            {entry.isActive ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEdit(entry)}
                              className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium"
                            >
                              Edit
                            </button>
                            {deleteId === entry.id ? (
                              <span className="flex items-center gap-1.5 text-xs">
                                <span className="text-surface-400">Delete?</span>
                                <button onClick={() => handleDelete(entry.id)} className="text-red-500 font-medium hover:underline">Yes</button>
                                <button onClick={() => setDeleteId(null)} className="text-surface-400 hover:underline">No</button>
                              </span>
                            ) : (
                              <button
                                onClick={() => setDeleteId(entry.id)}
                                className="text-xs text-red-500 dark:text-red-400 hover:underline"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {/* Hidden file input */}
      <input ref={bulkFileRef} type="file" accept=".csv" className="hidden" onChange={handleBulkUpload} />

      {/* Bulk Upload Modal */}
      {bulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Bulk Upload — Subject Master</h2>
              <button onClick={() => setBulkModal(false)} className="text-surface-400 hover:text-gray-700 dark:hover:text-gray-200 text-xl leading-none">×</button>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-400 space-y-1">
              <p className="font-semibold">CSV columns:</p>
              <p className="font-mono">class_grade, class_section, name, sort_order</p>
              <p>Use the exact grade and section values that match your class list. e.g. grade=<code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">10</code>, section=<code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">A</code></p>
            </div>
            {bulkResult && (
              <div className={`p-3 rounded-xl border text-sm space-y-1 ${bulkResult.failed === 0 ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'}`}>
                <p className="font-semibold">{bulkResult.added} added, {bulkResult.failed} failed</p>
                {bulkResult.errors.map((e, i) => <p key={i} className="text-xs opacity-80">{e}</p>)}
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button onClick={downloadStreamTemplate}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-surface-200 dark:border-gray-700 text-sm text-surface-500 dark:text-gray-400 hover:border-brand-300 hover:text-brand-600 transition-colors">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download Template
              </button>
              <button onClick={() => { setBulkResult(null); bulkFileRef.current?.click(); }} disabled={bulkUploading}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-60 transition-colors">
                {bulkUploading
                  ? <><svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Uploading…</>
                  : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>Upload CSV</>
                }
              </button>
              <button onClick={() => setBulkModal(false)} className="px-3 py-2 rounded-lg border border-surface-200 dark:border-gray-700 text-sm text-surface-500 dark:text-gray-400 hover:bg-surface-50 dark:hover:bg-gray-700 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-surface-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 dark:border-gray-700">
              <h2 className="text-lg font-display font-bold text-gray-900 dark:text-gray-100">
                {editing ? 'Edit Subject' : 'Add Subject'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-surface-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {error && (
                <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              {/* Class selector */}
              <div>
                <label className="block text-xs font-medium text-surface-500 dark:text-gray-400 mb-1">Class *</label>
                <select
                  className="input w-full"
                  value={form.classId}
                  onChange={e => setForm(f => ({ ...f, classId: e.target.value }))}
                >
                  <option value="">— Select class —</option>
                  {[...new Set(classes.map(c => c.grade))].sort().map(grade => (
                    <optgroup key={grade} label={`Grade ${grade}`}>
                      {classes.filter(c => c.grade === grade).map(c => (
                        <option key={c.id} value={c.id}>{classLabel(c)}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {/* Auto-show grade/section info */}
                {form.classId && (() => {
                  const sel = classes.find(c => c.id === form.classId);
                  return sel ? (
                    <p className="text-xs text-surface-400 mt-1">
                      Grade <strong>{sel.grade}</strong> · Section <strong>{sel.section}</strong>
                    </p>
                  ) : null;
                })()}
              </div>

              {/* Subject name */}
              <div>
                <label className="block text-xs font-medium text-surface-500 dark:text-gray-400 mb-1">Subject Name *</label>
                <input
                  className="input w-full"
                  placeholder="e.g. Mathematics"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>

              {/* Sort order + Active */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-surface-500 dark:text-gray-400 mb-1">Sort Order</label>
                  <input
                    type="number"
                    className="input w-full"
                    value={form.sortOrder}
                    onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))}
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-500 dark:text-gray-400 mb-1">Status</label>
                  <select
                    className="input w-full"
                    value={form.isActive ? 'active' : 'inactive'}
                    onChange={e => setForm(f => ({ ...f, isActive: e.target.value === 'active' }))}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-surface-100 dark:border-gray-700 flex gap-3">
              <button className="btn btn-ghost flex-1" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Subject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
