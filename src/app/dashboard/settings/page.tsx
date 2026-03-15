'use client';

import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));
  }, []);

  if (!user) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-surface-400 mt-0.5">Manage your account and school preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile */}
        <div className="lg:col-span-2 card p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Profile Information</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-surface-50 rounded-xl">
              <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-600 text-xl font-bold">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </div>
              <div>
                <p className="font-display font-semibold text-gray-900">{user.firstName} {user.lastName}</p>
                <p className="text-sm text-surface-400">{user.email}</p>
                <p className="text-xs text-surface-400 mt-0.5 capitalize">{user.primaryRole?.replace('_', ' ')} at {user.schoolName || 'Yulaa Platform'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">First Name</label>
                <input className="input-field" defaultValue={user.firstName} readOnly />
              </div>
              <div>
                <label className="label">Last Name</label>
                <input className="input-field" defaultValue={user.lastName} readOnly />
              </div>
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input-field" defaultValue={user.email} readOnly />
            </div>
            <p className="text-xs text-surface-400">Profile editing will be available in a future update.</p>
          </div>
        </div>

        {/* Roles */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Your Roles</h3>
          <div className="space-y-2">
            {user.roles?.map((r: any, i: number) => (
              <div key={i} className="p-3 bg-surface-50 rounded-xl">
                <p className="text-sm font-medium text-gray-900 capitalize">{r.role_name}</p>
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
          <h3 className="text-sm font-semibold text-gray-900 mb-4">School Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'School Name', value: user.schoolName || '—' },
              { label: 'Plan', value: 'Pro' },
              { label: 'Academic Year', value: '2025-2026' },
            ].map((item, i) => (
              <div key={i} className="p-4 bg-surface-50 rounded-xl">
                <p className="text-xs text-surface-400 mb-1">{item.label}</p>
                <p className="text-sm font-semibold text-gray-900">{item.value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-surface-400 mt-4">Full school configuration will be available in a future update.</p>
        </div>
      )}
    </div>
  );
}
