'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { menuItems as allMenuItems, type MenuItem } from '@/lib/menuConfig';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PermItem {
  key: string;
  label: string;
  enabled: boolean;
  isGroup: boolean;
  children?: PermItem[];
}

// ─── Roles shown in the management UI ─────────────────────────────────────────

const ROLES = [
  { id: 'school_admin', label: 'School Admin' },
  { id: 'principal',    label: 'Principal' },
  { id: 'hod',          label: 'Head of Department' },
  { id: 'teacher',      label: 'Teacher' },
  { id: 'parent',       label: 'Parent' },
  { id: 'student',      label: 'Student' },
  { id: 'employee',     label: 'Employee' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build the ordered, enabled-state PermItem tree for a role.
 * Applies stored sortOrder + enabled values; falls back to config defaults.
 */
function buildTree(
  role: string,
  saved: { key: string; enabled: boolean; sortOrder: number }[],
): PermItem[] {
  const base: MenuItem[] = allMenuItems[role] ?? [];
  const savedMap         = new Map(saved.map(s => [s.key, s]));

  const topLevel = [...base].sort((a, b) => {
    const sa = savedMap.get(a.key)?.sortOrder ?? 99999;
    const sb = savedMap.get(b.key)?.sortOrder ?? 99999;
    if (sa !== sb) return sa - sb;
    return base.indexOf(a) - base.indexOf(b);
  });

  return topLevel.map(item => {
    const s = savedMap.get(item.key);
    if (item.children) {
      const sortedChildren = [...item.children].sort((a, b) => {
        const sa = savedMap.get(a.key)?.sortOrder ?? 99999;
        const sb = savedMap.get(b.key)?.sortOrder ?? 99999;
        if (sa !== sb) return sa - sb;
        return item.children!.indexOf(a) - item.children!.indexOf(b);
      });
      return {
        key:      item.key,
        label:    item.label,
        enabled:  true, // group visibility driven by children
        isGroup:  true,
        children: sortedChildren.map(c => {
          const sc = savedMap.get(c.key);
          return { key: c.key, label: c.label, enabled: sc?.enabled ?? true, isGroup: false };
        }),
      };
    }
    return { key: item.key, label: item.label, enabled: s?.enabled ?? true, isGroup: false };
  });
}

/**
 * Flatten the PermItem tree into a flat list with global sortOrder values
 * suitable for saving to the API.
 */
function flatten(items: PermItem[]): { key: string; enabled: boolean; sortOrder: number }[] {
  const result: { key: string; enabled: boolean; sortOrder: number }[] = [];
  let order = 0;
  for (const item of items) {
    result.push({ key: item.key, enabled: item.enabled, sortOrder: order++ });
    if (item.children) {
      for (const child of item.children) {
        result.push({ key: child.key, enabled: child.enabled, sortOrder: order++ });
      }
    }
  }
  return result;
}

function swap<T>(arr: T[], i: number, j: number): T[] {
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MenuPermissionsPage() {
  const params   = useParams<{ id: string }>();
  const schoolId = params.id;

  const [activeRole,   setActiveRole]   = useState('school_admin');
  const [configs,      setConfigs]      = useState<Record<string, PermItem[]>>({});
  const [loadingRole,  setLoadingRole]  = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [error,        setError]        = useState('');

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const loadRole = useCallback(async (role: string) => {
    if (configs[role] !== undefined) return;
    setLoadingRole(true);
    try {
      const res  = await fetch(
        `/api/super-admin/schools/${schoolId}/menu-permissions?role=${role}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json();
      setConfigs(prev => ({
        ...prev,
        [role]: buildTree(role, data.items ?? []),
      }));
    } catch {}
    setLoadingRole(false);
  }, [schoolId, token, configs]);

  useEffect(() => { loadRole(activeRole); }, [activeRole]);

  // ── Top-level item movement ─────────────────────────────────────────────────

  const moveUp = (idx: number) =>
    setConfigs(prev => ({
      ...prev,
      [activeRole]: swap(prev[activeRole], idx, idx - 1),
    }));

  const moveDown = (idx: number) =>
    setConfigs(prev => ({
      ...prev,
      [activeRole]: swap(prev[activeRole], idx, idx + 1),
    }));

  // ── Child item movement (within its group) ──────────────────────────────────

  const moveChildUp = (parentIdx: number, childIdx: number) =>
    setConfigs(prev => {
      const items    = [...prev[activeRole]];
      const parent   = { ...items[parentIdx], children: swap(items[parentIdx].children!, childIdx, childIdx - 1) };
      items[parentIdx] = parent;
      return { ...prev, [activeRole]: items };
    });

  const moveChildDown = (parentIdx: number, childIdx: number) =>
    setConfigs(prev => {
      const items    = [...prev[activeRole]];
      const parent   = { ...items[parentIdx], children: swap(items[parentIdx].children!, childIdx, childIdx + 1) };
      items[parentIdx] = parent;
      return { ...prev, [activeRole]: items };
    });

  // ── Toggle enabled ──────────────────────────────────────────────────────────

  const toggleItem = (idx: number) =>
    setConfigs(prev => {
      const items     = [...prev[activeRole]];
      items[idx]      = { ...items[idx], enabled: !items[idx].enabled };
      return { ...prev, [activeRole]: items };
    });

  const toggleChild = (parentIdx: number, childIdx: number) =>
    setConfigs(prev => {
      const items      = [...prev[activeRole]];
      const children   = [...items[parentIdx].children!];
      children[childIdx] = { ...children[childIdx], enabled: !children[childIdx].enabled };
      items[parentIdx]   = { ...items[parentIdx], children };
      return { ...prev, [activeRole]: items };
    });

  // ── Save ────────────────────────────────────────────────────────────────────

  const save = async () => {
    setSaving(true); setError(''); setSaved(false);
    try {
      const items = flatten(configs[activeRole] ?? []);
      const res   = await fetch(`/api/super-admin/schools/${schoolId}/menu-permissions`, {
        method: 'POST',
        headers,
        body:   JSON.stringify({ role: activeRole, items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const currentItems = configs[activeRole] ?? [];
  const isLoaded     = configs[activeRole] !== undefined;

  const enabledLeafCount = currentItems.reduce((n, item) => {
    if (item.isGroup) return n + (item.children?.filter(c => c.enabled).length ?? 0);
    return n + (item.enabled ? 1 : 0);
  }, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">
          Menu Permissions & Sequence
        </h1>
        <p className="text-sm text-surface-400 mt-0.5">
          Control which menus are visible and set their display order per role. Changes apply immediately.
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
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeRole === r.id
                  ? 'bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300'
                  : 'text-surface-400 hover:bg-surface-50 dark:hover:bg-gray-700/40'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Sequence + permissions panel */}
        <div className="flex-1 card p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                {ROLES.find(r => r.id === activeRole)?.label}
              </h2>
              <p className="text-xs text-surface-400 mt-0.5">
                {isLoaded
                  ? `${enabledLeafCount} menu items enabled · drag rows with ↑↓ to reorder`
                  : 'Loading…'}
              </p>
            </div>
          </div>

          {/* List */}
          {loadingRole ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 bg-surface-100 dark:bg-gray-700 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {currentItems.map((item, idx) => (
                <div key={item.key}>
                  {/* Top-level row */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                    item.isGroup
                      ? 'border-surface-200 dark:border-gray-700 bg-surface-50 dark:bg-gray-800/50'
                      : item.enabled
                        ? 'border-brand-200 dark:border-brand-800 bg-brand-50/50 dark:bg-brand-950/10'
                        : 'border-surface-200 dark:border-gray-700 opacity-50'
                  }`}>
                    {/* Up/down */}
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        onClick={() => moveUp(idx)}
                        disabled={idx === 0}
                        className="w-5 h-5 flex items-center justify-center rounded text-surface-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-surface-100 dark:hover:bg-gray-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        title="Move up"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18,15 12,9 6,15"/></svg>
                      </button>
                      <button
                        onClick={() => moveDown(idx)}
                        disabled={idx === currentItems.length - 1}
                        className="w-5 h-5 flex items-center justify-center rounded text-surface-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-surface-100 dark:hover:bg-gray-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        title="Move down"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6,9 12,15 18,9"/></svg>
                      </button>
                    </div>

                    {/* Sequence badge */}
                    <span className="w-5 text-center text-xs text-surface-300 dark:text-gray-600 shrink-0 font-mono">
                      {idx + 1}
                    </span>

                    {/* Toggle (only for non-group leaf items) */}
                    {!item.isGroup ? (
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded accent-brand-500 shrink-0"
                        checked={item.enabled}
                        onChange={() => toggleItem(idx)}
                      />
                    ) : (
                      <span className="w-4 shrink-0" />
                    )}

                    {/* Label */}
                    <span className={`text-sm flex-1 ${
                      item.isGroup
                        ? 'font-semibold text-gray-700 dark:text-gray-300'
                        : 'font-medium text-gray-700 dark:text-gray-300'
                    }`}>
                      {item.label}
                      {item.isGroup && (
                        <span className="ml-1.5 text-xs font-normal text-surface-400">group</span>
                      )}
                    </span>
                  </div>

                  {/* Children rows */}
                  {item.isGroup && item.children && (
                    <div className="ml-8 mt-0.5 space-y-0.5">
                      {item.children.map((child, cIdx) => (
                        <div
                          key={child.key}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                            child.enabled
                              ? 'border-brand-200 dark:border-brand-800 bg-brand-50/50 dark:bg-brand-950/10'
                              : 'border-surface-200 dark:border-gray-700 opacity-50'
                          }`}
                        >
                          {/* Up/down within group */}
                          <div className="flex flex-col gap-0.5 shrink-0">
                            <button
                              onClick={() => moveChildUp(idx, cIdx)}
                              disabled={cIdx === 0}
                              className="w-5 h-5 flex items-center justify-center rounded text-surface-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-surface-100 dark:hover:bg-gray-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                              title="Move up within group"
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18,15 12,9 6,15"/></svg>
                            </button>
                            <button
                              onClick={() => moveChildDown(idx, cIdx)}
                              disabled={cIdx === item.children!.length - 1}
                              className="w-5 h-5 flex items-center justify-center rounded text-surface-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-surface-100 dark:hover:bg-gray-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                              title="Move down within group"
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6,9 12,15 18,9"/></svg>
                            </button>
                          </div>

                          {/* Sequence within group */}
                          <span className="w-5 text-center text-xs text-surface-300 dark:text-gray-600 shrink-0 font-mono">
                            {cIdx + 1}
                          </span>

                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded accent-brand-500 shrink-0"
                            checked={child.enabled}
                            onChange={() => toggleChild(idx, cIdx)}
                          />

                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1">
                            {child.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex items-center gap-3 pt-2 border-t border-surface-100 dark:border-gray-700">
            <button
              onClick={save}
              disabled={saving || !isLoaded}
              className="btn btn-primary"
            >
              {saving ? 'Saving…' : 'Save Permissions & Sequence'}
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
