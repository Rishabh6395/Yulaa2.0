'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';

interface School {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: string;
  subscriptionPlan: string;
  createdAt: string;
  _count: { students: number; teachers: number };
}

const PLAN_STYLES: Record<string, string> = {
  basic:      'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  standard:   'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400',
  premium:    'bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400',
  enterprise: 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400',
};

const STATUS_STYLES: Record<string, string> = {
  active:   'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400',
  inactive: 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400',
  pending:  'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400',
};

const EMPTY_FORM = { name: '', email: '', phone: '', address: '', subscriptionPlan: 'basic' };

export default function SchoolsPage() {
  const [schools,     setSchools]     = useState<School[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [editSchool,  setEditSchool]  = useState<School | null>(null);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  function getToken() {
    return typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  }

  async function load() {
    setLoading(true);
    try {
      const res  = await fetch('/api/super-admin/schools', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setSchools(data.schools || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditSchool(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowForm(true);
  }

  function openEdit(school: School) {
    setEditSchool(school);
    setForm({
      name:             school.name,
      email:            school.email || '',
      phone:            school.phone || '',
      address:          school.address || '',
      subscriptionPlan: school.subscriptionPlan,
    });
    setError('');
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const method = editSchool ? 'PATCH' : 'POST';
      const body   = editSchool ? { id: editSchool.id, ...form } : form;
      const res    = await fetch('/api/super-admin/schools', {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong'); return; }
      setShowForm(false);
      await load();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(school: School) {
    const newStatus = school.status === 'active' ? 'inactive' : 'active';
    await fetch('/api/super-admin/schools', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ id: school.id, status: newStatus }),
    });
    await load();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Schools</h1>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">Register and manage all schools on the platform.</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Register School
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total',    value: schools.length,                                    color: 'text-gray-900 dark:text-gray-100' },
          { label: 'Active',   value: schools.filter(s => s.status === 'active').length,  color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Inactive', value: schools.filter(s => s.status !== 'active').length,  color: 'text-red-600 dark:text-red-400' },
          { label: 'Students', value: schools.reduce((n, s) => n + s._count.students, 0), color: 'text-brand-600 dark:text-brand-400' },
        ].map(stat => (
          <div key={stat.label} className="card p-4">
            <p className="text-xs font-semibold text-surface-400 dark:text-gray-500 uppercase tracking-wider">{stat.label}</p>
            <p className={`text-2xl font-display font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-surface-400 dark:text-gray-500">Loading...</div>
        ) : schools.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-surface-400 dark:text-gray-500">No schools registered yet.</p>
            <button onClick={openCreate} className="mt-3 text-sm text-brand-500 dark:text-brand-400 font-medium hover:underline">Register your first school →</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100 dark:border-gray-800 bg-surface-50 dark:bg-gray-900/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 dark:text-gray-500 uppercase tracking-wider">School</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 dark:text-gray-500 uppercase tracking-wider hidden md:table-cell">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 dark:text-gray-500 uppercase tracking-wider hidden sm:table-cell">Plan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 dark:text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 dark:text-gray-500 uppercase tracking-wider hidden lg:table-cell">Students / Teachers</th>
                  <th className="px-4 py-3"/>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-gray-800">
                {schools.map(school => (
                  <tr key={school.id} className="hover:bg-surface-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{school.name}</p>
                      <p className="text-xs text-surface-400 dark:text-gray-500 mt-0.5">
                        {new Date(school.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-gray-700 dark:text-gray-300">{school.email || '—'}</p>
                      <p className="text-xs text-surface-400 dark:text-gray-500">{school.phone || ''}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-md capitalize ${PLAN_STYLES[school.subscriptionPlan] || PLAN_STYLES.basic}`}>
                        {school.subscriptionPlan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-md capitalize ${STATUS_STYLES[school.status] || STATUS_STYLES.active}`}>
                        {school.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-600 dark:text-gray-400">
                      {school._count.students} / {school._count.teachers}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => openEdit(school)}
                          className="text-xs text-brand-500 dark:text-brand-400 hover:underline font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleStatus(school)}
                          className={`text-xs font-medium hover:underline ${school.status === 'active' ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}
                        >
                          {school.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editSchool ? 'Edit School' : 'Register School'}>
        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-3 py-2 rounded-lg mb-4">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">School Name *</label>
            <input
              className="input-field w-full"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Greenwood International School"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input-field w-full" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="admin@school.com" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input-field w-full" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" />
            </div>
          </div>
          <div>
            <label className="label">Address</label>
            <textarea className="input-field w-full resize-none" rows={2} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Full address..." />
          </div>
          <div>
            <label className="label">Subscription Plan</label>
            <select className="input-field w-full" value={form.subscriptionPlan} onChange={e => setForm(f => ({ ...f, subscriptionPlan: e.target.value }))}>
              <option value="basic">Basic</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : editSchool ? 'Save Changes' : 'Register School'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
