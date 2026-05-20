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

const inp = 'border border-surface-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full';
const sel = 'border border-surface-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm px-3 py-2 w-72 focus:outline-none focus:ring-2 focus:ring-blue-500';
const ACTIVE   = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200';
const INACTIVE = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-surface-100 dark:bg-gray-800 text-surface-400 border border-surface-200';

const CURRENT_YEAR = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

export default function ClassesMasterPage() {
  const searchParams  = useSearchParams();
  const schoolIdParam = searchParams.get('schoolId') ?? undefined;

  const [isSA,        setIsSA]        = useState(false);
  const [schools,     setSchools]     = useState<any[]>([]);
  const [pickedId,    setPickedId]    = useState('');

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

  const [rows,    setRows]    = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState('');
  const [form,    setForm]    = useState({ grade: '', section: '', academicYear: CURRENT_YEAR, maxStudents: 40 });
  const [editId,  setEditId]  = useState<string | null>(null);
  const [editForm,setEditForm]= useState<any>({});
  const [saving,  setSaving]  = useState(false);
  const [formErr, setFormErr] = useState('');

  const buildUrl = () => {
    const base = '/api/classes';
    if (effectiveSchoolId) return `${base}?schoolId=${effectiveSchoolId}`;
    return base;
  };

  const load = useCallback(async () => {
    if (isSA && !effectiveSchoolId) { setLoading(false); return; }
    setLoading(true); setErr('');
    try {
      const res  = await fetch(buildUrl(), { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? 'Failed to load'); return; }
      setRows(data.classes ?? []);
    } catch { setErr('Network error'); }
    finally { setLoading(false); }
  }, [effectiveSchoolId, isSA]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setFormErr('');
    try {
      const body: any = { ...form };
      if (effectiveSchoolId) body.schoolId = effectiveSchoolId;
      const res  = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setFormErr(data.error ?? 'Failed to save'); return; }
      setForm({ grade: '', section: '', academicYear: CURRENT_YEAR, maxStudents: 40 });
      load();
    } catch { setFormErr('Network error'); }
    finally { setSaving(false); }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setFormErr('');
    try {
      const res  = await fetch('/api/classes', {
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
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Classes</h1>
          <p className="text-sm text-surface-400 mt-0.5">Class / section records used across the school</p>
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
        {/* Add form */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Add Class</h2>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">Grade <span className="text-red-500">*</span></label>
                <input value={form.grade} onChange={e => setForm(p => ({ ...p, grade: e.target.value }))} placeholder="e.g. 1, 2, LKG" className={inp} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">Section <span className="text-red-500">*</span></label>
                <input value={form.section} onChange={e => setForm(p => ({ ...p, section: e.target.value }))} placeholder="e.g. A, B, C" className={inp} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">Academic Year</label>
                <input value={form.academicYear} onChange={e => setForm(p => ({ ...p, academicYear: e.target.value }))} placeholder="2025-2026" className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">Max Students</label>
                <input type="number" value={form.maxStudents} onChange={e => setForm(p => ({ ...p, maxStudents: Number(e.target.value) }))} className={inp} />
              </div>
            </div>
            {formErr && !editId && <p className="text-xs text-red-500">{formErr}</p>}
            <button type="submit" disabled={saving} className="btn-primary text-sm px-4 py-2">{saving ? 'Saving…' : 'Add Class'}</button>
          </form>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-surface-400">Loading…</div>
          ) : err ? (
            <div className="p-8 text-center text-sm text-red-500">{err}</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-surface-400">No classes yet. Add one above.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100 dark:border-gray-800 bg-surface-50 dark:bg-gray-900/50">
                  {['Grade', 'Section', 'Academic Year', 'Max Students', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-surface-500 dark:text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-gray-800">
                {rows.map(row => editId === row.id ? (
                  <tr key={row.id} className="bg-blue-50/50 dark:bg-blue-950/20">
                    <td className="px-4 py-3" colSpan={5}>
                      <form onSubmit={handleEdit} className="flex flex-wrap gap-3 items-end">
                        {[['grade','Grade','text'],['section','Section','text'],['academicYear','Academic Year','text']].map(([k,l,t]) => (
                          <div key={k} className="w-36">
                            <label className="block text-xs text-surface-400 mb-1">{l}</label>
                            <input type={t} value={editForm[k] ?? ''} onChange={e => setEditForm((p: any) => ({ ...p, [k]: e.target.value }))} className={inp} />
                          </div>
                        ))}
                        <div className="w-28">
                          <label className="block text-xs text-surface-400 mb-1">Max Students</label>
                          <input type="number" value={editForm.maxStudents ?? 40} onChange={e => setEditForm((p: any) => ({ ...p, maxStudents: Number(e.target.value) }))} className={inp} />
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
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">Grade {row.grade}</td>
                    <td className="px-4 py-3 text-surface-500 dark:text-gray-400">{row.section}</td>
                    <td className="px-4 py-3 text-surface-500 dark:text-gray-400">{row.academicYear}</td>
                    <td className="px-4 py-3 text-surface-500 dark:text-gray-400">{row.maxStudents}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => { setEditId(row.id); setEditForm({ grade: row.grade, section: row.section, academicYear: row.academicYear, maxStudents: row.maxStudents }); setFormErr(''); }}
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
