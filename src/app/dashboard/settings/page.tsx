'use client';

import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [user,      setUser]      = useState<any>(null);
  const [form,      setForm]      = useState({ first_name: '', last_name: '', phone: '' });
  const [saving,    setSaving]    = useState(false);
  const [message,   setMessage]   = useState('');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const u = JSON.parse(userData);
      setUser(u);
      setForm({ first_name: u.firstName || '', last_name: u.lastName || '', phone: u.phone || '' });
    }
  }, []);

  if (!user) return null;

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setSaveError('');
    try {
      const res  = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) { setSaveError(body.error || 'Failed to save'); setSaving(false); return; }

      // Update localStorage so navbar/header reflects new name
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        u.firstName = body.profile.firstName;
        u.lastName  = body.profile.lastName;
        u.phone     = body.profile.phone;
        localStorage.setItem('user', JSON.stringify(u));
        setUser({ ...u });
      }
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch { setSaveError('Network error. Please try again.'); }
    setSaving(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-sm text-surface-400 mt-0.5">Manage your account and school preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile */}
        <div className="lg:col-span-2 card p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Profile Information</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-surface-50 dark:bg-gray-800/50 rounded-xl">
              <div className="w-16 h-16 rounded-2xl bg-brand-100 dark:bg-brand-950/60 flex items-center justify-center text-brand-600 dark:text-brand-400 text-xl font-bold">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </div>
              <div>
                <p className="font-display font-semibold text-gray-900 dark:text-gray-100">{user.firstName} {user.lastName}</p>
                <p className="text-sm text-surface-400">{user.email}</p>
                <p className="text-xs text-surface-400 mt-0.5 capitalize">{user.primaryRole?.replace('_', ' ')} at {user.schoolName || 'Yulaa Platform'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">First Name *</label>
                <input
                  className="input-field"
                  required
                  value={form.first_name}
                  onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Last Name *</label>
                <input
                  className="input-field"
                  required
                  value={form.last_name}
                  onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input-field bg-surface-50 dark:bg-gray-800" defaultValue={user.email} readOnly />
              <p className="text-xs text-surface-400 mt-1">Email cannot be changed. Contact your administrator.</p>
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                className="input-field"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+91 00000 00000"
              />
            </div>

            {message   && <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{message}</p>}
            {saveError && <p className="text-sm text-red-600 dark:text-red-400 font-medium">{saveError}</p>}

            <div className="flex justify-end pt-1">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Roles */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Your Roles</h3>
          <div className="space-y-2">
            {user.roles?.map((r: any, i: number) => (
              <div key={i} className="p-3 bg-surface-50 dark:bg-gray-800/50 rounded-xl">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">{r.role_name}</p>
                <p className="text-xs text-surface-400">{r.school_name || 'Platform-wide'}</p>
                {r.is_primary && <span className="badge-info text-[10px] mt-1">Primary</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* School Settings (admin only) */}
      {['school_admin', 'super_admin'].includes(user.primaryRole) && (
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">School Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'School Name', value: user.schoolName || '—' },
              { label: 'Plan', value: 'Pro' },
              { label: 'Academic Year', value: '2025-2026' },
            ].map((item, i) => (
              <div key={i} className="p-4 bg-surface-50 dark:bg-gray-800/50 rounded-xl">
                <p className="text-xs text-surface-400 mb-1">{item.label}</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
