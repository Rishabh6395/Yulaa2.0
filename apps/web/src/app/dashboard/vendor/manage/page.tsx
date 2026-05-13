'use client';

import { useEffect, useState } from 'react';

type Vendor = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  category: string | null;
  is_external: boolean;
  is_active: boolean;
  contract_end: string | null;
  contract_expired: boolean;
  product_count: number;
  avg_rating: number | null;
};

const DEFAULT_CATEGORIES = ['books', 'uniform', 'stationery', 'sports', 'lanyard', 'other'];

const BLANK_FORM = {
  first_name: '', last_name: '', email: '', password: '',
  company_name: '', category: 'books', contract_end: '',
};

export default function ManageVendorsPage() {
  const [vendors,    setVendors]    = useState<Vendor[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const [editId,     setEditId]     = useState<string | null>(null);
  const [newEndDate, setNewEndDate] = useState('');
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [form,       setForm]       = useState(BLANK_FORM);

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const load = () => {
    setLoading(true);
    fetch('/api/vendor/manage', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setVendors(d.vendors ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!token) return;
    fetch('/api/masters/custom/product_category', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.masterValues?.length) {
          const vals = d.masterValues.map((v: any) => v.name.toLowerCase());
          setCategories(vals);
          setForm(f => ({ ...f, category: vals[0] }));
        }
      })
      .catch(() => {});
  }, [token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/vendor/manage', {
        method: 'POST', headers,
        body: JSON.stringify({
          first_name:   form.first_name,
          last_name:    form.last_name,
          email:        form.email,
          password:     form.password || undefined,
          company_name: form.company_name,
          category:     form.category,
          contract_end: form.contract_end || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to create vendor.'); return; }
      setShowForm(false);
      setForm(f => ({ ...BLANK_FORM, category: f.category }));
      load();
    } finally {
      setSaving(false);
    }
  };

  const updateContract = async (vendorId: string) => {
    if (!newEndDate) return;
    await fetch('/api/vendor/manage', {
      method: 'PATCH', headers,
      body: JSON.stringify({ vendor_id: vendorId, contract_end: newEndDate }),
    });
    setEditId(null);
    setNewEndDate('');
    load();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Vendors</h1>
          <p className="text-sm text-surface-400 mt-0.5">Manage internal vendors for your school. External vendors are managed by your Yulaa super admin.</p>
        </div>
        <button onClick={() => setShowForm(s => !s)} className="btn btn-primary">
          {showForm ? 'Cancel' : '+ Add Vendor'}
        </button>
      </div>

      {showForm && (
        <div className="card p-6 space-y-4 border-2 border-brand-200 dark:border-brand-800">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">New Internal Vendor</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Company / Shop Name *</label>
              <input required className="input" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Contact First Name *</label>
              <input required className="input" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Contact Last Name *</label>
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
              <label className="label">Product Category *</label>
              <select required className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {categories.map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Contract End Date</label>
              <input type="date" className="input" value={form.contract_end} onChange={e => setForm(f => ({ ...f, contract_end: e.target.value }))} />
            </div>
            {error && (
              <p className="col-span-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{error}</p>
            )}
            <div className="col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Creating…' : 'Create Vendor'}</button>
              <button type="button" onClick={() => { setShowForm(false); setError(''); setForm(f => ({ ...BLANK_FORM, category: f.category })); }} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="card p-4 animate-pulse h-20 bg-surface-100 dark:bg-gray-800" />)}
        </div>
      ) : vendors.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-surface-400 text-sm">No vendors yet. Add your first internal vendor to get started.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-50 dark:bg-gray-800 border-b border-surface-200 dark:border-gray-700">
              <tr>
                <th className="text-left p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Vendor</th>
                <th className="text-left p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Category</th>
                <th className="text-left p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Products</th>
                <th className="text-left p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Contract</th>
                <th className="text-left p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Rating</th>
                <th className="text-left p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-gray-700">
              {vendors.map(v => (
                <tr key={v.id} className="hover:bg-surface-50/50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="p-4">
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{v.company_name}</p>
                    <p className="text-xs text-surface-400">{v.contact_name} · {v.email}</p>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded mt-0.5 inline-block ${v.is_external ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                      {v.is_external ? 'External' : 'Internal'}
                    </span>
                  </td>
                  <td className="p-4">
                    {v.category && (
                      <span className="text-xs bg-surface-100 dark:bg-gray-700 px-2 py-0.5 rounded-full capitalize">{v.category}</span>
                    )}
                  </td>
                  <td className="p-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {v.product_count} products
                  </td>
                  <td className="p-4">
                    {editId === v.id ? (
                      <div className="flex items-center gap-2">
                        <input type="date" className="input text-xs py-1 px-2 w-36" value={newEndDate} onChange={e => setNewEndDate(e.target.value)} />
                        <button onClick={() => updateContract(v.id)} className="text-xs text-brand-600 font-medium hover:underline">Save</button>
                        <button onClick={() => setEditId(null)} className="text-xs text-surface-400 hover:underline">Cancel</button>
                      </div>
                    ) : v.contract_end ? (
                      <span className={`text-xs font-medium ${v.contract_expired ? 'text-red-500' : 'text-surface-400'}`}>
                        {v.contract_expired ? 'Expired' : 'Until'} {new Date(v.contract_end).toLocaleDateString('en-IN')}
                      </span>
                    ) : (
                      <span className="text-xs text-surface-400">No expiry</span>
                    )}
                  </td>
                  <td className="p-4">
                    {v.avg_rating ? (
                      <span className="text-sm text-amber-500 font-medium">★ {v.avg_rating.toFixed(1)}</span>
                    ) : (
                      <span className="text-xs text-surface-400">—</span>
                    )}
                  </td>
                  <td className="p-4">
                    <button onClick={() => { setEditId(v.id); setNewEndDate(''); }} className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium">
                      Edit Contract
                    </button>
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
