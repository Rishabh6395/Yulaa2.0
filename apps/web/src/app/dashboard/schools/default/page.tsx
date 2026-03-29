'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import SchoolConfigModules from '@/components/school/SchoolConfigModules';

export default function DefaultSchoolSettingsPage() {
  const router  = useRouter();
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/super-admin/schools', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const def = (d.schools || []).find((s: any) => s.isDefault);
        setSchool(def || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="card p-8 text-center text-sm text-surface-400">Loading...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/dashboard/schools')} className="text-surface-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15,18 9,12 15,6"/></svg>
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Default School Settings</h1>
            <span className="text-xs bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Template</span>
          </div>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">
            {school ? school.name : 'No default school set'} — Global configuration template for new schools.
          </p>
        </div>
      </div>

      {!school ? (
        <div className="card p-12 text-center">
          <p className="text-surface-400">No default school configured yet.</p>
          <p className="text-sm text-surface-400 mt-1">Go to School Library and mark a school as Default.</p>
          <button onClick={() => router.push('/dashboard/schools')} className="mt-3 text-sm text-brand-500 font-medium hover:underline">
            Go to School Library →
          </button>
        </div>
      ) : (
        <>
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-400 flex items-start gap-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div>
              Changes to Default School Settings do <strong>not</strong> automatically apply to existing schools.
              Existing schools must explicitly opt-in to receive updates.
            </div>
          </div>
          <SchoolConfigModules schoolId={school.id} isDefault />
        </>
      )}
    </div>
  );
}
