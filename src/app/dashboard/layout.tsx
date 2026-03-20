'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [parentChildren, setParentChildren] = useState<any[]>([]);
  const [activeChild, setActiveChild] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const token    = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) { router.push('/login'); return; }
    try {
      const parsed = JSON.parse(userData);
      if (parsed.mustResetPassword) { router.push('/change-password'); return; }
      setUser(parsed);

      if (parsed.primaryRole === 'parent') {
        fetch('/api/parent/children', { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json())
          .then(d => {
            const kids = d.children || [];
            setParentChildren(kids);

            const stored = localStorage.getItem('activeChild');
            if (stored) {
              try {
                const storedChild = JSON.parse(stored);
                const match = kids.find((k: any) => k.id === storedChild.id);
                setActiveChild(match || kids[0] || null);
              } catch {
                setActiveChild(kids[0] || null);
              }
            } else if (kids.length > 0) {
              setActiveChild(kids[0]);
              localStorage.setItem('activeChild', JSON.stringify(kids[0]));
            }
          })
          .catch(() => {});
      }
    } catch {
      router.push('/login');
    }
  }, [router]);

  const handleChildSwitch = useCallback((child: any) => {
    setActiveChild(child);
    localStorage.setItem('activeChild', JSON.stringify(child));
    window.dispatchEvent(new CustomEvent('activeChildChanged', { detail: child }));
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-gray-950">
        <div className="flex items-center gap-3 text-surface-400 dark:text-gray-500">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-gray-950 transition-colors duration-300">
      <Sidebar user={user} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <Header
        user={user}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        parentChildren={parentChildren}
        activeChild={activeChild}
        onChildSwitch={handleChildSwitch}
      />
      <main className={`pt-16 transition-all duration-300 ${collapsed ? 'ml-[68px]' : 'ml-[240px]'}`}>
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
