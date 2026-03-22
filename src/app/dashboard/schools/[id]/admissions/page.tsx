'use client';

import { useEffect, useState } from 'react';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400',
  reviewing: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  enrolled: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400',
};

export default function SchoolAdmissionsPage({ params }: { params: { id: string } }) {
  const schoolId = params.id;
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [updating, setUpdating] = useState(false);

  const token = () => localStorage.getItem('token') || '';
  const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ schoolId });
      if (statusFilter) params.set('status', statusFilter);
      const r = await fetch(`/api/admissions?${params}`, { headers: headers() });
      const d = await r.json();
      setApplications(d.applications || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [schoolId, statusFilter]);

  async function updateStatus(id: string, status: string) {
    setUpdating(true);
    try {
      await fetch('/api/admissions', {
        method: 'PATCH', headers: headers(),
        body: JSON.stringify({ id, status }),
      });
      load();
      if (selected?.id === id) setSelected((s: any) => ({ ...s, status }));
    } finally {
      setUpdating(false);
    }
  }

  const statuses = ['', 'pending', 'reviewing', 'approved', 'rejected', 'enrolled'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Admissions</h1>
          <p className="text-sm text-surface-400 mt-0.5">{applications.length} application{applications.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {statuses.map(s => (
            <button
              key={s || 'all'}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all capitalize ${statusFilter === s ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300' : 'border-surface-200 dark:border-gray-700 text-surface-400 hover:border-brand-300'}`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-surface-400">Loading applications...</div>
      ) : applications.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-surface-400 text-sm">No applications found.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-50 dark:bg-gray-700/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-surface-500">Parent / Child</th>
                <th className="text-left px-4 py-3 font-semibold text-surface-500">Contact</th>
                <th className="text-left px-4 py-3 font-semibold text-surface-500">Applied</th>
                <th className="text-left px-4 py-3 font-semibold text-surface-500">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-gray-700">
              {applications.map((app: any) => (
                <tr key={app.id} className="hover:bg-surface-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{app.parentName}</div>
                    {app.children?.length > 0 && (
                      <div className="text-xs text-surface-400 mt-0.5">
                        {app.children.map((c: any) => c.name).join(', ')}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-surface-400">
                    <div>{app.parentPhone || '—'}</div>
                    <div className="text-xs">{app.parentEmail || ''}</div>
                  </td>
                  <td className="px-4 py-3 text-surface-400 text-xs">
                    {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md capitalize ${STATUS_COLORS[app.status] || 'bg-surface-100 text-surface-400'}`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setSelected(app)} className="text-xs text-brand-600 hover:text-brand-700 font-medium">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{selected.parentName}</h2>
                <p className="text-sm text-surface-400">{selected.parentPhone} · {selected.parentEmail}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-surface-400 hover:text-gray-700">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {selected.children?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-surface-400 uppercase tracking-wide">Children</p>
                {selected.children.map((c: any, i: number) => (
                  <div key={i} className="p-3 bg-surface-50 dark:bg-gray-700/40 rounded-lg text-sm">
                    <div className="font-medium text-gray-800 dark:text-gray-200">{c.name}</div>
                    <div className="text-xs text-surface-400 mt-0.5">
                      {[c.grade, c.dateOfBirth && `DOB: ${new Date(c.dateOfBirth).toLocaleDateString()}`, c.previousSchool].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2">Update Status</p>
              <div className="flex flex-wrap gap-2">
                {['reviewing', 'approved', 'rejected', 'enrolled'].map(s => (
                  <button
                    key={s}
                    onClick={() => updateStatus(selected.id, s)}
                    disabled={updating || selected.status === s}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all disabled:opacity-50 ${selected.status === s ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 cursor-not-allowed' : 'border border-surface-200 dark:border-gray-700 hover:bg-surface-50 dark:hover:bg-gray-700/40 text-gray-700 dark:text-gray-300'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
