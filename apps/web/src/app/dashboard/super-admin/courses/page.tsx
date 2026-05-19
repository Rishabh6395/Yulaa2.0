'use client';

import { useEffect, useState } from 'react';
import { ConfigHelp } from '@/components/ui/ConfigHelp';

type Course = {
  id: string;
  title: string;
  type: string;
  price: number;
  is_free: boolean;
  is_published: boolean;
  is_external: boolean;
  requires_approval: boolean;
  approved_at: string | null;
  instructor_name: string | null;
  school: { name: string } | null;
  teacher: { user: { firstName: string; lastName: string } } | null;
  enrollments: { id: string }[];
};

export default function SuperAdminCoursesPage() {
  const [courses,  setCourses]  = useState<Course[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<'pending' | 'approved' | 'all'>('pending');
  const [approving, setApproving] = useState<string | null>(null);

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const load = () => {
    setLoading(true);
    fetch('/api/courses', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setCourses(d.courses ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const approve = async (id: string) => {
    setApproving(id);
    await fetch('/api/courses', {
      method: 'PATCH', headers,
      body: JSON.stringify({ id, approve: true }),
    });
    load();
    setApproving(null);
  };

  const filtered = courses.filter(c => {
    if (filter === 'pending')  return c.is_external && !c.approved_at;
    if (filter === 'approved') return c.is_external && c.approved_at;
    return true;
  });

  const instructorName = (c: Course) => c.teacher
    ? `${c.teacher.user.firstName} ${c.teacher.user.lastName}`
    : (c.instructor_name ?? 'External');

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100 flex items-center">
          Course Approvals
          <ConfigHelp text="Only External courses require approval. Internal courses created by school teachers go live immediately. Approved courses appear in students' and parents' course marketplace." />
        </h1>
        <p className="text-sm text-surface-400 mt-0.5">Review and approve external courses before they go live.</p>
      </div>

      <div className="flex gap-2">
        {(['pending', 'approved', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm rounded-full font-medium capitalize transition-colors ${filter === f ? 'bg-brand-500 text-white' : 'bg-surface-100 dark:bg-gray-800 text-surface-500'}`}
          >
            {f === 'pending' ? 'Pending Approval' : f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="card p-4 animate-pulse h-20 bg-surface-100 dark:bg-gray-800" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-surface-400 text-sm">{filter === 'pending' ? 'No courses pending approval.' : 'No courses found.'}</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-50 dark:bg-gray-800 border-b border-surface-200 dark:border-gray-700">
              <tr>
                <th className="text-left p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Course</th>
                <th className="text-left p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Instructor</th>
                <th className="text-left p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">School</th>
                <th className="text-left p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Type</th>
                <th className="text-left p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">
                  <span className="flex items-center gap-0.5">Price<ConfigHelp text="'Free' courses are accessible immediately after enrollment. Paid courses require a payment gateway to be configured for the school." /></span>
                </th>
                <th className="text-left p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">
                  <span className="flex items-center gap-0.5">Status<ConfigHelp text="'Pending' external courses are hidden from students until approved. Approving a course makes it instantly visible in the marketplace." /></span>
                </th>
                <th className="text-left p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-gray-700">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-surface-50/50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="p-4">
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{c.title}</p>
                    {c.is_external && <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400 px-1.5 py-0.5 rounded">External</span>}
                  </td>
                  <td className="p-4 text-sm text-gray-700 dark:text-gray-300">{instructorName(c)}</td>
                  <td className="p-4 text-sm text-surface-400">{c.school?.name ?? '—'}</td>
                  <td className="p-4 text-sm text-surface-400 capitalize">{c.type}</td>
                  <td className="p-4 text-sm text-gray-700 dark:text-gray-300">
                    {c.is_free ? 'Free' : `₹${Number(c.price).toLocaleString()}`}
                  </td>
                  <td className="p-4">
                    {c.approved_at ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">Approved</span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">Pending</span>
                    )}
                  </td>
                  <td className="p-4">
                    {!c.approved_at && c.is_external && (
                      <button
                        disabled={approving === c.id}
                        onClick={() => approve(c.id)}
                        className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium"
                      >
                        {approving === c.id ? 'Approving…' : 'Approve'}
                      </button>
                    )}
                    {c.approved_at && (
                      <span className="text-xs text-surface-400">{new Date(c.approved_at).toLocaleDateString('en-IN')}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
