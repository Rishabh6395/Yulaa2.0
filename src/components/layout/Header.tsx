'use client';

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

export default function Header({ user, collapsed, onToggle, parentChildren, activeChild, onChildSwitch }: HeaderProps) {
  const router = useRouter();
  const isParent = user?.primaryRole === 'parent';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('activeChild');
    document.cookie = 'token=; path=/; max-age=0';
    router.push('/login');
  };

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
        {/* Theme toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <button
          className="relative p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-gray-800 text-surface-400 dark:text-gray-500 transition-colors"
          aria-label="Notifications"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger"/>
        </button>

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
