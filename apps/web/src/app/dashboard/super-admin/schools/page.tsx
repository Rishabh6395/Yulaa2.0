'use client';

import { useState, useEffect, useCallback } from 'react';

interface School {
  id: string; name: string; email: string; city: string; state: string;
  boardType: string | null; subscriptionPlan: string | null; status: string;
  isDefault: boolean; createdAt: string;
  _count: { students: number; teachers: number };
}

function hdrs() {
  const t = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` };
}

export default function SuperAdminSchoolsPage() {
  const [schools, setSchools]   = useState<School[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [filterPlan, setFilterPlan]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/super-admin/schools', { headers: hdrs() });
      if (!r.ok) throw new Error('Failed to fetch');
      const d = await r.json();
      setSchools(d.schools ?? []);
    } catch { setError('Failed to load schools'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleStatus(school: School) {
    const nextStatus = school.status === 'active' ? 'inactive' : 'active';
    const r = await fetch('/api/super-admin/schools', {
      method: 'PATCH',
      headers: hdrs(),
      body: JSON.stringify({ id: school.id, status: nextStatus }),
    });
    if (r.ok) load();
    else setError('Failed to update status');
  }

  const plans = [...new Set(schools.map(s => s.subscriptionPlan).filter(Boolean))];
  const statuses = ['active', 'inactive', 'suspended'];

  const filtered = schools.filter(s => {
    if (filterPlan && s.subscriptionPlan !== filterPlan) return false;
    if (filterStatus && s.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q) || s.state.toLowerCase().includes(q);
    }
    return true;
  });

  const totalStudents = schools.reduce((sum, s) => sum + s._count.students, 0);
  const activeCount   = schools.filter(s => s.status === 'active').length;

  const statusBadge = (s: string) => {
    const m: Record<string, string> = {
      active:    'bg-emerald-100 text-emerald-700',
      inactive:  'bg-gray-100 text-gray-600',
      suspended: 'bg-red-100 text-red-700',
    };
    return `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${m[s] ?? 'bg-gray-100 text-gray-600'}`;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">School Management</h1>
        <p className="text-sm text-gray-500 mt-1">All registered schools on the platform</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Schools',   value: schools.length,  color: 'bg-blue-50 text-blue-700' },
          { label: 'Active Schools',  value: activeCount,     color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Total Students',  value: totalStudents,   color: 'bg-violet-50 text-violet-700' },
          { label: 'Avg Students',    value: schools.length ? Math.round(totalStudents / schools.length) : 0, color: 'bg-amber-50 text-amber-700' },
        ].map(c => (
          <div key={c.label} className={`rounded-xl p-4 ${c.color}`}>
            <div className="text-2xl font-bold">{c.value.toLocaleString()}</div>
            <div className="text-sm mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, city, state…"
          className="input flex-1 min-w-48" />
        <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)} className="input w-40">
          <option value="">All Plans</option>
          {plans.map(p => <option key={p!} value={p!}>{p}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input w-36">
          <option value="">All Status</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>{['School', 'Location', 'Board', 'Plan', 'Students', 'Teachers', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map(s => (
                <tr key={s.id} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                      {s.name}
                      {s.isDefault && <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded">Default</span>}
                    </div>
                    <div className="text-xs text-gray-400">{s.email}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.city}, {s.state}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.boardType ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                      {s.subscriptionPlan ?? 'free'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">{s._count.students.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s._count.teachers}</td>
                  <td className="px-4 py-3"><span className={statusBadge(s.status)}>{s.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <a href={`/dashboard/schools/${s.id}`}
                        className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                        View
                      </a>
                      <button onClick={() => toggleStatus(s)}
                        className={`px-2 py-1 text-xs rounded ${s.status === 'active' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                        {s.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No schools found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
