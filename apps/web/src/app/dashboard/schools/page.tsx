'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';

interface School {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  website: string | null;
  status: string;
  subscriptionPlan: string;
  isDefault: boolean;
  latitude: number | null;
  longitude: number | null;
  boardType: string | null;
  createdAt: string;
  _count: { students: number; teachers: number };
}

const PLAN_STYLES: Record<string, string> = {
  basic:      'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  standard:   'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400',
  premium:    'bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400',
  enterprise: 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400',
};

const EMPTY_FORM = {
  name: '', email: '', phone: '', address: '', city: '', state: '',
  website: '', latitude: '', longitude: '', boardType: '', subscriptionPlan: 'basic', configSource: '',
};

export default function SchoolLibraryPage() {
  const router = useRouter();
  const [schools,    setSchools]    = useState<School[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [editSchool, setEditSchool] = useState<School | null>(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');

  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

  async function load() {
    setLoading(true);
    try {
      const res  = await fetch('/api/super-admin/schools', { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      setSchools(data.schools || []);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditSchool(null);
    setForm({ ...EMPTY_FORM, configSource: schools.find(s => s.isDefault)?.id || '' });
    setError('');
    setShowForm(true);
  }

  function openEdit(school: School) {
    setEditSchool(school);
    setForm({
      name: school.name, email: school.email || '', phone: school.phone || '',
      address: school.address || '', city: school.city || '', state: school.state || '',
      website: school.website || '', latitude: school.latitude?.toString() || '',
      longitude: school.longitude?.toString() || '', boardType: school.boardType || '',
      subscriptionPlan: school.subscriptionPlan, configSource: '',
    });
    setError('');
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const method = editSchool ? 'PATCH' : 'POST';
      const body   = editSchool ? { id: editSchool.id, ...form } : form;
      const res    = await fetch('/api/super-admin/schools', { method, headers: authHeaders(), body: JSON.stringify(body) });
      const data   = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to save school details — please try again'); return; }
      setShowForm(false);
      await load();
    } catch { setError('Network error'); }
    finally { setSaving(false); }
  }

  async function toggleStatus(school: School) {
    const newStatus = school.status === 'active' ? 'inactive' : 'active';
    await fetch('/api/super-admin/schools', { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ id: school.id, status: newStatus }) });
    await load();
  }

  async function markAsDefault(school: School) {
    await fetch('/api/super-admin/schools', { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ action: 'setDefault', id: school.id }) });
    await load();
  }

  const defaultSchool  = schools.find(s => s.isDefault);
  const regularSchools = schools.filter(s => !s.isDefault);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">School Library</h1>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">Register and manage all schools on the platform.</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Register School
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Schools', value: schools.length,                                    color: 'text-gray-900 dark:text-gray-100' },
          { label: 'Active',        value: schools.filter(s => s.status === 'active').length,  color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Inactive',      value: schools.filter(s => s.status !== 'active').length,  color: 'text-red-600 dark:text-red-400' },
          { label: 'Total Students',value: schools.reduce((n, s) => n + s._count.students, 0), color: 'text-brand-600 dark:text-brand-400' },
        ].map(stat => (
          <div key={stat.label} className="card p-4">
            <p className="text-xs font-semibold text-surface-400 dark:text-gray-500 uppercase tracking-wider">{stat.label}</p>
            <p className={`text-2xl font-display font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-surface-400">Loading schools...</div>
      ) : schools.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-sm text-surface-400">No schools registered yet.</p>
          <button onClick={openCreate} className="mt-3 text-sm text-brand-500 font-medium hover:underline">Register your first school →</button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Default School */}
          {defaultSchool && (
            <div>
              <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Default School (Configuration Template)</p>
              <SchoolCard school={defaultSchool} onEdit={openEdit} onToggle={toggleStatus} onSetDefault={markAsDefault} onConfigure={id => router.push(`/dashboard/schools/${id}`)} />
            </div>
          )}

          {/* All Other Schools */}
          {regularSchools.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Registered Schools ({regularSchools.length})</p>
              <div className="space-y-3">
                {regularSchools.map(s => (
                  <SchoolCard key={s.id} school={s} onEdit={openEdit} onToggle={toggleStatus} onSetDefault={markAsDefault} onConfigure={id => router.push(`/dashboard/schools/${id}`)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Register / Edit Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editSchool ? 'Edit School' : 'Register School'}>
        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Basic info */}
          <div>
            <label className="label">School Name *</label>
            <input className="input-field" required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Greenwood International School"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Board Type</label>
              <select className="input-field" value={form.boardType} onChange={e => setForm(f => ({...f, boardType: e.target.value}))}>
                <option value="">Select board</option>
                <option value="CBSE">CBSE</option>
                <option value="ICSE">ICSE</option>
                <option value="State">State Board</option>
                <option value="IB">IB</option>
                <option value="Cambridge">Cambridge</option>
              </select>
            </div>
            <div>
              <label className="label">Subscription Plan</label>
              <select className="input-field" value={form.subscriptionPlan} onChange={e => setForm(f => ({...f, subscriptionPlan: e.target.value}))}>
                <option value="basic">Basic</option>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input-field" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="admin@school.com"/>
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input-field" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} placeholder="+91 98765 43210"/>
            </div>
          </div>
          <div>
            <label className="label">Address</label>
            <textarea className="input-field resize-none" rows={2} value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} placeholder="Full address..."/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">City</label>
              <input className="input-field" value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))} placeholder="City"/>
            </div>
            <div>
              <label className="label">State</label>
              <input className="input-field" value={form.state} onChange={e => setForm(f => ({...f, state: e.target.value}))} placeholder="State"/>
            </div>
          </div>
          <div>
            <label className="label">Website</label>
            <input className="input-field" value={form.website} onChange={e => setForm(f => ({...f, website: e.target.value}))} placeholder="https://school.edu.in"/>
          </div>
          {/* Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Latitude</label>
              <input type="number" step="any" className="input-field" value={form.latitude} onChange={e => setForm(f => ({...f, latitude: e.target.value}))} placeholder="28.6139"/>
            </div>
            <div>
              <label className="label">Longitude</label>
              <input type="number" step="any" className="input-field" value={form.longitude} onChange={e => setForm(f => ({...f, longitude: e.target.value}))} placeholder="77.2090"/>
            </div>
          </div>
          {/* Config source (only on create) */}
          {!editSchool && schools.length > 0 && (
            <div>
              <label className="label">Clone Configuration From</label>
              <select className="input-field" value={form.configSource} onChange={e => setForm(f => ({...f, configSource: e.target.value}))}>
                <option value="">— Start fresh —</option>
                {schools.map(s => (
                  <option key={s.id} value={s.id}>{s.name}{s.isDefault ? ' (Default)' : ''}</option>
                ))}
              </select>
              <p className="text-xs text-surface-400 mt-1">Configurations are cloned once at creation and do not auto-update.</p>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : editSchool ? 'Save Changes' : 'Register School'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function SchoolCard({
  school, onEdit, onToggle, onSetDefault, onConfigure,
}: {
  school: School;
  onEdit: (s: School) => void;
  onToggle: (s: School) => void;
  onSetDefault: (s: School) => void;
  onConfigure: (id: string) => void;
}) {
  return (
    <div className={`card p-5 ${school.isDefault ? 'border-brand-200 dark:border-brand-800 bg-gradient-to-r from-brand-50/40 to-transparent dark:from-brand-950/20' : ''}`}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${school.isDefault ? 'bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-400' : 'bg-surface-100 dark:bg-gray-800 text-surface-400'}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 22V12h6v10M3 9h18M9 3v6M15 3v6"/></svg>
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{school.name}</h3>
            {school.isDefault && (
              <span className="text-[10px] bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Default</span>
            )}
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md capitalize ${school.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400'}`}>
              {school.status}
            </span>
            {school.boardType && (
              <span className="text-[10px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md font-medium">{school.boardType}</span>
            )}
            {school.subscriptionPlan && (
              <span className="text-[10px] bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-md font-medium capitalize">{school.subscriptionPlan}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-xs text-surface-400">
            {(school.city || school.state) && <span>{[school.city, school.state].filter(Boolean).join(', ')}</span>}
            {school.email && <span>{school.email}</span>}
            {school.phone && <span>{school.phone}</span>}
          </div>
          <div className="flex gap-4 mt-2 text-xs text-surface-400">
            <span className="font-medium text-gray-600 dark:text-gray-400">{school._count.students} students</span>
            <span className="font-medium text-gray-600 dark:text-gray-400">{school._count.teachers} teachers</span>
            {school.latitude && school.longitude && (
              <span>📍 {school.latitude.toFixed(4)}, {school.longitude.toFixed(4)}</span>
            )}
          </div>
        </div>
        {/* Actions */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          <button
            onClick={() => onConfigure(school.id)}
            className="text-xs bg-brand-500 text-white px-3 py-1.5 rounded-lg hover:bg-brand-600 font-medium transition-colors flex items-center gap-1.5"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 0-14.14 0M4.93 19.07a10 10 0 0 0 14.14 0M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>
            Configure
          </button>
          <button onClick={() => onEdit(school)} className="text-xs border border-surface-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 px-3 py-1.5 rounded-lg hover:bg-surface-50 dark:hover:bg-gray-800 font-medium transition-colors">
            Edit
          </button>
          {!school.isDefault && (
            <button onClick={() => onSetDefault(school)} className="text-xs border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 px-3 py-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 font-medium transition-colors">
              Set Default
            </button>
          )}
          <button
            onClick={() => onToggle(school)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${school.status === 'active' ? 'text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400'}`}
          >
            {school.status === 'active' ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>
    </div>
  );
}
