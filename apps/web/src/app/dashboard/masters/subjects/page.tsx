'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function getToken() {
  if (typeof document === 'undefined') return '';
  return document.cookie.split(';').map(c => c.trim()).find(c => c.startsWith('token='))?.split('=')[1] ?? '';
}

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
}

const inp  = 'border border-surface-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full';
const sel  = 'border border-surface-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm px-3 py-2 w-72 focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function SubjectsMasterPage() {
  const searchParams  = useSearchParams();
  const schoolIdParam = searchParams.get('schoolId') ?? undefined;

  const [isSA,      setIsSA]      = useState(false);
  const [schools,   setSchools]   = useState<any[]>([]);
  const [pickedId,  setPickedId]  = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const u  = getStoredUser();
    const sa = u.primaryRole === 'super_admin' || u.roles?.some((r: any) => r.role_code === 'super_admin');
    setIsSA(sa);
    if (sa && !schoolIdParam) {
      fetch('/api/super-admin/schools', { headers: { Authorization: `Bearer ${getToken()}` } })
        .then(r => r.json()).then(d => setSchools(d.schools ?? []));
    }
  }, [schoolIdParam]);

  const effectiveSchoolId = schoolIdParam || pickedId || undefined;
  const schoolQ = effectiveSchoolId ? `schoolId=${effectiveSchoolId}&` : '';

  // Grade options loaded from school's Class configuration (Class tab in school config)
  const [gradeOptions, setGradeOptions] = useState<string[]>([]);
  useEffect(() => {
    if (!effectiveSchoolId && isSA) return;
    const url = isSA && effectiveSchoolId
      ? `/api/super-admin/schools/${effectiveSchoolId}/classes`
      : '/api/classes';
    fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => {
        const classes: any[] = d.classes ?? [];
        const unique = [...new Set(classes.map((c: any) => c.grade as string))]
          .sort((a, b) => {
            const na = parseInt(a, 10), nb = parseInt(b, 10);
            if (!isNaN(na) && !isNaN(nb)) return na - nb;
            return a.localeCompare(b);
          });
        setGradeOptions(unique);
      })
      .catch(() => setGradeOptions([]));
  }, [effectiveSchoolId, isSA]);

  // Also add 'all' option
  const gradeLevelOptions = ['all', ...gradeOptions];

  const [rows,    setRows]    = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState('');
  const [form,    setForm]    = useState({ subject: '', gradeLevel: '', code: '', isCore: true, maxMarks: 100, passMarks: 33 });
  const [editId,  setEditId]  = useState<string | null>(null);
  const [editForm,setEditForm]= useState<any>({});
  const [saving,  setSaving]  = useState(false);
  const [formErr, setFormErr] = useState('');
  const [filterGrade, setFilterGrade] = useState('');

  const load = useCallback(async () => {
    if (isSA && !effectiveSchoolId) { setLoading(false); return; }
    setLoading(true); setErr('');
    try {
      const grade = filterGrade ? `&gradeLevel=${encodeURIComponent(filterGrade)}` : '';
      const res   = await fetch(`/api/masters/subjects?${schoolQ}includeInactive=true${grade}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data  = await res.json();
      if (!res.ok) { setErr(data.error ?? 'Failed to load'); return; }
      setRows(data.subjects ?? []);
    } catch { setErr('Network error'); }
    finally { setLoading(false); }
  }, [effectiveSchoolId, isSA, filterGrade, schoolQ]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setFormErr('');
    try {
      const body: any = { ...form };
      if (effectiveSchoolId) body.schoolId = effectiveSchoolId;
      const res  = await fetch('/api/masters/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setFormErr(data.error ?? 'Failed to save'); return; }
      setForm({ subject: '', gradeLevel: '', code: '', isCore: true, maxMarks: 100, passMarks: 33 });
      load();
    } catch { setFormErr('Network error'); }
    finally { setSaving(false); }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setFormErr('');
    try {
      const res  = await fetch('/api/masters/subjects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ id: editId, ...editForm }),
      });
      const data = await res.json();
      if (!res.ok) { setFormErr(data.error ?? 'Failed to save'); return; }
      setEditId(null);
      load();
    } catch { setFormErr('Network error'); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link href={schoolIdParam ? `/dashboard/masters?schoolId=${schoolIdParam}` : '/dashboard/masters'} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-gray-800 text-surface-400 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Subjects</h1>
          <p className="text-sm text-surface-400 mt-0.5">Subject catalog linked to grade / class levels</p>
        </div>
      </div>

      {/* Super-admin school picker */}
      {isSA && !schoolIdParam && (
        <div className="card p-5">
          <label className="block text-xs font-medium text-surface-400 mb-1">Select School</label>
          {schools.length === 0 ? <p className="text-xs text-surface-400">Loading schools…</p> : (
            <select value={pickedId} onChange={e => { setPickedId(e.target.value); setRows([]); }} className={sel}>
              <option value="">— choose a school —</option>
              {schools.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
        </div>
      )}

      {(!isSA || effectiveSchoolId) && (<>
        {/* Filter by grade */}
        <div className="card p-4 flex items-center gap-3">
          <label className="text-xs font-medium text-surface-400 whitespace-nowrap">Filter by Grade</label>
          <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)} className="border border-surface-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm px-3 py-2 w-56 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">— All grades —</option>
            {gradeLevelOptions.map(g => <option key={g} value={g}>{g === 'all' ? 'All grades' : g}</option>)}
          </select>
        </div>

        {/* Add form */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Add Subject</h2>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">Subject Name <span className="text-red-500">*</span></label>
                <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="e.g. Mathematics" className={inp} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">Grade / Class <span className="text-red-500">*</span></label>
                {gradeLevelOptions.length > 1 ? (
                  <select value={form.gradeLevel} onChange={e => setForm(p => ({ ...p, gradeLevel: e.target.value }))} className={inp} required>
                    <option value="">— select grade —</option>
                    {gradeLevelOptions.map(g => <option key={g} value={g}>{g === 'all' ? 'All grades' : g}</option>)}
                  </select>
                ) : (
                  <input value={form.gradeLevel} onChange={e => setForm(p => ({ ...p, gradeLevel: e.target.value }))} placeholder="e.g. Grade 1, all" className={inp} required />
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">Subject Code</label>
                <input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="e.g. MATH10" className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">Max Marks</label>
                <input type="number" value={form.maxMarks} onChange={e => setForm(p => ({ ...p, maxMarks: Number(e.target.value) }))} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">Pass Marks</label>
                <input type="number" value={form.passMarks} onChange={e => setForm(p => ({ ...p, passMarks: Number(e.target.value) }))} className={inp} />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={form.isCore} onChange={e => setForm(p => ({ ...p, isCore: e.target.checked }))} className="rounded" />
                  Core Subject
                </label>
              </div>
            </div>
            {formErr && !editId && <p className="text-xs text-red-500">{formErr}</p>}
            <button type="submit" disabled={saving} className="btn-primary text-sm px-4 py-2">{saving ? 'Saving…' : 'Add Subject'}</button>
          </form>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-surface-400">Loading…</div>
          ) : err ? (
            <div className="p-8 text-center text-sm text-red-500">{err}</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-surface-400">No subjects yet. Add one above.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100 dark:border-gray-800 bg-surface-50 dark:bg-gray-900/50">
                  {['Subject', 'Grade', 'Code', 'Max', 'Pass', 'Type', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-surface-500 dark:text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-gray-800">
                {rows.map(row => editId === row.id ? (
                  <tr key={row.id} className="bg-blue-50/50 dark:bg-blue-950/20">
                    <td className="px-4 py-3" colSpan={7}>
                      <form onSubmit={handleEdit} className="flex flex-wrap gap-3 items-end">
                        <div className="w-40">
                          <label className="block text-xs text-surface-400 mb-1">Subject</label>
                          <input value={editForm.subject ?? ''} onChange={e => setEditForm((p: any) => ({ ...p, subject: e.target.value }))} className={inp} />
                        </div>
                        <div className="w-36">
                          <label className="block text-xs text-surface-400 mb-1">Grade</label>
                          {gradeLevelOptions.length > 1 ? (
                            <select value={editForm.gradeLevel ?? ''} onChange={e => setEditForm((p: any) => ({ ...p, gradeLevel: e.target.value }))} className={inp}>
                              <option value="">— select —</option>
                              {gradeLevelOptions.map(g => <option key={g} value={g}>{g === 'all' ? 'All grades' : g}</option>)}
                            </select>
                          ) : (
                            <input value={editForm.gradeLevel ?? ''} onChange={e => setEditForm((p: any) => ({ ...p, gradeLevel: e.target.value }))} className={inp} />
                          )}
                        </div>
                        <div className="w-28"><label className="block text-xs text-surface-400 mb-1">Code</label><input value={editForm.code ?? ''} onChange={e => setEditForm((p: any) => ({ ...p, code: e.target.value }))} className={inp} /></div>
                        <div className="w-20"><label className="block text-xs text-surface-400 mb-1">Max</label><input type="number" value={editForm.maxMarks ?? 100} onChange={e => setEditForm((p: any) => ({ ...p, maxMarks: Number(e.target.value) }))} className={inp} /></div>
                        <div className="w-20"><label className="block text-xs text-surface-400 mb-1">Pass</label><input type="number" value={editForm.passMarks ?? 33} onChange={e => setEditForm((p: any) => ({ ...p, passMarks: Number(e.target.value) }))} className={inp} /></div>
                        <div className="flex items-end pb-2">
                          <label className="flex items-center gap-2 text-xs text-surface-400 cursor-pointer">
                            <input type="checkbox" checked={editForm.isCore ?? true} onChange={e => setEditForm((p: any) => ({ ...p, isCore: e.target.checked }))} className="rounded" />
                            Core
                          </label>
                        </div>
                        {formErr && <p className="text-xs text-red-500 w-full">{formErr}</p>}
                        <div className="flex gap-2">
                          <button type="submit" disabled={saving} className="btn-primary text-xs px-3 py-1.5">{saving ? 'Saving…' : 'Save'}</button>
                          <button type="button" onClick={() => setEditId(null)} className="btn-secondary text-xs px-3 py-1.5">Cancel</button>
                        </div>
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr key={row.id} className="hover:bg-surface-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{row.subject}</td>
                    <td className="px-4 py-3 text-surface-500 dark:text-gray-400">{row.gradeLevel === 'all' ? 'All grades' : row.gradeLevel}</td>
                    <td className="px-4 py-3 text-surface-500 dark:text-gray-400">{row.code ?? '—'}</td>
                    <td className="px-4 py-3 text-surface-500 dark:text-gray-400">{row.maxMarks}</td>
                    <td className="px-4 py-3 text-surface-500 dark:text-gray-400">{row.passMarks}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${row.isCore ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200' : 'bg-surface-100 dark:bg-gray-800 text-surface-400 border border-surface-200'}`}>
                        {row.isCore ? 'Core' : 'Elective'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => { setEditId(row.id); setEditForm({ subject: row.subject, gradeLevel: row.gradeLevel, code: row.code ?? '', isCore: row.isCore, maxMarks: row.maxMarks, passMarks: row.passMarks }); setFormErr(''); }}
                        className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-500 transition-colors"
                        title="Edit"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </>)}
    </div>
  );
}
