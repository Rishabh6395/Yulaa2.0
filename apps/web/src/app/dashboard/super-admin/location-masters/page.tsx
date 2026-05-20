'use client';

import { useState, useEffect, useCallback } from 'react';

function getToken() {
  if (typeof document === 'undefined') return '';
  return document.cookie.split(';').map(c => c.trim()).find(c => c.startsWith('token='))?.split('=')[1] ?? '';
}

const hdrs = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

const inp  = 'border border-surface-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full';
const ACTIVE   = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800';
const INACTIVE = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-surface-100 dark:bg-gray-800 text-surface-400 dark:text-gray-500 border border-surface-200 dark:border-gray-700';

// ─── Countries ────────────────────────────────────────────────────────────────

function CountriesSection() {
  const [rows,    setRows]    = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form,    setForm]    = useState({ name: '', code: '' });
  const [editId,  setEditId]  = useState<string | null>(null);
  const [editForm,setEditForm]= useState({ name: '', code: '' });
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res  = await fetch('/api/masters/countries?includeInactive=true', { headers: hdrs() });
    const data = await res.json();
    setRows(data.countries ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErr('');
    const res  = await fetch('/api/masters/countries', { method: 'POST', headers: hdrs(), body: JSON.stringify(form) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setErr(data.error ?? 'Failed'); return; }
    setForm({ name: '', code: '' }); load();
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErr('');
    const res  = await fetch('/api/masters/countries', { method: 'PATCH', headers: hdrs(), body: JSON.stringify({ id: editId, ...editForm }) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setErr(data.error ?? 'Failed'); return; }
    setEditId(null); load();
  }

  async function toggleActive(row: any) {
    await fetch('/api/masters/countries', { method: 'PATCH', headers: hdrs(), body: JSON.stringify({ id: row.id, isActive: !row.isActive }) });
    load();
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-gray-500">Countries</h2>

      <div className="card p-5">
        <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-40">
            <label className="block text-xs font-medium text-surface-400 mb-1">Name <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. India" required className={inp} />
          </div>
          <div className="w-28">
            <label className="block text-xs font-medium text-surface-400 mb-1">Code <span className="text-red-500">*</span></label>
            <input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="IN" maxLength={3} required className={inp} />
          </div>
          {err && !editId && <p className="text-xs text-red-500 w-full">{err}</p>}
          <button type="submit" disabled={saving} className="btn-primary text-sm px-4 py-2">{saving ? 'Saving…' : 'Add Country'}</button>
        </form>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-sm text-surface-400">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-center text-sm text-surface-400">No countries yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100 dark:border-gray-800 bg-surface-50 dark:bg-gray-900/50">
                {['Country', 'Code', 'Status', ''].map(h => <th key={h} className="text-left px-4 py-3 font-medium text-surface-500 dark:text-gray-400">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-gray-800">
              {rows.map(row => editId === row.id ? (
                <tr key={row.id} className="bg-blue-50/50 dark:bg-blue-950/20">
                  <td className="px-4 py-3" colSpan={4}>
                    <form onSubmit={handleEdit} className="flex flex-wrap gap-3 items-end">
                      <div className="flex-1 min-w-40"><input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className={inp} /></div>
                      <div className="w-28"><input value={editForm.code} onChange={e => setEditForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} maxLength={3} className={inp} /></div>
                      {err && <p className="text-xs text-red-500 w-full">{err}</p>}
                      <div className="flex gap-2">
                        <button type="submit" disabled={saving} className="btn-primary text-xs px-3 py-1.5">{saving ? 'Saving…' : 'Save'}</button>
                        <button type="button" onClick={() => { setEditId(null); setErr(''); }} className="btn-secondary text-xs px-3 py-1.5">Cancel</button>
                      </div>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={row.id} className="hover:bg-surface-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{row.name}</td>
                  <td className="px-4 py-3 text-surface-500 dark:text-gray-400 font-mono text-xs">{row.code}</td>
                  <td className="px-4 py-3"><span className={row.isActive ? ACTIVE : INACTIVE}><span className={`w-1.5 h-1.5 rounded-full ${row.isActive ? 'bg-emerald-500' : 'bg-surface-400'}`} />{row.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setEditId(row.id); setEditForm({ name: row.name, code: row.code }); setErr(''); }} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-500 transition-colors" title="Edit">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={() => toggleActive(row)} className={`p-1.5 rounded-lg transition-colors ${row.isActive ? 'hover:bg-red-50 dark:hover:bg-red-950/30 text-red-400' : 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-500'}`} title={row.isActive ? 'Deactivate' : 'Activate'}>
                        {row.isActive
                          ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                          : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── States ───────────────────────────────────────────────────────────────────

function StatesSection({ countries }: { countries: any[] }) {
  const [rows,       setRows]       = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [form,       setForm]       = useState({ countryId: '', name: '', code: '' });
  const [editId,     setEditId]     = useState<string | null>(null);
  const [editForm,   setEditForm]   = useState({ name: '', code: '' });
  const [saving,     setSaving]     = useState(false);
  const [err,        setErr]        = useState('');
  const [filterCtry, setFilterCtry] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res  = await fetch('/api/masters/states?includeInactive=true', { headers: hdrs() });
    const data = await res.json();
    setRows(data.states ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const visibleRows = filterCtry ? rows.filter(r => r.countryId === filterCtry) : rows;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErr('');
    const res  = await fetch('/api/masters/states', { method: 'POST', headers: hdrs(), body: JSON.stringify(form) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setErr(data.error ?? 'Failed'); return; }
    setForm({ countryId: form.countryId, name: '', code: '' }); load();
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErr('');
    const res  = await fetch('/api/masters/states', { method: 'PATCH', headers: hdrs(), body: JSON.stringify({ id: editId, ...editForm }) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setErr(data.error ?? 'Failed'); return; }
    setEditId(null); load();
  }

  async function toggleActive(row: any) {
    await fetch('/api/masters/states', { method: 'PATCH', headers: hdrs(), body: JSON.stringify({ id: row.id, isActive: !row.isActive }) });
    load();
  }

  const countryName = (id: string) => countries.find(c => c.id === id)?.name ?? '—';

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-gray-500">States / Provinces</h2>

      <div className="card p-5">
        <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
          <div className="w-52">
            <label className="block text-xs font-medium text-surface-400 mb-1">Country <span className="text-red-500">*</span></label>
            <select value={form.countryId} onChange={e => setForm(p => ({ ...p, countryId: e.target.value }))} required className={inp}>
              <option value="">— select country —</option>
              {countries.filter(c => c.isActive).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-40">
            <label className="block text-xs font-medium text-surface-400 mb-1">Name <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Maharashtra" required className={inp} />
          </div>
          <div className="w-24">
            <label className="block text-xs font-medium text-surface-400 mb-1">Code</label>
            <input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="MH" maxLength={10} className={inp} />
          </div>
          {err && !editId && <p className="text-xs text-red-500 w-full">{err}</p>}
          <button type="submit" disabled={saving} className="btn-primary text-sm px-4 py-2">{saving ? 'Saving…' : 'Add State'}</button>
        </form>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-xs font-medium text-surface-400">Filter by country:</label>
        <select value={filterCtry} onChange={e => setFilterCtry(e.target.value)} className="border border-surface-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All countries</option>
          {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span className="text-xs text-surface-400">{visibleRows.length} state{visibleRows.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-sm text-surface-400">Loading…</div>
        ) : visibleRows.length === 0 ? (
          <div className="p-6 text-center text-sm text-surface-400">No states yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100 dark:border-gray-800 bg-surface-50 dark:bg-gray-900/50">
                {['Country', 'State', 'Code', 'Status', ''].map(h => <th key={h} className="text-left px-4 py-3 font-medium text-surface-500 dark:text-gray-400">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-gray-800">
              {visibleRows.map(row => editId === row.id ? (
                <tr key={row.id} className="bg-blue-50/50 dark:bg-blue-950/20">
                  <td className="px-4 py-3 text-surface-500 dark:text-gray-400 text-xs">{countryName(row.countryId)}</td>
                  <td className="px-4 py-3" colSpan={3}>
                    <form onSubmit={handleEdit} className="flex flex-wrap gap-3 items-end">
                      <div className="flex-1 min-w-40"><input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className={inp} /></div>
                      <div className="w-24"><input value={editForm.code} onChange={e => setEditForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} maxLength={10} className={inp} /></div>
                      {err && <p className="text-xs text-red-500 w-full">{err}</p>}
                      <div className="flex gap-2">
                        <button type="submit" disabled={saving} className="btn-primary text-xs px-3 py-1.5">{saving ? 'Saving…' : 'Save'}</button>
                        <button type="button" onClick={() => { setEditId(null); setErr(''); }} className="btn-secondary text-xs px-3 py-1.5">Cancel</button>
                      </div>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={row.id} className="hover:bg-surface-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 text-surface-500 dark:text-gray-400 text-xs">{countryName(row.countryId)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{row.name}</td>
                  <td className="px-4 py-3 text-surface-500 dark:text-gray-400 font-mono text-xs">{row.code ?? '—'}</td>
                  <td className="px-4 py-3"><span className={row.isActive ? ACTIVE : INACTIVE}><span className={`w-1.5 h-1.5 rounded-full ${row.isActive ? 'bg-emerald-500' : 'bg-surface-400'}`} />{row.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setEditId(row.id); setEditForm({ name: row.name, code: row.code ?? '' }); setErr(''); }} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-500 transition-colors" title="Edit">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={() => toggleActive(row)} className={`p-1.5 rounded-lg transition-colors ${row.isActive ? 'hover:bg-red-50 dark:hover:bg-red-950/30 text-red-400' : 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-500'}`} title={row.isActive ? 'Deactivate' : 'Activate'}>
                        {row.isActive
                          ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                          : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Districts ────────────────────────────────────────────────────────────────

function DistrictsSection({ countries }: { countries: any[] }) {
  const [rows,         setRows]         = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [filterCtry,   setFilterCtry]   = useState('');
  const [filterStates, setFilterStates] = useState<any[]>([]);
  const [form,         setForm]         = useState({ stateId: '', name: '' });
  const [formStates,   setFormStates]   = useState<any[]>([]);
  const [formCountry,  setFormCountry]  = useState('');
  const [editId,       setEditId]       = useState<string | null>(null);
  const [editName,     setEditName]     = useState('');
  const [saving,       setSaving]       = useState(false);
  const [err,          setErr]          = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res  = await fetch('/api/masters/districts?includeInactive=true', { headers: hdrs() });
    const data = await res.json();
    setRows(data.districts ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!filterCtry) { setFilterStates([]); return; }
    fetch(`/api/masters/states?countryId=${filterCtry}&includeInactive=true`, { headers: hdrs() })
      .then(r => r.json()).then(d => setFilterStates(d.states ?? []));
  }, [filterCtry]);

  useEffect(() => {
    setForm(p => ({ ...p, stateId: '' })); setFormStates([]);
    if (!formCountry) return;
    fetch(`/api/masters/states?countryId=${formCountry}&includeInactive=true`, { headers: hdrs() })
      .then(r => r.json()).then(d => setFormStates(d.states ?? []));
  }, [formCountry]);

  const [filterState, setFilterState] = useState('');
  const visibleRows = rows.filter(r => {
    if (filterState) return r.stateId === filterState;
    if (filterCtry)  return filterStates.some(s => s.id === r.stateId);
    return true;
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErr('');
    const res  = await fetch('/api/masters/districts', { method: 'POST', headers: hdrs(), body: JSON.stringify(form) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setErr(data.error ?? 'Failed'); return; }
    setForm(p => ({ ...p, name: '' })); load();
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErr('');
    const res  = await fetch('/api/masters/districts', { method: 'PATCH', headers: hdrs(), body: JSON.stringify({ id: editId, name: editName }) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setErr(data.error ?? 'Failed'); return; }
    setEditId(null); load();
  }

  async function toggleActive(row: any) {
    await fetch('/api/masters/districts', { method: 'PATCH', headers: hdrs(), body: JSON.stringify({ id: row.id, isActive: !row.isActive }) });
    load();
  }

  const stateName = (id: string) => rows.find(r => r.stateId === id)?.state?.name ?? (filterStates.find(s => s.id === id) ?? formStates.find(s => s.id === id))?.name ?? '—';

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-gray-500">Districts</h2>

      <div className="card p-5">
        <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
          <div className="w-44">
            <label className="block text-xs font-medium text-surface-400 mb-1">Country</label>
            <select value={formCountry} onChange={e => setFormCountry(e.target.value)} className={inp}>
              <option value="">— select country —</option>
              {countries.filter(c => c.isActive).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="w-44">
            <label className="block text-xs font-medium text-surface-400 mb-1">State <span className="text-red-500">*</span></label>
            <select value={form.stateId} onChange={e => setForm(p => ({ ...p, stateId: e.target.value }))} required disabled={!formCountry} className={inp}>
              <option value="">— select state —</option>
              {formStates.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-40">
            <label className="block text-xs font-medium text-surface-400 mb-1">District Name <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Pune" required className={inp} />
          </div>
          {err && !editId && <p className="text-xs text-red-500 w-full">{err}</p>}
          <button type="submit" disabled={saving} className="btn-primary text-sm px-4 py-2">{saving ? 'Saving…' : 'Add District'}</button>
        </form>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-xs font-medium text-surface-400">Filter:</label>
        <select value={filterCtry} onChange={e => { setFilterCtry(e.target.value); setFilterState(''); }} className="border border-surface-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All countries</option>
          {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {filterCtry && (
          <select value={filterState} onChange={e => setFilterState(e.target.value)} className="border border-surface-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All states</option>
            {filterStates.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        <span className="text-xs text-surface-400">{visibleRows.length} district{visibleRows.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-sm text-surface-400">Loading…</div>
        ) : visibleRows.length === 0 ? (
          <div className="p-6 text-center text-sm text-surface-400">No districts yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100 dark:border-gray-800 bg-surface-50 dark:bg-gray-900/50">
                {['State', 'District', 'Status', ''].map(h => <th key={h} className="text-left px-4 py-3 font-medium text-surface-500 dark:text-gray-400">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-gray-800">
              {visibleRows.map(row => editId === row.id ? (
                <tr key={row.id} className="bg-blue-50/50 dark:bg-blue-950/20">
                  <td className="px-4 py-3 text-surface-500 dark:text-gray-400 text-xs">{row.state?.name ?? '—'}</td>
                  <td className="px-4 py-3" colSpan={2}>
                    <form onSubmit={handleEdit} className="flex gap-3 items-end">
                      <div className="flex-1 min-w-40"><input value={editName} onChange={e => setEditName(e.target.value)} className={inp} /></div>
                      {err && <p className="text-xs text-red-500">{err}</p>}
                      <div className="flex gap-2">
                        <button type="submit" disabled={saving} className="btn-primary text-xs px-3 py-1.5">{saving ? 'Saving…' : 'Save'}</button>
                        <button type="button" onClick={() => { setEditId(null); setErr(''); }} className="btn-secondary text-xs px-3 py-1.5">Cancel</button>
                      </div>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={row.id} className="hover:bg-surface-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 text-surface-500 dark:text-gray-400 text-xs">{row.state?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{row.name}</td>
                  <td className="px-4 py-3"><span className={row.isActive ? ACTIVE : INACTIVE}><span className={`w-1.5 h-1.5 rounded-full ${row.isActive ? 'bg-emerald-500' : 'bg-surface-400'}`} />{row.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setEditId(row.id); setEditName(row.name); setErr(''); }} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-500 transition-colors" title="Edit">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={() => toggleActive(row)} className={`p-1.5 rounded-lg transition-colors ${row.isActive ? 'hover:bg-red-50 dark:hover:bg-red-950/30 text-red-400' : 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-500'}`} title={row.isActive ? 'Deactivate' : 'Activate'}>
                        {row.isActive
                          ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                          : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LocationMastersPage() {
  const [countries, setCountries] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/masters/countries?includeInactive=true', { headers: hdrs() })
      .then(r => r.json()).then(d => setCountries(d.countries ?? []));
  }, []);

  return (
    <div className="space-y-10 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Location Masters</h1>
        <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">
          System-wide location data — Countries, States, Districts shared across all schools
        </p>
      </div>

      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-400">
        These records are system-level and shared across all schools. Only super admins can manage them.
        Schools use these when setting up their physical campus addresses.
      </div>

      <CountriesSection />
      <StatesSection countries={countries} />
      <DistrictsSection countries={countries} />
    </div>
  );
}
