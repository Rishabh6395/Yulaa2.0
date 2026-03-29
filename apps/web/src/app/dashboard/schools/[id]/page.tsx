'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SchoolConfigModules from '@/components/school/SchoolConfigModules';

export default function SchoolConfigPage({ params }: { params: { id: string } }) {
  const { id }  = params;
  const router  = useRouter();
  const [school,  setSchool]  = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem('token');
    fetch(`/api/super-admin/schools?id=${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setSchool(d.school || null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="card p-8 text-center text-sm text-surface-400">Loading school...</div>;
  if (!school)  return <div className="card p-8 text-center text-sm text-surface-400">School not found.</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/dashboard/schools')} className="text-surface-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15,18 9,12 15,6"/></svg>
        </button>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">{school.name}</h1>
            {school.isDefault && (
              <span className="text-xs bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Default</span>
            )}
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-md capitalize ${school.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-red-100 text-red-600'}`}>
              {school.status}
            </span>
            {school.boardType && (
              <span className="text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md font-medium">{school.boardType}</span>
            )}
          </div>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">
            {[school.city, school.state].filter(Boolean).join(', ')}
            {school._count && ` · ${school._count.students} students · ${school._count.teachers} teachers · ${school._count.classes} classes`}
          </p>
        </div>
      </div>

      {/* Configuration Modules */}
      <SchoolConfigModules schoolId={id} isDefault={school.isDefault} />
    </div>
  );
}
