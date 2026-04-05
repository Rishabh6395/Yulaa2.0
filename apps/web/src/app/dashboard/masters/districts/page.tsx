'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

function getToken() {
  if (typeof document === 'undefined') return '';
  return document.cookie.split(';').map(c => c.trim()).find(c => c.startsWith('token='))?.split('=')[1] ?? '';
}

const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

const ACTIVE = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200';
const INACTIVE = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-surface-100 dark:bg-gray-800 text-surface-400 border border-surface-200';

export default function DistrictsPage() {
  const [states, setStates] = useState<any[]>([]);
  const [selectedState, setSelectedState] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', sortOrder: 0 });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch('/api/masters/states', { headers: headers() })
      .then(r => r.json()).then(d => setStates(d.states ?? []));
  }, []);

  const loadDistricts = useCallback(async (stateId: string) => {
    if (!stateId) return;
    setLoading(true);
    const res = await fetch(`/api/masters/districts?stateId=${stateId}`, { headers: headers() });
    const d = await res.json();
    setRows(d.districts ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadDistricts(selectedState); }, [selectedState, loadDistricts]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErr('');
    const res = await fetch('/api/masters/districts', {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ stateId: selectedState, ...form }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) { setErr(d.error ?? 'Failed'); return; }
    setForm({ name: '', sortOrder: 0 });
    loadDistricts(selectedState);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErr('');
    const res = await fetch('/api/masters/districts', {
      method: 'PATCH', headers: headers(),
      body: JSON.stringify({ id: editId, ...editForm }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) { setErr(d.error ?? 'Failed'); return; }
    setEditId(null);
    loadDistricts(selectedState);
  }

  async function toggleActive(row: any) {
    await fetch('/api/masters/districts', { method: 'PATCH', headers: headers(), body: JSON.stringify({ id: row.id, isActive: !row.isActive }) });
    loadDistricts(selectedState);
  }

  const inp = 'border border-surface-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/masters" className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-gray-800 text-surface-400 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Districts</h1>
          <p className="text-sm text-surface-400 mt-0.5">Districts per state</p>
        </div>
      </div>

      <div className="card p-5">
        <label className="block text-xs font-medium text-surface-400 mb-1">Select State</label>
        <select value={selectedState} onChange={e => setSelectedState(e.target.value)} className="border border-surface-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm px-3 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">— choose state —</option>
          {states.map(s => <option key={s.id} value={s.id}>{s.name}{s.country ? ` (${s.country.name})` : ''}</option>)}
        </select>
      </div>

      {selectedState && (
        <>
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Add District</h2>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="grid grid-cols-2 gap-3 max-w-sm">
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1">Name <span className="text-red-500">*</span></label>
                  <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="e.g. Pune" className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1">Sort Order</label>
                  <input type="number" value={form.sortOrder} onChange={e => setForm(p => ({...p, sortOrder: Number(e.target.value)}))} className={inp} />
                </div>
              </div>
              {err && !editId && <p className="text-xs text-red-500">{err}</p>}
              <button type="submit" disabled={saving} className="btn-primary text-sm px-4 py-2">{saving ? 'Saving…' : 'Add'}</button>
            </form>
          </div>

          <div className="card overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-sm text-surface-400">Loading…</div>
            ) : rows.length === 0 ? (
              <div className="p-8 text-center text-sm text-surface-400">No districts yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-100 dark:border-gray-800 bg-surface-50 dark:bg-gray-900/50">
                    {['Name', 'Status', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-medium text-surface-500 dark:text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-gray-800">
                  {rows.map(row => editId === row.id ? (
                    <tr key={row.id} className="bg-blue-50/50 dark:bg-blue-950/20">
                      <td className="px-4 py-3" colSpan={3}>
                        <form onSubmit={handleEdit} className="flex flex-wrap gap-3 items-end">
                          <div className="w-48">
                            <label className="block text-xs text-surface-400 mb-1">Name</label>
                            <input value={editForm.name ?? ''} onChange={e => setEditForm((p: any) => ({...p, name: e.target.value}))} className={inp} />
                          </div>
                          <div className="w-32">
                            <label className="block text-xs text-surface-400 mb-1">Sort Order</label>
                            <input type="number" value={editForm.sortOrder ?? 0} onChange={e => setEditForm((p: any) => ({...p, sortOrder: Number(e.target.value)}))} className={inp} />
                          </div>
                          {err && <p className="text-xs text-red-500 w-full">{err}</p>}
                          <div className="flex gap-2">
                            <button type="submit" disabled={saving} className="btn-primary text-xs px-3 py-1.5">{saving ? 'Saving…' : 'Save'}</button>
                            <button type="button" onClick={() => setEditId(null)} className="btn-secondary text-xs px-3 py-1.5">Cancel</button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  ) : (
                    <tr key={row.id} className="hover:bg-surface-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{row.name}</td>
                      <td className="px-4 py-3">
                        <span className={row.isActive ? ACTIVE : INACTIVE}>
                          <span className={`w-1.5 h-1.5 rounded-full ${row.isActive ? 'bg-emerald-500' : 'bg-surface-400'}`} />
                          {row.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setEditId(row.id); setEditForm({ name: row.name, sortOrder: row.sortOrder ?? 0 }); setErr(''); }}
                            className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-500 transition-colors"
                            title="Edit"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button
                            onClick={() => toggleActive(row)}
                            className={`p-1.5 rounded-lg transition-colors ${row.isActive ? 'hover:bg-red-50 dark:hover:bg-red-950/30 text-red-400' : 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-500'}`}
                            title={row.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {row.isActive
                              ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                              : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
