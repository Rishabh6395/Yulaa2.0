'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import MasterPage from '@/components/masters/MasterPage';

function getToken() {
  if (typeof document === 'undefined') return '';
  return document.cookie.split(';').map(c => c.trim()).find(c => c.startsWith('token='))?.split('=')[1] ?? '';
}

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
}

const SEL = 'border border-surface-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm px-3 py-2 w-72 focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function CustomMasterPage() {
  const { slug }      = useParams<{ slug: string }>();
  const searchParams  = useSearchParams();
  const schoolIdParam = searchParams.get('schoolId') ?? undefined;

  const [masterType,    setMasterType]    = useState<{ name: string; description?: string } | null>(null);
  const [notFound,      setNotFound]      = useState(false);
  const [needsSchool,   setNeedsSchool]   = useState(false);
  const [schools,       setSchools]       = useState<any[]>([]);
  const [pickedSchool,  setPickedSchool]  = useState('');

  const effectiveSchoolId = schoolIdParam || pickedSchool || undefined;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const user = getStoredUser();
    const sa   = user.primaryRole === 'super_admin' || user.roles?.some((r: any) => r.role_code === 'super_admin');
    if (sa && !schoolIdParam) {
      setNeedsSchool(true);
      fetch('/api/super-admin/schools', { headers: { Authorization: `Bearer ${getToken()}` } })
        .then(r => r.json())
        .then(d => setSchools(d.schools ?? []));
    }
  }, [schoolIdParam]);

  useEffect(() => {
    if (!effectiveSchoolId && needsSchool) return;
    const suffix = effectiveSchoolId
      ? `?schoolId=${effectiveSchoolId}&includeInactive=true`
      : '?includeInactive=true';
    fetch(`/api/masters/custom/${slug}${suffix}`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => {
        if (d.masterType) { setMasterType(d.masterType); setNotFound(false); }
        else setNotFound(true);
      })
      .catch(() => setNotFound(true));
  }, [slug, effectiveSchoolId, needsSchool]);

  if (needsSchool && !pickedSchool) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/masters" className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-gray-800 text-surface-400 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </Link>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Custom Master</h1>
        </div>
        <div className="card p-5">
          <label className="block text-xs font-medium text-surface-400 dark:text-gray-500 mb-1">Select School to manage this master</label>
          {schools.length === 0 ? (
            <p className="text-xs text-surface-400">Loading schools…</p>
          ) : (
            <select value={pickedSchool} onChange={e => setPickedSchool(e.target.value)} className={SEL}>
              <option value="">— choose a school —</option>
              {schools.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/masters" className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-gray-800 text-surface-400 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </Link>
        </div>
        <div className="card p-12 text-center">
          <p className="text-surface-400 text-sm">Master type not found.</p>
          <p className="text-xs text-surface-300 mt-1">The slug <code className="bg-surface-100 dark:bg-gray-800 px-1 rounded">{slug}</code> does not exist for this school. Use "Init Standard Masters" to create it.</p>
        </div>
      </div>
    );
  }

  if (!masterType) {
    return <div className="card p-8 text-center text-sm text-surface-400">Loading…</div>;
  }

  return (
    <MasterPage
      title={masterType.name}
      description={masterType.description || `Manage ${masterType.name} values`}
      apiPath={`/api/masters/custom/${slug}`}
      dataKey="masterValues"
      itemKey="masterValue"
      fields={[
        { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Enter value' },
        { key: 'sortOrder', label: 'Sort Order', type: 'number', default: 0 },
      ]}
    />
  );
}
