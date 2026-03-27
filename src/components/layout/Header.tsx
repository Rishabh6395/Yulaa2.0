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

// ── Notification item types ───────────────────────────────────────────────────

interface NotifItem {
  id:    string;
  type:  'announcement' | 'leave' | 'fee';
  title: string;
  sub:   string;
  href:  string;
  time:  string;
}

const TYPE_ICON: Record<string, string> = {
  announcement: '📢',
  leave:        '🗓️',
  fee:          '💰',
};

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diff < 1)  return 'Just now';
  if (diff < 60) return `${diff}m ago`;
  const h = Math.floor(diff / 60);
  if (h < 24)    return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Notification panel ────────────────────────────────────────────────────────

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const router  = useRouter();
  const [items, setItems] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    Promise.allSettled([
      fetch('/api/announcements', { headers }).then(r => r.json()),
      fetch('/api/leave',         { headers }).then(r => r.json()),
      fetch('/api/fees',          { headers }).then(r => r.json()),
    ]).then(results => {
      const notifs: NotifItem[] = [];

      // Announcements (recent 3, not expired)
      const annData = results[0].status === 'fulfilled' ? results[0].value : null;
      (annData?.announcements ?? [])
        .filter((a: any) => {
          const age = Math.floor((Date.now() - new Date(a.published_at).getTime()) / 86400000);
          return age < 20;
        })
        .slice(0, 3)
        .forEach((a: any) => {
          notifs.push({
            id:    `ann-${a.id}`,
            type:  'announcement',
            title: a.title,
            sub:   a.type?.replace('_', ' ') ?? 'General',
            href:  '/dashboard/announcements',
            time:  a.published_at,
          });
        });

      // Pending leaves
      const leaveData = results[1].status === 'fulfilled' ? results[1].value : null;
      (leaveData?.leaves ?? [])
        .filter((l: any) => l.status === 'pending')
        .slice(0, 3)
        .forEach((l: any) => {
          notifs.push({
            id:    `leave-${l.id}`,
            type:  'leave',
            title: `${l.leave_type} Leave — ${l.status}`,
            sub:   l.requester_name ?? '',
            href:  '/dashboard/leave',
            time:  l.created_at,
          });
        });

      // Overdue or unpaid fees
      const feeData = results[2].status === 'fulfilled' ? results[2].value : null;
      (feeData?.invoices ?? [])
        .filter((f: any) => ['overdue', 'unpaid'].includes(f.status))
        .slice(0, 2)
        .forEach((f: any) => {
          notifs.push({
            id:    `fee-${f.id}`,
            type:  'fee',
            title: `Fee ${f.status} — ₹${parseFloat(f.amount || 0).toLocaleString('en-IN')}`,
            sub:   f.invoice_no ?? '',
            href:  '/dashboard/fees',
            time:  f.due_date,
          });
        });

      // Sort by time desc
      notifs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setItems(notifs.slice(0, 8));
      setLoading(false);
    });
  }, []);

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
        <div className="px-4 py-2.5 border-t border-surface-100 dark:border-gray-800 grid grid-cols-3 gap-2">
          {[
            { label: 'Announcements', href: '/dashboard/announcements' },
            { label: 'Leave',         href: '/dashboard/leave' },
            { label: 'Fees',          href: '/dashboard/fees' },
          ].map(link => (
            <button
              key={link.href}
              onClick={() => go(link.href)}
              className="text-[11px] text-brand-600 dark:text-brand-400 font-medium hover:underline text-center"
            >
              {link.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────

export default function Header({ user, collapsed, onToggle, parentChildren, activeChild, onChildSwitch }: HeaderProps) {
  const router = useRouter();
  const isParent = user?.primaryRole === 'parent';
  const [showNotif, setShowNotif] = useState(false);
  const notifRef  = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
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

      {/* Right: theme toggle, notifications, logout */}
      <div className="flex items-center gap-1">
        <ThemeToggle />

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
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger"/>
          </button>

          {showNotif && <NotificationPanel onClose={() => setShowNotif(false)} />}
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
