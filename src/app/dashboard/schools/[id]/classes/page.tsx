'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SchoolClassesPage({ params }: { params: { id: string } }) {
  const schoolId = params.id;
  const router = useRouter();
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ grade: '', section: '', academic_year: '', max_students: '', class_teacher_id: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const token = () => localStorage.getItem('token') || '';
  const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

  async function load() {
    setLoading(true);
    try {
      const [cr, tr] = await Promise.all([
        fetch(`/api/super-admin/schools/${schoolId}/classes`, { headers: headers() }),
        fetch(`/api/super-admin/schools/${schoolId}/teachers`, { headers: headers() }),
      ]);
      const cd = await cr.json();
      const td = await tr.json();
      setClasses(cd.classes || []);
      setTeachers(td.teachers || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [schoolId]);

  function openAdd() {
    setEditing(null);
    setForm({ grade: '', section: '', academic_year: new Date().getFullYear().toString(), max_students: '40', class_teacher_id: '' });
    setError('');
    setShowModal(true);
  }

  function openEdit(cls: any) {
    setEditing(cls);
    setForm({
      grade: cls.grade || '',
      section: cls.section || '',
      academic_year: cls.academic_year || '',
      max_students: cls.capacity?.toString() || '',
      class_teacher_id: '',
    });
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.grade || !form.section) { setError('Grade and section are required'); return; }
    setSaving(true); setError('');
    try {
      const body = editing
        ? { id: editing.id, ...form, max_students: Number(form.max_students) || undefined }
        : { ...form, max_students: Number(form.max_students) || undefined };
      const res = await fetch(`/api/super-admin/schools/${schoolId}/classes`, {
        method: editing ? 'PATCH' : 'POST',
        headers: headers(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setShowModal(false);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Classes</h1>
          <p className="text-sm text-surface-400 mt-0.5">{classes.length} class{classes.length !== 1 ? 'es' : ''} configured</p>
        </div>
        <button onClick={openAdd} className="btn btn-primary flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Class
        </button>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-surface-400">Loading classes...</div>
      ) : classes.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">🏫</div>
          <p className="text-surface-400 text-sm">No classes configured yet. Add the first class.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map(cls => (
            <div key={cls.id} className="card p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    {cls.grade} – {cls.section}
                  </div>
                  {cls.academic_year && (
                    <div className="text-xs text-surface-400 mt-0.5">AY {cls.academic_year}</div>
                  )}
                </div>
                <button onClick={() => openEdit(cls)} className="text-xs text-brand-600 hover:text-brand-700 font-medium">Edit</button>
              </div>
              <div className="flex items-center gap-4 text-sm text-surface-400">
                <span className="flex items-center gap-1">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  {cls.student_count ?? 0} / {cls.capacity ?? '—'}
                </span>
                {cls.teacher_name && (
                  <span className="flex items-center gap-1">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    {cls.teacher_name}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {editing ? 'Edit Class' : 'Add Class'}
            </h2>
            {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">{error}</p>}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Grade *</label>
                  <input className="input" placeholder="e.g. Grade 5" value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Section *</label>
                  <input className="input" placeholder="e.g. A" value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Academic Year</label>
                  <input className="input" placeholder="2024-25" value={form.academic_year} onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Max Students</label>
                  <input className="input" type="number" placeholder="40" value={form.max_students} onChange={e => setForm(f => ({ ...f, max_students: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Class Teacher</label>
                <select className="input" value={form.class_teacher_id} onChange={e => setForm(f => ({ ...f, class_teacher_id: e.target.value }))}>
                  <option value="">— Unassigned —</option>
                  {teachers.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                {saving ? 'Saving...' : editing ? 'Update' : 'Add Class'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
