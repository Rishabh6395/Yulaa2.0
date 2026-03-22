'use client';

import { useEffect, useState } from 'react';

const DEFAULT_MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'students', label: 'Students' },
  { id: 'teachers', label: 'Teachers' },
  { id: 'classes', label: 'Classes' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'fees', label: 'Fees' },
  { id: 'homework', label: 'Homework' },
  { id: 'performance', label: 'Performance' },
  { id: 'leave', label: 'Leave' },
  { id: 'queries', label: 'Queries' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'transport', label: 'Transport' },
  { id: 'reports', label: 'Reports' },
  { id: 'admissions', label: 'Admissions' },
];

const ROLES = [
  { id: 'school_admin', label: 'School Admin' },
  { id: 'teacher', label: 'Teacher' },
  { id: 'parent', label: 'Parent' },
  { id: 'hod', label: 'Head of Department' },
  { id: 'principal', label: 'Principal' },
];

// Default permissions matrix: role -> menu items
const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  school_admin: DEFAULT_MENU_ITEMS.map(m => m.id),
  teacher: ['dashboard', 'students', 'classes', 'attendance', 'homework', 'performance', 'leave', 'queries', 'announcements'],
  parent: ['dashboard', 'attendance', 'fees', 'homework', 'performance', 'leave', 'queries', 'announcements'],
  hod: ['dashboard', 'students', 'teachers', 'classes', 'attendance', 'homework', 'performance', 'leave', 'queries', 'announcements', 'reports'],
  principal: DEFAULT_MENU_ITEMS.map(m => m.id),
};

export default function MenuPermissionsPage({ params }: { params: { id: string } }) {
  const [activeRole, setActiveRole] = useState('school_admin');
  const [permissions, setPermissions] = useState<Record<string, string[]>>(DEFAULT_PERMISSIONS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggleItem(menuId: string) {
    setPermissions(p => {
      const current = p[activeRole] || [];
      const updated = current.includes(menuId) ? current.filter(x => x !== menuId) : [...current, menuId];
      return { ...p, [activeRole]: updated };
    });
  }

  function selectAll() {
    setPermissions(p => ({ ...p, [activeRole]: DEFAULT_MENU_ITEMS.map(m => m.id) }));
  }

  function clearAll() {
    setPermissions(p => ({ ...p, [activeRole]: [] }));
  }

  async function save() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const currentPerms = permissions[activeRole] || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Menu Permissions</h1>
        <p className="text-sm text-surface-400 mt-0.5">Control which menu items are visible per role for this school.</p>
      </div>

      <div className="flex gap-6">
        {/* Role selector */}
        <div className="w-48 shrink-0 space-y-1">
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
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              {ROLES.find(r => r.id === activeRole)?.label}
            </h2>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-xs text-brand-600 hover:text-brand-700 font-medium">Select All</button>
              <span className="text-surface-300">|</span>
              <button onClick={clearAll} className="text-xs text-surface-400 hover:text-red-500 font-medium">Clear All</button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DEFAULT_MENU_ITEMS.map(item => (
              <label
                key={item.id}
                className={`flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer border transition-all ${currentPerms.includes(item.id) ? 'border-brand-200 dark:border-brand-700 bg-brand-50 dark:bg-brand-950/20' : 'border-surface-200 dark:border-gray-700 hover:border-brand-200 dark:hover:border-brand-700'}`}
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

          <div className="flex items-center gap-3 pt-2 border-t border-surface-100 dark:border-gray-700">
            <button onClick={save} disabled={saving} className="btn btn-primary">
              {saving ? 'Saving...' : 'Save Permissions'}
            </button>
            {saved && <span className="text-sm text-emerald-600 font-medium">Saved!</span>}
            <span className="text-xs text-surface-400 ml-auto">{currentPerms.length} / {DEFAULT_MENU_ITEMS.length} items enabled</span>
          </div>
        </div>
      </div>
    </div>
  );
}
