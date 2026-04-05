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

export default function StatesPage() {
  const [countries, setCountries] = useState<any[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', sortOrder: 0 });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch('/api/masters/countries', { headers: headers() })
      .then(r => r.json()).then(d => setCountries(d.countries ?? []));
  }, []);

  const loadStates = useCallback(async (countryId: string) => {
    if (!countryId) return;
    setLoading(true);
    const res = await fetch(`/api/masters/states?countryId=${countryId}`, { headers: headers() });
    const d = await res.json();
    setRows(d.states ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadStates(selectedCountry); }, [selectedCountry, loadStates]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErr('');
    const res = await fetch('/api/masters/states', {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ countryId: selectedCountry, ...form }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) { setErr(d.error ?? 'Failed'); return; }
    setForm({ name: '', code: '', sortOrder: 0 });
    loadStates(selectedCountry);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErr('');
    const res = await fetch('/api/masters/states', {
      method: 'PATCH', headers: headers(),
      body: JSON.stringify({ id: editId, ...editForm }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) { setErr(d.error ?? 'Failed'); return; }
    setEditId(null);
    loadStates(selectedCountry);
  }

  async function toggleActive(row: any) {
    await fetch('/api/masters/states', { method: 'PATCH', headers: headers(), body: JSON.stringify({ id: row.id, isActive: !row.isActive }) });
    loadStates(selectedCountry);
  }

  const inp = 'border border-surface-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/masters" className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-gray-800 text-surface-400 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">States</h1>
          <p className="text-sm text-surface-400 mt-0.5">States per country</p>
        </div>
      </div>

      <div className="card p-5">
        <label className="block text-xs font-medium text-surface-400 mb-1">Select Country</label>
        <select value={selectedCountry} onChange={e => setSelectedCountry(e.target.value)} className="border border-surface-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm px-3 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">— choose country —</option>
          {countries.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
        </select>
      </div>

      {selectedCountry && (
        <>
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Add State</h2>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg">
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1">Name <span className="text-red-500">*</span></label>
                  <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="e.g. Maharashtra" className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1">Code</label>
                  <input value={form.code} onChange={e => setForm(p => ({...p, code: e.target.value}))} placeholder="e.g. DL" className={inp} />
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
              <div className="p-8 text-center text-sm text-surface-400">No states yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-100 dark:border-gray-800 bg-surface-50 dark:bg-gray-900/50">
                    {['Name', 'Code', 'Status', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-medium text-surface-500 dark:text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-gray-800">
                  {rows.map(row => editId === row.id ? (
                    <tr key={row.id} className="bg-blue-50/50 dark:bg-blue-950/20">
                      <td className="px-4 py-3" colSpan={4}>
                        <form onSubmit={handleEdit} className="flex flex-wrap gap-3 items-end">
                          {([['name', 'Name', 'text'], ['code', 'Code', 'text'], ['sortOrder', 'Sort Order', 'number']] as const).map(([k, l, t]) => (
                            <div key={k} className="w-36">
                              <label className="block text-xs text-surface-400 mb-1">{l}</label>
                              <input type={t} value={editForm[k] ?? ''} onChange={e => setEditForm((p: any) => ({...p, [k]: t === 'number' ? Number(e.target.value) : e.target.value}))} className={inp} />
                            </div>
                          ))}
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
                      <td className="px-4 py-3 text-surface-500 dark:text-gray-400">{row.code ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={row.isActive ? ACTIVE : INACTIVE}>
                          <span className={`w-1.5 h-1.5 rounded-full ${row.isActive ? 'bg-emerald-500' : 'bg-surface-400'}`} />
                          {row.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setEditId(row.id); setEditForm({ name: row.name, code: row.code ?? '', sortOrder: row.sortOrder ?? 0 }); setErr(''); }}
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
