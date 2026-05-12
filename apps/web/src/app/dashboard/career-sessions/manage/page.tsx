'use client';

import { useEffect, useState } from 'react';

type ContractRow = {
  contract_id: string;
  contract_no: string;
  start_date: string;
  end_date: string;
  status: string;
  days_remaining: number;
  consultant: {
    id: string;
    name: string;
    email: string;
    specialization: string | null;
    session_fee: number | null;
    is_external: boolean;
    is_active: boolean;
    avg_rating: number | null;
  };
};

type QualificationItem = { id: string; name: string };

export default function ManageConsultantsPage() {
  const [rows,          setRows]          = useState<ContractRow[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [showForm,      setShowForm]      = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState('');
  const [editId,        setEditId]        = useState<string | null>(null);
  const [newEndDate,    setNewEndDate]    = useState('');
  const [qualifications, setQualifications] = useState<QualificationItem[]>([]);

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', password: '',
    specialization: '', qualifications: [] as string[], session_fee: '',
    is_external: false, contract_end: '',
  });

  const token    = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const userRole = typeof window !== 'undefined'
    ? (JSON.parse(localStorage.getItem('user') || '{}').primaryRole || '')
    : '';
  const isSuperAdmin = userRole === 'super_admin';
  const headers  = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const load = () => {
    setLoading(true);
    fetch('/api/consultant/manage', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setRows(d.consultants ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!token) return;
    fetch('/api/masters/qualifications', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setQualifications(d.qualificationMasters ?? []))
      .catch(() => {});
  }, [token]);

  const toggleQual = (name: string) => {
    setForm(f => ({
      ...f,
      qualifications: f.qualifications.includes(name)
        ? f.qualifications.filter(q => q !== name)
        : [...f.qualifications, name],
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    const res = await fetch('/api/consultant/manage', {
      method: 'POST', headers,
      body: JSON.stringify({
        first_name:    form.first_name,
        last_name:     form.last_name,
        email:         form.email,
        password:      form.password,
        specialization: form.specialization || undefined,
        qualifications: form.qualifications.length ? form.qualifications.join(', ') : undefined,
        session_fee:   form.session_fee ? Number(form.session_fee) : undefined,
        is_external:   isSuperAdmin ? form.is_external : false,
        contract_end:  form.contract_end,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Failed to create consultant.'); setSaving(false); return; }
    setShowForm(false);
    setForm({ first_name: '', last_name: '', email: '', password: '', specialization: '', qualifications: [], session_fee: '', is_external: false, contract_end: '' });
    load();
    setSaving(false);
  };

  const updateContract = async (contractId: string) => {
    if (!newEndDate) return;
    await fetch('/api/consultant/manage', {
      method: 'PATCH', headers,
      body: JSON.stringify({ contract_id: contractId, contract_end: newEndDate }),
    });
    setEditId(null);
    setNewEndDate('');
    load();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Career Consultants</h1>
          <p className="text-sm text-surface-400 mt-0.5">Manage consultants for your school — create and link career consultants.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">+ Add Consultant</button>
      </div>

      {showForm && (
        <div className="card p-6 space-y-4 border-2 border-brand-200 dark:border-brand-800">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">New Consultant</h2>
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
              <label className="label">Contract End Date *</label>
              <input required type="date" className="input" value={form.contract_end} onChange={e => setForm(f => ({ ...f, contract_end: e.target.value }))} />
            </div>

            {/* Qualifications from master */}
            {qualifications.length > 0 && (
              <div className="col-span-2">
                <label className="label">Qualifications</label>
                <div className="flex flex-wrap gap-2 p-3 border border-surface-200 dark:border-gray-700 rounded-xl bg-surface-50 dark:bg-gray-800/30">
                  {qualifications.map(q => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => toggleQual(q.name)}
                      className={`px-3 py-1 text-xs rounded-full border font-medium transition-colors ${
                        form.qualifications.includes(q.name)
                          ? 'bg-brand-500 text-white border-brand-500'
                          : 'border-surface-200 dark:border-gray-600 text-surface-500 dark:text-gray-400 hover:border-brand-300'
                      }`}
                    >
                      {q.name}
                    </button>
                  ))}
                </div>
                {form.qualifications.length > 0 && (
                  <p className="text-xs text-surface-400 mt-1">Selected: {form.qualifications.join(', ')}</p>
                )}
              </div>
            )}

            {/* External checkbox — only for super_admin */}
            {isSuperAdmin && (
              <div className="col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_external}
                    onChange={e => setForm(f => ({ ...f, is_external: e.target.checked }))}
                  />
                  <span className="text-sm">External consultant (not exclusive to this school)</span>
                </label>
              </div>
            )}

            {error && <p className="col-span-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{error}</p>}
            <div className="col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Creating…' : 'Create Consultant'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="card p-4 animate-pulse h-20 bg-surface-100 dark:bg-gray-800" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-surface-400 text-sm">No consultants yet. Add your first consultant to get started.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-50 dark:bg-gray-800 border-b border-surface-200 dark:border-gray-700">
              <tr>
                <th className="text-left p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Consultant</th>
                <th className="text-left p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Type</th>
                <th className="text-left p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Fee</th>
                <th className="text-left p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Contract</th>
                <th className="text-left p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Rating</th>
                <th className="text-left p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-gray-700">
              {rows.map(row => {
                const expired = new Date(row.end_date) < new Date();
                return (
                  <tr key={row.contract_id} className="hover:bg-surface-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="p-4">
                      <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{row.consultant.name}</p>
                      <p className="text-xs text-surface-400">{row.consultant.email}</p>
                      {row.consultant.specialization && <p className="text-xs text-surface-400">{row.consultant.specialization}</p>}
                    </td>
                    <td className="p-4">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${row.consultant.is_external ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                        {row.consultant.is_external ? 'External' : 'Internal'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-700 dark:text-gray-300">
                      {row.consultant.session_fee ? `₹${row.consultant.session_fee.toLocaleString()}` : 'Free'}
                    </td>
                    <td className="p-4">
                      {editId === row.contract_id ? (
                        <div className="flex items-center gap-2">
                          <input type="date" className="input text-xs py-1 px-2 w-36" value={newEndDate} onChange={e => setNewEndDate(e.target.value)} />
                          <button onClick={() => updateContract(row.contract_id)} className="text-xs text-brand-600 font-medium hover:underline">Save</button>
                          <button onClick={() => setEditId(null)} className="text-xs text-surface-400 hover:underline">Cancel</button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{row.contract_no}</p>
                          <p className={`text-xs ${expired ? 'text-red-500' : row.days_remaining < 30 ? 'text-amber-500' : 'text-surface-400'}`}>
                            {expired ? 'Expired' : `Until ${new Date(row.end_date).toLocaleDateString('en-IN')}`}
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      {row.consultant.avg_rating ? (
                        <span className="text-sm text-amber-500 font-medium">★ {row.consultant.avg_rating.toFixed(1)}</span>
                      ) : (
                        <span className="text-xs text-surface-400">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <button onClick={() => { setEditId(row.contract_id); setNewEndDate(''); }} className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium">
                        Extend Contract
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
