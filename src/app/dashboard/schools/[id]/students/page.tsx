'use client';

import { useEffect, useState } from 'react';

export default function SchoolStudentsPage({ params }: { params: { id: string } }) {
  const schoolId = params.id;
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', rollNumber: '', classId: '', dateOfBirth: '', gender: '', parentName: '', parentPhone: '', parentEmail: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  const token = () => localStorage.getItem('token') || '';
  const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterClass) params.set('classId', filterClass);
      params.set('page', String(page));
      params.set('limit', String(PER_PAGE));

      const [sr, cr] = await Promise.all([
        fetch(`/api/super-admin/schools/${schoolId}/students?${params}`, { headers: headers() }),
        fetch(`/api/super-admin/schools/${schoolId}/classes`, { headers: headers() }),
      ]);
      const sd = await sr.json();
      const cd = await cr.json();
      setStudents(sd.students || []);
      setClasses(cd.classes || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [schoolId, search, filterClass, page]);

  function openAdd() {
    setEditing(null);
    setForm({ firstName: '', lastName: '', rollNumber: '', classId: '', dateOfBirth: '', gender: '', parentName: '', parentPhone: '', parentEmail: '' });
    setError('');
    setShowModal(true);
  }

  function openEdit(s: any) {
    setEditing(s);
    setForm({
      firstName: s.firstName || '',
      lastName: s.lastName || '',
      rollNumber: s.rollNumber || '',
      classId: s.class?.id || '',
      dateOfBirth: s.dateOfBirth ? s.dateOfBirth.slice(0, 10) : '',
      gender: s.gender || '',
      parentName: s.parentName || '',
      parentPhone: s.parentPhone || '',
      parentEmail: s.parentEmail || '',
    });
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.firstName || !form.lastName) { setError('First and last name are required'); return; }
    setSaving(true); setError('');
    try {
      const body = editing ? { id: editing.id, ...form } : form;
      const res = await fetch(`/api/super-admin/schools/${schoolId}/students`, {
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

  const filtered = students; // server-side filtering already applied

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Students</h1>
          <p className="text-sm text-surface-400 mt-0.5">{students.length} student{students.length !== 1 ? 's' : ''} shown</p>
        </div>
        <button onClick={openAdd} className="btn btn-primary flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Student
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input
          className="input max-w-xs"
          placeholder="Search name / roll..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        <select className="input w-auto" value={filterClass} onChange={e => { setFilterClass(e.target.value); setPage(1); }}>
          <option value="">All Classes</option>
          {classes.map((c: any) => (
            <option key={c.id} value={c.id}>{c.grade} – {c.section}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-surface-400">Loading students...</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">🎒</div>
          <p className="text-surface-400 text-sm">No students found.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-50 dark:bg-gray-700/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-surface-500 dark:text-gray-400">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-surface-500 dark:text-gray-400">Roll No.</th>
                <th className="text-left px-4 py-3 font-semibold text-surface-500 dark:text-gray-400">Class</th>
                <th className="text-left px-4 py-3 font-semibold text-surface-500 dark:text-gray-400">Parent</th>
                <th className="text-left px-4 py-3 font-semibold text-surface-500 dark:text-gray-400">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-gray-700">
              {filtered.map((s: any) => (
                <tr key={s.id} className="hover:bg-surface-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                    {s.firstName} {s.lastName}
                  </td>
                  <td className="px-4 py-3 text-surface-400">{s.rollNumber || '—'}</td>
                  <td className="px-4 py-3 text-surface-400">{s.class ? `${s.class.grade} – ${s.class.section}` : '—'}</td>
                  <td className="px-4 py-3 text-surface-400">
                    <div>{s.parentName || '—'}</div>
                    {s.parentPhone && <div className="text-xs">{s.parentPhone}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md capitalize ${s.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-red-100 text-red-600'}`}>
                      {s.status || 'active'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(s)} className="text-xs text-brand-600 hover:text-brand-700 font-medium">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {editing ? 'Edit Student' : 'Add Student'}
            </h2>
            {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">{error}</p>}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">First Name *</label>
                  <input className="input" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Last Name *</label>
                  <input className="input" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Roll Number</label>
                  <input className="input" value={form.rollNumber} onChange={e => setForm(f => ({ ...f, rollNumber: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Class</label>
                  <select className="input" value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value }))}>
                    <option value="">— Select —</option>
                    {classes.map((c: any) => <option key={c.id} value={c.id}>{c.grade} – {c.section}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Date of Birth</label>
                  <input className="input" type="date" value={form.dateOfBirth} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Gender</label>
                  <select className="input" value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                    <option value="">— Select —</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <hr className="border-surface-200 dark:border-gray-700" />
              <p className="text-xs font-semibold text-surface-400 uppercase tracking-wide">Parent / Guardian</p>
              <div>
                <label className="label">Parent Name</label>
                <input className="input" value={form.parentName} onChange={e => setForm(f => ({ ...f, parentName: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Parent Phone</label>
                  <input className="input" value={form.parentPhone} onChange={e => setForm(f => ({ ...f, parentPhone: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Parent Email</label>
                  <input className="input" type="email" value={form.parentEmail} onChange={e => setForm(f => ({ ...f, parentEmail: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                {saving ? 'Saving...' : editing ? 'Update' : 'Add Student'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
