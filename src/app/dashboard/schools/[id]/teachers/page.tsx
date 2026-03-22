'use client';

import { useEffect, useState } from 'react';

export default function SchoolTeachersPage({ params }: { params: { id: string } }) {
  const schoolId = params.id;
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '', employeeId: '', qualification: '', joiningDate: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const token = () => localStorage.getItem('token') || '';
  const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/super-admin/schools/${schoolId}/teachers`, { headers: headers() });
      const d = await r.json();
      setTeachers(d.teachers || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [schoolId]);

  async function handleAdd() {
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      setError('First name, last name, email and password are required'); return;
    }
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/super-admin/schools/${schoolId}/teachers`, {
        method: 'POST', headers: headers(), body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setShowModal(false);
      setForm({ firstName: '', lastName: '', email: '', password: '', phone: '', employeeId: '', qualification: '', joiningDate: '' });
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(teacher: any) {
    const newStatus = teacher.status === 'active' ? 'inactive' : 'active';
    try {
      await fetch(`/api/super-admin/schools/${schoolId}/teachers`, {
        method: 'PATCH', headers: headers(),
        body: JSON.stringify({ id: teacher.id, status: newStatus }),
      });
      load();
    } catch {}
  }

  const active = teachers.filter(t => t.status === 'active');
  const inactive = teachers.filter(t => t.status !== 'active');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Teachers</h1>
          <p className="text-sm text-surface-400 mt-0.5">{active.length} active · {inactive.length} inactive</p>
        </div>
        <button onClick={() => { setForm({ firstName: '', lastName: '', email: '', password: '', phone: '', employeeId: '', qualification: '', joiningDate: '' }); setError(''); setShowModal(true); }} className="btn btn-primary flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Teacher
        </button>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-surface-400">Loading teachers...</div>
      ) : teachers.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">👩‍🏫</div>
          <p className="text-surface-400 text-sm">No teachers added yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-surface-400 uppercase tracking-wide mb-3">Active Teachers</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {active.map(t => <TeacherCard key={t.id} teacher={t} onToggle={() => toggleStatus(t)} />)}
              </div>
            </div>
          )}
          {inactive.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-surface-400 uppercase tracking-wide mb-3">Inactive Teachers</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {inactive.map(t => <TeacherCard key={t.id} teacher={t} onToggle={() => toggleStatus(t)} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add Teacher</h2>
            {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">{error}</p>}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">First Name *</label><input className="input" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} /></div>
                <div><label className="label">Last Name *</label><input className="input" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} /></div>
              </div>
              <div><label className="label">Email *</label><input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><label className="label">Password *</label><input className="input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div><label className="label">Employee ID</label><input className="input" value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Qualification</label><input className="input" placeholder="e.g. B.Ed, M.Sc" value={form.qualification} onChange={e => setForm(f => ({ ...f, qualification: e.target.value }))} /></div>
                <div><label className="label">Joining Date</label><input className="input" type="date" value={form.joiningDate} onChange={e => setForm(f => ({ ...f, joiningDate: e.target.value }))} /></div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleAdd} disabled={saving} className="btn btn-primary">{saving ? 'Adding...' : 'Add Teacher'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TeacherCard({ teacher, onToggle }: { teacher: any; onToggle: () => void }) {
  const isActive = teacher.status === 'active';
  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold text-gray-900 dark:text-gray-100">{teacher.firstName} {teacher.lastName}</div>
          <div className="text-xs text-surface-400 mt-0.5">{teacher.email}</div>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
          {isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
      {teacher.phone && <div className="text-xs text-surface-400">{teacher.phone}</div>}
      <button
        onClick={onToggle}
        className={`w-full text-sm font-medium py-1.5 rounded-lg transition-colors ${isActive ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50'}`}
      >
        {isActive ? 'Deactivate' : 'Reactivate'}
      </button>
    </div>
  );
}
