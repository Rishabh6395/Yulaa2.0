'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const ROLE_OPTIONS = [
  { value: 'school_admin', label: 'School Admin' },
  { value: 'principal',    label: 'Principal' },
  { value: 'hod',          label: 'Head of Department' },
  { value: 'vice_principal', label: 'Vice Principal' },
];

interface Settings {
  allowTaskReassign: boolean;
  taskReassignRoles: string[];
  spocEnabled:       boolean;
  defaultSpocUserId: string | null;
}

const DEFAULT: Settings = {
  allowTaskReassign: false,
  taskReassignRoles: ['school_admin', 'principal'],
  spocEnabled:       false,
  defaultSpocUserId: null,
};

export default function AdmissionSettingsPage() {
  const { id: schoolId } = useParams<{ id: string }>();
  const router = useRouter();

  const [settings, setSettings] = useState<Settings>(DEFAULT);
  const [users,    setUsers]    = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState('');

  const token   = () => localStorage.getItem('token') || '';
  const headers = (json = true) => ({
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    Authorization: `Bearer ${token()}`,
  });

  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/super-admin/schools/${schoolId}/admission-settings`, { headers: headers(false) }).then(r => r.json()),
      fetch(`/api/super-admin/schools/${schoolId}/users`, { headers: headers(false) }).then(r => r.json()),
    ]).then(([settingsData, usersData]) => {
      if (settingsData.settings) setSettings({ ...DEFAULT, ...settingsData.settings });
      setUsers(usersData.users || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [schoolId]);

  function toggleRole(role: string) {
    setSettings(prev => ({
      ...prev,
      taskReassignRoles: prev.taskReassignRoles.includes(role)
        ? prev.taskReassignRoles.filter(r => r !== role)
        : [...prev.taskReassignRoles, role],
    }));
  }

  async function save() {
    setSaving(true); setError(''); setSaved(false);
    try {
      const res = await fetch(`/api/super-admin/schools/${schoolId}/admission-settings`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setSettings({ ...DEFAULT, ...data.settings });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="card p-8 text-center text-sm text-surface-400">Loading settings...</div>;
  }

  const spocUsers = users.filter((u: any) =>
    u.roles?.some((r: any) => ['school_admin', 'principal', 'hod', 'vice_principal'].includes(r.role_code))
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/dashboard/schools/${schoolId}`)}
          className="text-surface-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15,18 9,12 15,6"/></svg>
        </button>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Admission Settings</h1>
          <p className="text-sm text-surface-400 mt-0.5">Configure task reassignment and SPOC for the admission workflow</p>
        </div>
      </div>

      {/* Task Reassignment */}
      <div className="card p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Task Reassignment</h2>
            <p className="text-sm text-surface-400 mt-0.5">Allow designated roles to reassign workflow tasks to other staff members.</p>
          </div>
          <button
            onClick={() => setSettings(prev => ({ ...prev, allowTaskReassign: !prev.allowTaskReassign }))}
            className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${settings.allowTaskReassign ? 'bg-brand-500' : 'bg-surface-200 dark:bg-gray-600'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.allowTaskReassign ? 'translate-x-5' : ''}`} />
          </button>
        </div>

        {settings.allowTaskReassign && (
          <div className="pt-2 border-t border-surface-100 dark:border-gray-700">
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-3">Roles permitted to reassign</p>
            <div className="flex flex-wrap gap-2">
              {ROLE_OPTIONS.map(opt => {
                const active = settings.taskReassignRoles.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => toggleRole(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                      active
                        ? 'bg-brand-50 dark:bg-brand-950/30 border-brand-400 text-brand-700 dark:text-brand-300'
                        : 'border-surface-200 dark:border-gray-600 text-surface-500 dark:text-gray-400 hover:border-brand-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {settings.taskReassignRoles.length === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">Select at least one role, otherwise no one can reassign tasks.</p>
            )}
          </div>
        )}
      </div>

      {/* SPOC Configuration */}
      <div className="card p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">SPOC Involvement</h2>
            <p className="text-sm text-surface-400 mt-0.5">
              Enable a Single Point of Contact (SPOC) to be assigned at each admission workflow stage (except the initial stage) for coordination.
            </p>
          </div>
          <button
            onClick={() => setSettings(prev => ({
              ...prev,
              spocEnabled:       !prev.spocEnabled,
              defaultSpocUserId: !prev.spocEnabled ? prev.defaultSpocUserId : null,
            }))}
            className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${settings.spocEnabled ? 'bg-brand-500' : 'bg-surface-200 dark:bg-gray-600'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.spocEnabled ? 'translate-x-5' : ''}`} />
          </button>
        </div>

        {settings.spocEnabled && (
          <div className="pt-2 border-t border-surface-100 dark:border-gray-700 space-y-3">
            <div>
              <label className="text-xs font-semibold text-surface-400 uppercase tracking-wide block mb-1.5">
                Default SPOC
              </label>
              <p className="text-xs text-surface-400 mb-2">
                This user will be pre-selected as SPOC when configuring workflow stages. Each stage can override this individually.
              </p>
              <select
                value={settings.defaultSpocUserId ?? ''}
                onChange={e => setSettings(prev => ({ ...prev, defaultSpocUserId: e.target.value || null }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                <option value="">— No default SPOC —</option>
                {spocUsers.length === 0 && users.length > 0 && (
                  <option disabled>No admin/principal users found</option>
                )}
                {(spocUsers.length > 0 ? spocUsers : users).map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-xs text-blue-700 dark:text-blue-400 flex items-start gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 flex-shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>SPOC can be set or overridden per stage in the Admission Workflow configuration.</span>
            </div>
          </div>
        )}
      </div>

      {/* Save */}
      <div className="flex items-center justify-between gap-4">
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {!error && saved && <p className="text-sm text-emerald-600 dark:text-emerald-400">Settings saved successfully.</p>}
        {!error && !saved && <span />}
        <button
          onClick={save}
          disabled={saving}
          className="btn-primary px-6 py-2 text-sm disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
