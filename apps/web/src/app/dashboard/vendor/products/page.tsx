'use client';

import { useEffect, useState } from 'react';

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  mrp: number | null;
  quantity: number;
  unit: string;
  image_urls: string[];
  tags: string[];
  created_at: string;
};

export default function VendorProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [form, setForm] = useState({ name: '', category: 'books', price: '', mrp: '', quantity: '', unit: 'piece', description: '' });

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const load = () => {
    setLoading(true);
    fetch('/api/vendor/products', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setProducts(d.products ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/vendor/products', {
        method: 'POST', headers,
        body: JSON.stringify({
          name: form.name, category: form.category,
          price: Number(form.price), mrp: form.mrp ? Number(form.mrp) : undefined,
          quantity: Number(form.quantity), unit: form.unit, description: form.description || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create product');
      setShowForm(false);
      setForm({ name: '', category: 'books', price: '', mrp: '', quantity: '', unit: 'piece', description: '' });
      load();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  const toggleActive = async (id: string) => {
    await fetch('/api/vendor/products', {
      method: 'PATCH', headers,
      body: JSON.stringify({ id, is_active: false }),
    });
    load();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">My Products</h1>
          <p className="text-sm text-surface-400 mt-0.5">{products.length} products listed</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">+ Add Product</button>
      </div>

      {showForm && (
        <div className="card p-6 space-y-4 border-2 border-brand-200 dark:border-brand-800">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">New Product</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Product Name *</label>
              <input required className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Class 10 Math Textbook" />
            </div>
            <div>
              <label className="label">Category *</label>
              <select required className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {['books', 'uniform', 'stationery', 'sports', 'lanyard', 'other'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Price (₹) *</label>
              <input required type="number" min="0" className="input" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="350" />
            </div>
            <div>
              <label className="label">MRP (₹)</label>
              <input type="number" min="0" className="input" value={form.mrp} onChange={e => setForm(f => ({ ...f, mrp: e.target.value }))} placeholder="400" />
            </div>
            <div>
              <label className="label">Stock Quantity</label>
              <input type="number" min="0" className="input" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="100" />
            </div>
            <div>
              <label className="label">Unit</label>
              <input className="input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="piece" />
            </div>
            <div className="col-span-2">
              <label className="label">Description</label>
              <textarea className="input" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief product description…" />
            </div>
            {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}
            <div className="col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : 'Create Product'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse h-16 bg-surface-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-surface-400 text-sm">No products yet. Add your first product.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-50 dark:bg-gray-800 border-b border-surface-200 dark:border-gray-700">
              <tr>
                <th className="text-left p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Product</th>
                <th className="text-left p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Category</th>
                <th className="text-right p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Price</th>
                <th className="text-right p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Stock</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-gray-700">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-surface-50/50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="p-4">
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{p.name}</p>
                  </td>
                  <td className="p-4">
                    <span className="text-xs bg-surface-100 dark:bg-gray-700 px-2 py-0.5 rounded-full capitalize">{p.category}</span>
                  </td>
                  <td className="p-4 text-right">
                    <span className="font-semibold text-sm">₹{p.price.toLocaleString()}</span>
                    {p.mrp && <span className="text-xs text-surface-400 line-through ml-1">₹{p.mrp.toLocaleString()}</span>}
                  </td>
                  <td className="p-4 text-right">
                    <span className={`text-sm font-medium ${p.quantity === 0 ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
                      {p.quantity} {p.unit}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => toggleActive(p.id)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      Deactivate
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
