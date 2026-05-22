'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ChildSwitcher from './ChildSwitcher';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface HeaderProps {
  user: any;
  collapsed: boolean;
  onToggle: () => void;
  parentChildren: any[];
  activeChild: any;
  onChildSwitch: (child: any) => void;
}

const REASSIGN_ROLES = ['principal', 'teacher', 'hod', 'super_admin', 'school_admin'];

// ── Notification item types ───────────────────────────────────────────────────

interface NotifItem {
  id:    string;
  type:  'announcement' | 'leave' | 'fee' | 'homework' | 'query';
  title: string;
  sub:   string;
  href:  string;
  time:  string;
}

const TYPE_ICON: Record<string, string> = {
  announcement: '📢',
  leave:        '🗓️',
  fee:          '💰',
  homework:     '📚',
  query:        '💬',
};

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diff < 1)  return 'Just now';
  if (diff < 60) return `${diff}m ago`;
  const h = Math.floor(diff / 60);
  if (h < 24)    return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Module-level client-side cache — survives panel open/close within the tab
let _notifCache: { items: NotifItem[]; ts: number } | null = null;
const CLIENT_CACHE_TTL = 30_000; // 30 s

// ── Notification panel ────────────────────────────────────────────────────────

function NotificationPanel({ onClose, onLoad }: { onClose: () => void; onLoad: (count: number) => void }) {
  const router  = useRouter();
  const [items,   setItems]   = useState<NotifItem[]>(_notifCache?.items ?? []);
  const [loading, setLoading] = useState(!_notifCache);

  useEffect(() => {
    // Serve from module-level cache if still fresh
    if (_notifCache && Date.now() - _notifCache.ts < CLIENT_CACHE_TTL) {
      setItems(_notifCache.items);
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('token');
    fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        const notifs: NotifItem[] = data.notifications ?? [];
        _notifCache = { items: notifs, ts: Date.now() };
        setItems(notifs);
        onLoad(notifs.length);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [onLoad]);

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-surface-200 dark:border-gray-700 overflow-hidden z-50">
      <div className="px-4 py-3 border-b border-surface-100 dark:border-gray-800 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</span>
        {items.length > 0 && (
          <span className="text-xs bg-brand-100 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full font-semibold">{items.length}</span>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto divide-y divide-surface-100 dark:divide-gray-800">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-xl bg-surface-100 dark:bg-gray-800 shrink-0"/>
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-surface-100 dark:bg-gray-800 rounded w-3/4"/>
                  <div className="h-2.5 bg-surface-100 dark:bg-gray-800 rounded w-1/2"/>
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-2xl mb-2">🔔</div>
            <p className="text-sm text-surface-400 dark:text-gray-500">No notifications</p>
          </div>
        ) : (
          items.map(n => (
            <button
              key={n.id}
              onClick={() => go(n.href)}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-surface-50 dark:hover:bg-gray-800/60 text-left transition-colors"
            >
              <span className="text-lg mt-0.5 shrink-0">{TYPE_ICON[n.type]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">{n.title}</p>
                <p className="text-[11px] text-surface-400 dark:text-gray-500 mt-0.5">{n.sub}</p>
              </div>
              <span className="text-[10px] text-surface-400 dark:text-gray-500 shrink-0 mt-0.5">{timeAgo(n.time)}</span>
            </button>
          ))
        )}
      </div>

      {!loading && items.length > 0 && (
        <div className="px-4 py-2.5 border-t border-surface-100 dark:border-gray-800 flex justify-end">
          <button
            onClick={() => go('/dashboard/announcements')}
            className="text-[11px] text-brand-600 dark:text-brand-400 font-medium hover:underline"
          >
            View all →
          </button>
        </div>
      )}
    </div>
  );
}

// ── Task Reassignment Panel ───────────────────────────────────────────────────

function TaskReassignPanel({ onClose, isSuperAdmin }: { onClose: () => void; isSuperAdmin: boolean }) {
  const [users,      setUsers]      = useState<any[]>([]);
  const [targetId,   setTargetId]   = useState('');
  const [fromId,     setFromId]     = useState('');
  const [note,       setNote]       = useState('');
  const [loading,    setLoading]    = useState(false);
  const [fetching,   setFetching]   = useState(true);
  const [result,     setResult]     = useState<{ count: number; message: string } | null>(null);
  const [error,      setError]      = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token') ?? '';
    fetch('/api/school/users', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { users: [] })
      .then(d => { setUsers(d.users ?? []); setFetching(false); })
      .catch(() => setFetching(false));
  }, []);

  async function handleReassign() {
    setLoading(true); setError(''); setResult(null);
    const token = localStorage.getItem('token') ?? '';
    try {
      const body: any = { assignedToId: targetId, note: note || undefined };
      if (isSuperAdmin && fromId) body.fromUserId = fromId;
      const res = await fetch('/api/tasks/reassign', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Reassignment failed');
      setResult({ count: d.count, message: d.message });
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-surface-200 dark:border-gray-700 overflow-hidden z-50">
      <div className="px-4 py-3 border-b border-surface-100 dark:border-gray-800 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/>
            <path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
          </svg>
          Reassign My Tasks
        </span>
        <button onClick={onClose} className="text-surface-400 hover:text-gray-600 dark:hover:text-gray-300 p-0.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div className="p-4 space-y-3">
        <p className="text-xs text-surface-400">Transfer all your pending approval tasks to another team member.</p>

        {/* Super admin: from user */}
        {isSuperAdmin && (
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">From (optional — leave blank for all)</label>
            <select className="w-full text-sm border border-surface-200 dark:border-gray-700 rounded-lg px-2.5 py-2 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-400"
              value={fromId} onChange={e => setFromId(e.target.value)}>
              <option value="">— Any user (all schools) —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Reassign to *</label>
          {fetching ? (
            <div className="h-9 bg-surface-100 dark:bg-gray-800 rounded-lg animate-pulse"/>
          ) : (
            <select className="w-full text-sm border border-surface-200 dark:border-gray-700 rounded-lg px-2.5 py-2 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-400"
              value={targetId} onChange={e => setTargetId(e.target.value)}>
              <option value="">— Select user —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
            </select>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Note (optional)</label>
          <input className="w-full text-sm border border-surface-200 dark:border-gray-700 rounded-lg px-2.5 py-2 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-400"
            placeholder="Reason for reassignment…"
            value={note} onChange={e => setNote(e.target.value)} />
        </div>

        {error && <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2.5 py-1.5 rounded-lg">{error}</p>}
        {result && (
          <div className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            {result.message}
          </div>
        )}

        <button
          disabled={!targetId || loading}
          onClick={handleReassign}
          className="w-full py-2 text-sm font-medium rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Reassigning…' : 'Reassign All My Tasks'}
        </button>
      </div>
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────

export default function Header({ user, collapsed, onToggle, parentChildren, activeChild, onChildSwitch }: HeaderProps) {
  const router = useRouter();
  const isParent = user?.primaryRole === 'parent';
  const canReassign = REASSIGN_ROLES.includes(user?.primaryRole ?? '');
  const isSuperAdmin = user?.primaryRole === 'super_admin';
  const [showNotif,   setShowNotif]   = useState(false);
  const [showReassign, setShowReassign] = useState(false);
  const [notifCount, setNotifCount] = useState(_notifCache?.items.length ?? 0);
  const notifRef    = useRef<HTMLDivElement>(null);
  const reassignRef = useRef<HTMLDivElement>(null);

  const handleNotifLoad = useCallback((count: number) => setNotifCount(count), []);

  // Close panels on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
      if (reassignRef.current && !reassignRef.current.contains(e.target as Node)) setShowReassign(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('activeChild');
    document.cookie = 'token=; path=/; max-age=0';
    router.push('/login');
  }, [router]);

  return (
    <header
      className={`
        fixed top-0 right-0 h-16 z-20
        bg-white/80 dark:bg-gray-950/80 backdrop-blur-md
        border-b border-surface-100 dark:border-gray-800
        flex items-center justify-between px-6
        transition-all duration-300
        ${collapsed ? 'left-[68px]' : 'left-[240px]'}
      `}
    >
      {/* Left: menu toggle + context */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-gray-800 text-surface-400 dark:text-gray-500 transition-colors"
          aria-label="Toggle sidebar"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="6"  x2="21" y2="6"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        {isParent ? (
          <ChildSwitcher
            children={parentChildren}
            activeChild={activeChild}
            onSwitch={onChildSwitch}
          />
        ) : (
          user?.schoolName && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-surface-400 dark:text-gray-500">School:</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200">{user.schoolName}</span>
            </div>
          )
        )}
      </div>

      {/* Right: theme toggle, reassign, notifications, logout */}
      <div className="flex items-center gap-1">
        <ThemeToggle />

        {/* Task Reassignment button — for principal, teacher, hod, super_admin, school_admin */}
        {canReassign && (
          <div className="relative" ref={reassignRef}>
            <button
              onClick={() => { setShowReassign(v => !v); setShowNotif(false); }}
              className={`relative p-2 rounded-lg transition-colors ${showReassign ? 'bg-brand-100 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400' : 'hover:bg-surface-100 dark:hover:bg-gray-800 text-surface-400 dark:text-gray-500'}`}
              aria-label="Reassign tasks"
              title="Reassign your pending tasks to another user"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/>
                <path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
              </svg>
            </button>
            {showReassign && (
              <TaskReassignPanel onClose={() => setShowReassign(false)} isSuperAdmin={isSuperAdmin} />
            )}
          </div>
        )}

        {/* Notifications bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotif(v => !v)}
            className="relative p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-gray-800 text-surface-400 dark:text-gray-500 transition-colors"
            aria-label="Notifications"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {notifCount > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-danger flex items-center justify-center text-[9px] font-bold text-white px-0.5">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            ) : (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger"/>
            )}
          </button>

          {showNotif && <NotificationPanel onClose={() => setShowNotif(false)} onLoad={handleNotifLoad} />}
        </div>

        <div className="w-px h-6 bg-surface-200 dark:bg-gray-700 mx-1"/>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-surface-400 dark:text-gray-500 hover:text-danger px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16,17 21,12 16,7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
}
