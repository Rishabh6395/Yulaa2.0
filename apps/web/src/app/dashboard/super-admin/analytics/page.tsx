'use client';

import { useState, useEffect, useCallback } from 'react';

interface School {
  id: string; name: string; city: string; state: string;
  subscriptionPlan: string | null; status: string;
  _count: { students: number; teachers: number };
}

function hdrs() {
  const t = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` };
}

export default function SuperAdminAnalyticsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/super-admin/schools', { headers: hdrs() });
      if (!r.ok) throw new Error('Failed');
      const d = await r.json();
      setSchools(d.schools ?? []);
    } catch { setError('Failed to load data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sorted      = [...schools].sort((a, b) => b._count.students - a._count.students);
  const top5        = sorted.slice(0, 5);
  const bottom5     = sorted.length > 5 ? sorted.slice(-5).reverse() : [];
  const activeCount = schools.filter(s => s.status === 'active').length;
  const total       = schools.reduce((sum, s) => sum + s._count.students, 0);

  const planDist: Record<string, number> = {};
  for (const s of schools) {
    const p = s.subscriptionPlan ?? 'free';
    planDist[p] = (planDist[p] ?? 0) + 1;
  }

  const maxStudents = top5[0]?._count.students ?? 1;

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Cross-school overview and comparisons</p>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Schools',  value: schools.length,                              color: 'bg-blue-50 text-blue-700' },
          { label: 'Active',         value: activeCount,                                 color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Total Students', value: total.toLocaleString(),                      color: 'bg-violet-50 text-violet-700' },
          { label: 'Avg per School', value: schools.length ? Math.round(total / schools.length) : 0, color: 'bg-amber-50 text-amber-700' },
        ].map(c => (
          <div key={c.label} className={`rounded-xl p-4 ${c.color}`}>
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="text-sm mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <>
          {/* Subscription plan distribution */}
          <div className="card p-5">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Subscription Plan Distribution</h2>
            <div className="space-y-3">
              {Object.entries(planDist).map(([plan, count]) => (
                <div key={plan} className="flex items-center gap-3">
                  <div className="w-24 text-sm text-gray-600 dark:text-gray-300 capitalize">{plan}</div>
                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${(count / schools.length) * 100}%` }}
                    />
                  </div>
                  <div className="w-16 text-sm font-medium text-gray-700 dark:text-gray-200 text-right">
                    {count} ({Math.round((count / schools.length) * 100)}%)
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top 5 by student count */}
          <div className="card p-5">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Top 5 Schools by Students</h2>
            <div className="space-y-3">
              {top5.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3">
                  <div className="w-5 text-xs font-bold text-gray-400 dark:text-gray-500 text-center">{i + 1}</div>
                  <div className="w-48 truncate text-sm font-medium text-gray-900 dark:text-white">{s.name}</div>
                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${(s._count.students / maxStudents) * 100}%` }}
                    />
                  </div>
                  <div className="w-20 text-sm font-semibold text-gray-700 dark:text-gray-200 text-right">
                    {s._count.students.toLocaleString()} students
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom 5 by student count */}
          {bottom5.length > 0 && (
            <div className="card p-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Smallest Schools by Students</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="py-2 pr-4">School</th>
                      <th className="py-2 pr-4">Location</th>
                      <th className="py-2 pr-4">Plan</th>
                      <th className="py-2">Students</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {bottom5.map(s => (
                      <tr key={s.id}>
                        <td className="py-2 pr-4 font-medium text-gray-900 dark:text-white">{s.name}</td>
                        <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">{s.city}, {s.state}</td>
                        <td className="py-2 pr-4 capitalize text-gray-600 dark:text-gray-300">{s.subscriptionPlan ?? 'free'}</td>
                        <td className="py-2 text-gray-700 dark:text-gray-200">{s._count.students}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* All schools table */}
          <div className="card p-5">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">All Schools Overview</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>{['School', 'Students', 'Teachers', 'Plan', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {sorted.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.name}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{s._count.students.toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s._count.teachers}</td>
                      <td className="px-4 py-3 capitalize text-gray-600 dark:text-gray-300">{s.subscriptionPlan ?? 'free'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          s.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                        }`}>{s.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
