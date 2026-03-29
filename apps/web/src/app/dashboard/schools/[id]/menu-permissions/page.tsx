'use client';

import { useEffect, useState, useCallback } from 'react';

const ALL_MENU_ITEMS = [
  { id: 'dashboard',        label: 'Dashboard' },
  { id: 'admissions',       label: 'Admissions' },
  { id: 'classes',          label: 'Classes' },
  { id: 'students',         label: 'Students' },
  { id: 'teachers',         label: 'Teachers' },
  { id: 'parents',          label: 'Parents' },
  { id: 'attendance',       label: 'Attendance' },
  { id: 'fees',             label: 'Fees' },
  { id: 'scheduling',       label: 'Scheduling' },
  { id: 'timetable',        label: 'Timetable' },
  { id: 'events',           label: 'Events' },
  { id: 'exam',             label: 'Exam Management' },
  { id: 'syllabus',         label: 'Syllabus' },
  { id: 'school_inventory', label: 'School Inventory' },
  { id: 'homework',         label: 'Homework' },
  { id: 'performance',      label: 'Performance' },
  { id: 'announcements',    label: 'Announcements' },
  { id: 'leave',            label: 'Leave' },
  { id: 'queries',          label: 'Queries' },
  { id: 'transport',        label: 'Transport' },
  { id: 'compliance',       label: 'Compliance' },
  { id: 'reports',          label: 'Reports' },
  { id: 'settings',         label: 'Profile / Settings' },
  { id: 'sessions',         label: 'Career Sessions' },
  { id: 'online_classes',   label: 'Online Classes' },
];

const ROLES = [
  { id: 'school_admin', label: 'School Admin' },
  { id: 'teacher',      label: 'Teacher' },
  { id: 'parent',       label: 'Parent' },
  { id: 'hod',          label: 'Head of Department' },
  { id: 'principal',    label: 'Principal' },
  { id: 'employee',     label: 'Employee' },
  { id: 'student',      label: 'Student' },
];

export default function MenuPermissionsPage({ params }: { params: { id: string } }) {
  const schoolId = params.id;

  const [activeRole, setActiveRole] = useState('school_admin');
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [loading, setSaving_]     = useState(false);
  const [loadingRole, setLoadingRole] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Load permissions for a role from the API
  const loadRole = useCallback(async (role: string) => {
    // Already loaded
    if (permissions[role] !== undefined) return;
    setLoadingRole(true);
    try {
      const res  = await fetch(`/api/super-admin/schools/${schoolId}/menu-permissions?role=${role}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setPermissions(p => ({ ...p, [role]: data.menuKeys ?? [] }));
    } catch {}
    setLoadingRole(false);
  }, [schoolId, token, permissions]);

  useEffect(() => { loadRole(activeRole); }, [activeRole]);

  const toggleItem = (menuId: string) => {
    setPermissions(p => {
      const current = p[activeRole] || [];
      const updated = current.includes(menuId)
        ? current.filter(x => x !== menuId)
        : [...current, menuId];
      return { ...p, [activeRole]: updated };
    });
  };

  const selectAll = () => setPermissions(p => ({ ...p, [activeRole]: ALL_MENU_ITEMS.map(m => m.id) }));
  const clearAll  = () => setPermissions(p => ({ ...p, [activeRole]: [] }));

  const save = async () => {
    setSaving(true); setError(''); setSaved(false);
    try {
      const res = await fetch(`/api/super-admin/schools/${schoolId}/menu-permissions`, {
        method: 'POST', headers,
        body:   JSON.stringify({ role: activeRole, enabledItems: permissions[activeRole] ?? [] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  const currentPerms  = permissions[activeRole] ?? [];
  const isRoleLoaded  = permissions[activeRole] !== undefined;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Menu Permissions</h1>
        <p className="text-sm text-surface-400 mt-0.5">
          Control which menu items are visible per role for this school. Changes apply immediately when users next load the app.
        </p>
      </div>

      <div className="flex gap-6">
        {/* Role selector */}
        <div className="w-52 shrink-0 space-y-1">
          <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider px-3 mb-2">Roles</p>
          {ROLES.map(r => (
            <button
              key={r.id}
              onClick={() => setActiveRole(r.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeRole === r.id ? 'bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300' : 'text-surface-400 hover:bg-surface-50 dark:hover:bg-gray-700/40'}`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Permission grid */}
        <div className="flex-1 card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                {ROLES.find(r => r.id === activeRole)?.label}
              </h2>
              <p className="text-xs text-surface-400 mt-0.5">
                {isRoleLoaded
                  ? `${currentPerms.length} / ${ALL_MENU_ITEMS.length} items enabled`
                  : 'Loading…'}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-xs text-brand-600 hover:text-brand-700 font-medium">Select All</button>
              <span className="text-surface-300">|</span>
              <button onClick={clearAll} className="text-xs text-surface-400 hover:text-red-500 font-medium">Clear All</button>
            </div>
          </div>

          {loadingRole ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 bg-surface-100 dark:bg-gray-700 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ALL_MENU_ITEMS.map(item => (
                <label
                  key={item.id}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer border transition-all ${
                    currentPerms.includes(item.id)
                      ? 'border-brand-200 dark:border-brand-700 bg-brand-50 dark:bg-brand-950/20'
                      : 'border-surface-200 dark:border-gray-700 hover:border-brand-200 dark:hover:border-brand-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-brand-500"
                    checked={currentPerms.includes(item.id)}
                    onChange={() => toggleItem(item.id)}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
                </label>
              ))}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex items-center gap-3 pt-2 border-t border-surface-100 dark:border-gray-700">
            <button onClick={save} disabled={saving || !isRoleLoaded} className="btn btn-primary">
              {saving ? 'Saving…' : 'Save Permissions'}
            </button>
            {saved && (
              <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>
                Saved!
              </span>
            )}
            <span className="text-xs text-surface-400 ml-auto">
              Changes apply immediately to all users with this role
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
