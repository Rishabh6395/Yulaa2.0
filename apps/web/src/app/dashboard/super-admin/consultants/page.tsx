'use client';

import { useEffect, useRef, useState } from 'react';

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

type BulkResult = {
  total: number;
  created: number;
  linked: number;
  skipped: number;
  failed: number;
  results: { row: number; email: string; status: string; error?: string }[];
};

const AREA_SCOPES = ['school', 'city', 'state', 'national'];

const BLANK_FORM = {
  first_name: '', last_name: '', email: '', phone: '', password: '',
  specialization: '', bio: '', qualifications: '', experience_years: '',
  session_fee: '', is_external: false, area_scope: 'school',
};

export default function SuperAdminConsultantsPage() {
  const [consultants,  setConsultants]  = useState<Consultant[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState<string | null>(null);
  const [filter,       setFilter]       = useState('');
  const [showForm,     setShowForm]     = useState(false);
  const [formSaving,   setFormSaving]   = useState(false);
  const [formError,    setFormError]    = useState('');
  const [form,         setForm]         = useState(BLANK_FORM);
  const [bulkResult,   setBulkResult]   = useState<BulkResult | null>(null);
  const [bulkLoading,  setBulkLoading]  = useState(false);
  const [bulkError,    setBulkError]    = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSaving(true); setFormError('');
    try {
      const res = await fetch('/api/super-admin/consultants', {
        method: 'POST', headers,
        body: JSON.stringify({
          ...form,
          password:        form.password || undefined,
          session_fee:     form.session_fee ? Number(form.session_fee) : undefined,
          experience_years: form.experience_years ? Number(form.experience_years) : undefined,
          allowed_school_ids: [],
        }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || 'Failed to create consultant.'); return; }
      setShowForm(false);
      setForm(BLANK_FORM);
      load();
    } finally {
      setFormSaving(false);
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkLoading(true); setBulkError(''); setBulkResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/super-admin/consultants/bulk', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) { setBulkError(data.error || 'Bulk upload failed.'); return; }
      setBulkResult(data);
      load();
    } catch {
      setBulkError('Network error. Please try again.');
    } finally {
      setBulkLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">All Consultants</h1>
          <p className="text-sm text-surface-400 mt-0.5">Create and manage career consultant profiles, area scope, and external access across all schools.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowForm(s => !s)} className="btn btn-primary">
            {showForm ? 'Cancel' : '+ Create Consultant'}
          </button>
          <label className={`btn btn-secondary cursor-pointer ${bulkLoading ? 'opacity-60 pointer-events-none' : ''}`}>
            {bulkLoading ? 'Uploading…' : 'Upload CSV'}
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleBulkUpload} />
          </label>
          <a
            href="data:text/csv;charset=utf-8,first_name,last_name,email,phone,specialization,bio,qualifications,experience_years,session_fee,is_external,area_scope,allowed_school_ids,school_id,contract_start,contract_end"
            download="consultants_template.csv"
            className="btn btn-secondary text-sm"
          >
            CSV Template
          </a>
        </div>
      </div>

      {/* Inline create form */}
      {showForm && (
        <div className="card p-6 border-2 border-brand-200 dark:border-brand-800 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">New Consultant Account</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">First Name *</label>
              <input required className="input" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Last Name *</label>
              <input required className="input" value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Email *</label>
              <input required type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input type="tel" className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" placeholder="Default: Yulaa@2024" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div>
              <label className="label">Specialization</label>
              <input className="input" placeholder="e.g. College Admissions, STEM Careers" value={form.specialization} onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))} />
            </div>
            <div>
              <label className="label">Session Fee (₹)</label>
              <input type="number" min="0" className="input" placeholder="Leave empty for free" value={form.session_fee} onChange={e => setForm(f => ({ ...f, session_fee: e.target.value }))} />
            </div>
            <div>
              <label className="label">Experience (years)</label>
              <input type="number" min="0" className="input" value={form.experience_years} onChange={e => setForm(f => ({ ...f, experience_years: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Qualifications</label>
              <input className="input" placeholder="e.g. MBA, B.Ed" value={form.qualifications} onChange={e => setForm(f => ({ ...f, qualifications: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Bio</label>
              <textarea rows={2} className="input resize-none" value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />
            </div>
            <div className="col-span-2 flex items-center gap-6 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_external} onChange={e => setForm(f => ({ ...f, is_external: e.target.checked }))} />
                <span className="text-sm">External consultant (not exclusive to one school)</span>
              </label>
              {form.is_external && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-surface-400">Area scope:</span>
                  <select className="input text-sm py-1 px-2 w-32" value={form.area_scope} onChange={e => setForm(f => ({ ...f, area_scope: e.target.value }))}>
                    {AREA_SCOPES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
            </div>
            {formError && (
              <p className="col-span-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                {formError}
              </p>
            )}
            <div className="col-span-2 flex gap-3">
              <button type="submit" disabled={formSaving} className="btn btn-primary">
                {formSaving ? 'Creating…' : 'Create Consultant'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setFormError(''); setForm(BLANK_FORM); }} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bulk upload result */}
      {(bulkError || bulkResult) && (
        <div className={`card p-4 space-y-2 ${bulkResult?.failed ? 'border border-amber-300 dark:border-amber-700' : 'border border-green-300 dark:border-green-700'}`}>
          {bulkError && <p className="text-sm text-red-600 font-medium">{bulkError}</p>}
          {bulkResult && (
            <>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Bulk upload complete — {bulkResult.created} created, {bulkResult.linked} linked, {bulkResult.skipped} skipped, {bulkResult.failed} failed (of {bulkResult.total})
              </p>
              {bulkResult.results.filter(r => r.status === 'failed').map(r => (
                <p key={r.row} className="text-xs text-red-600">Row {r.row} ({r.email}): {r.error}</p>
              ))}
            </>
          )}
          <button onClick={() => { setBulkResult(null); setBulkError(''); }} className="text-xs text-surface-400 hover:underline">Dismiss</button>
        </div>
      )}

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
          <p className="text-surface-400 text-sm">No consultants found. Create a consultant above or upload a CSV file.</p>
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
                      {c.session_fee ? <p className="text-xs text-brand-600 dark:text-brand-400 font-medium mt-0.5">₹{c.session_fee.toLocaleString()} / session</p> : null}
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
