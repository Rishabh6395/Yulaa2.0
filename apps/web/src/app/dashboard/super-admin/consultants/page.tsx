'use client';

import { useEffect, useState } from 'react';

type Consultant = {
  id: string;
  name: string;
  email: string;
  specialization: string | null;
  session_fee: number | null;
  is_external: boolean;
  is_active: boolean;
  area_scope: string;
  allowed_school_ids: string[];
  avg_rating: number | null;
  rating_count: number;
  latest_contract: {
    contract_no: string;
    end_date: string;
    status: string;
    school: { id: string; name: string };
  } | null;
};

const AREA_SCOPES = ['school', 'city', 'state', 'national'];

export default function SuperAdminConsultantsPage() {
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState<string | null>(null);
  const [filter,      setFilter]      = useState('');

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const load = () => {
    setLoading(true);
    const params = filter ? `?is_external=${filter}` : '';
    fetch(`/api/super-admin/consultants${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setConsultants(d.consultants ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  const update = async (id: string, patch: Record<string, unknown>) => {
    setSaving(id);
    const res = await fetch('/api/super-admin/consultants', {
      method: 'PATCH', headers,
      body: JSON.stringify({ id, ...patch }),
    });
    if (res.ok) {
      const data = await res.json();
      setConsultants(prev => prev.map(c => c.id === id ? { ...c, ...data.consultant } : c));
    }
    setSaving(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">All Consultants</h1>
        <p className="text-sm text-surface-400 mt-0.5">Manage career consultant profiles, area scope, and external access across all schools.</p>
      </div>

      <div className="flex gap-2">
        {[['', 'All'], ['false', 'Internal'], ['true', 'External']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${filter === val ? 'bg-brand-500 text-white' : 'bg-surface-100 dark:bg-gray-800 text-surface-500'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="card p-4 animate-pulse h-20 bg-surface-100 dark:bg-gray-800" />)}
        </div>
      ) : consultants.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-surface-400 text-sm">No consultants found.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-50 dark:bg-gray-800 border-b border-surface-200 dark:border-gray-700">
              <tr>
                <th className="text-left p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Consultant</th>
                <th className="text-left p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Type</th>
                <th className="text-left p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Area Scope</th>
                <th className="text-left p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Contract</th>
                <th className="text-left p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Rating</th>
                <th className="text-left p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-gray-700">
              {consultants.map(c => {
                const contractExpired = c.latest_contract
                  ? new Date(c.latest_contract.end_date) < new Date()
                  : false;
                return (
                  <tr key={c.id} className="hover:bg-surface-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="p-4">
                      <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{c.name}</p>
                      <p className="text-xs text-surface-400">{c.email}</p>
                      {c.specialization && <p className="text-xs text-surface-400">{c.specialization}</p>}
                    </td>
                    <td className="p-4">
                      <button
                        disabled={saving === c.id}
                        onClick={() => update(c.id, { is_external: !c.is_external })}
                        className={`text-xs font-medium px-2 py-0.5 rounded-full cursor-pointer transition-colors ${c.is_external ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400 hover:bg-purple-200' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200'}`}
                      >
                        {c.is_external ? 'External' : 'Internal'}
                      </button>
                    </td>
                    <td className="p-4">
                      <select
                        value={c.area_scope}
                        disabled={saving === c.id || !c.is_external}
                        onChange={e => update(c.id, { area_scope: e.target.value })}
                        className="input text-xs py-1 px-2 w-28 disabled:opacity-40"
                      >
                        {AREA_SCOPES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="p-4">
                      {c.latest_contract ? (
                        <div>
                          <p className="text-xs font-medium">{c.latest_contract.school.name}</p>
                          <p className={`text-xs ${contractExpired ? 'text-red-500' : 'text-surface-400'}`}>
                            {contractExpired ? 'Expired' : 'Until'} {new Date(c.latest_contract.end_date).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-surface-400">No contract</span>
                      )}
                    </td>
                    <td className="p-4">
                      {c.avg_rating ? (
                        <span className="text-sm font-medium text-amber-500">★ {c.avg_rating.toFixed(1)} ({c.rating_count})</span>
                      ) : (
                        <span className="text-xs text-surface-400">No ratings</span>
                      )}
                    </td>
                    <td className="p-4">
                      <button
                        disabled={saving === c.id}
                        onClick={() => update(c.id, { is_active: !c.is_active })}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${c.is_active ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${c.is_active ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
