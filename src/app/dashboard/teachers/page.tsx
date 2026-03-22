'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', phone: '', employee_id: '', qualification: '', joining_date: '' });

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const user  = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
  const isAdmin = ['school_admin', 'super_admin'].includes(user.primaryRole);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchTeachers = () => {
    fetch('/api/teachers', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setTeachers(d.teachers || []); setLoading(false); });
  };

  useEffect(() => { fetchTeachers(); }, [token]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    const res = await fetch('/api/teachers', { method: 'POST', headers, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setSaveError(data.error || 'Failed to add teacher'); setSaving(false); return; }
    setShowAddModal(false);
    setForm({ first_name: '', last_name: '', email: '', password: '', phone: '', employee_id: '', qualification: '', joining_date: '' });
    fetchTeachers();
    setSaving(false);
  };

  const handleToggleStatus = async (teacherId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await fetch('/api/teachers', { method: 'PATCH', headers, body: JSON.stringify({ id: teacherId, status: newStatus }) });
    fetchTeachers();
  };

  const active   = teachers.filter(t => t.status === 'active');
  const inactive = teachers.filter(t => t.status !== 'active');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Teachers</h1>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">
            {active.length} active · {inactive.length} inactive
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Teacher
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="card p-5 h-36 animate-pulse bg-surface-100"/>)}
        </div>
      ) : teachers.length === 0 ? (
        <div className="card p-12 text-center"><p className="text-surface-400">No teachers found.</p></div>
      ) : (
        <div className="space-y-6">
          {/* Active Teachers */}
          {active.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Active ({active.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {active.map(t => <TeacherCard key={t.id} teacher={t} isAdmin={isAdmin} onToggle={handleToggleStatus} />)}
              </div>
            </div>
          )}
          {/* Inactive Teachers */}
          {inactive.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Inactive ({inactive.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inactive.map(t => <TeacherCard key={t.id} teacher={t} isAdmin={isAdmin} onToggle={handleToggleStatus} />)}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Teacher">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First Name *</label>
              <input className="input-field" required value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} placeholder="First name"/>
            </div>
            <div>
              <label className="label">Last Name *</label>
              <input className="input-field" required value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} placeholder="Last name"/>
            </div>
          </div>
          <div>
            <label className="label">Email *</label>
            <input type="email" className="input-field" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="teacher@school.edu"/>
          </div>
          <div>
            <label className="label">Password *</label>
            <input type="password" className="input-field" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Temporary password"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Phone</label>
              <input className="input-field" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+91 XXXXX XXXXX"/>
            </div>
            <div>
              <label className="label">Employee ID</label>
              <input className="input-field" value={form.employee_id} onChange={e => setForm({...form, employee_id: e.target.value})} placeholder="EMP-001"/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Qualification</label>
              <input className="input-field" value={form.qualification} onChange={e => setForm({...form, qualification: e.target.value})} placeholder="B.Ed, M.A..."/>
            </div>
            <div>
              <label className="label">Joining Date</label>
              <input type="date" className="input-field" value={form.joining_date} onChange={e => setForm({...form, joining_date: e.target.value})}/>
            </div>
          </div>
          {saveError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{saveError}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Adding...' : 'Add Teacher'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function TeacherCard({ teacher: t, isAdmin, onToggle }: { teacher: any; isAdmin: boolean; onToggle: (id: string, status: string) => void }) {
  const isActive = t.status === 'active';
  return (
    <div className={`card p-5 ${!isActive ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold flex-shrink-0 ${isActive ? 'bg-brand-50 text-brand-600' : 'bg-surface-100 text-surface-400'}`}>
          {t.first_name[0]}{t.last_name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t.first_name} {t.last_name}</h3>
            {!isActive && <span className="text-[10px] bg-surface-100 text-surface-400 px-1.5 py-0.5 rounded font-medium">Inactive</span>}
          </div>
          {t.employee_id && <p className="text-xs text-surface-400 mt-0.5">{t.employee_id}</p>}
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-surface-100 space-y-1">
        <p className="text-xs text-surface-400 flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          {t.email}
        </p>
        {t.phone && (
          <p className="text-xs text-surface-400 flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            {t.phone}
          </p>
        )}
        {t.qualification && <p className="text-xs text-surface-400">{t.qualification}</p>}
      </div>
      {isAdmin && (
        <div className="mt-3 pt-3 border-t border-surface-100">
          <button
            onClick={() => onToggle(t.id, t.status)}
            className={`w-full text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
              isActive
                ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400'
                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400'
            }`}
          >
            {isActive ? 'Deactivate' : 'Reactivate'}
          </button>
        </div>
      )}
    </div>
  );
}
