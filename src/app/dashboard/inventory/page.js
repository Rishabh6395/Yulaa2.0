'use client';

import { useState, useEffect, useCallback } from 'react';

const CATEGORIES = [
  { value: '',           label: 'All Categories' },
  { value: 'books',      label: 'Books' },
  { value: 'uniform',    label: 'Uniform' },
  { value: 'lanyard',    label: 'Lanyard' },
  { value: 'stationery', label: 'Stationery' },
  { value: 'sports',     label: 'Sports' },
  { value: 'other',      label: 'Other' },
];

const CATEGORY_COLORS = {
  books:      { bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500' },
  uniform:    { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  lanyard:    { bg: 'bg-teal-100',   text: 'text-teal-700',   dot: 'bg-teal-500' },
  stationery: { bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-500' },
  sports:     { bg: 'bg-emerald-100',text: 'text-emerald-700',dot: 'bg-emerald-500' },
  other:      { bg: 'bg-surface-100',text: 'text-surface-600',dot: 'bg-surface-400' },
};

const STATUS_CFG = {
  available:    { label: 'Available',    cls: 'badge-success' },
  out_of_stock: { label: 'Out of Stock', cls: 'badge-danger' },
  discontinued: { label: 'Discontinued', cls: 'badge-neutral' },
};

function CategoryBadge({ category }) {
  const cfg = CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}/>
      {category.charAt(0).toUpperCase() + category.slice(1)}
    </span>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || { label: status, cls: 'badge-neutral' };
  return <span className={cfg.cls}>{cfg.label}</span>;
}

const EMPTY_FORM = { name: '', category: 'books', description: '', price: '', quantity: '', unit: 'piece', status: 'available' };

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text }
  const [role, setRole] = useState(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try { setRole(JSON.parse(userData).primaryRole); } catch {}
    }
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (categoryFilter) params.set('category', categoryFilter);
    const res = await fetch(`/api/vendor/inventory?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setItems(data.items || []);
    setSummary(data.summary || []);
    setLoading(false);
  }, [categoryFilter, token]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openAddForm = () => { setEditItem(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEditForm = (item) => {
    setEditItem(item);
    setForm({
      name: item.name, category: item.category, description: item.description || '',
      price: item.price, quantity: item.quantity, unit: item.unit, status: item.status,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const method = editItem ? 'PATCH' : 'POST';
    const body = editItem ? { id: editItem.id, ...form } : form;

    const res = await fetch('/api/vendor/inventory', {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (res.ok) {
      setMessage({ type: 'success', text: editItem ? 'Item updated successfully.' : 'Item added successfully.' });
      setShowForm(false);
      setEditItem(null);
      fetchItems();
    } else {
      setMessage({ type: 'error', text: data.error || 'Something went wrong.' });
    }
    setSaving(false);
    setTimeout(() => setMessage(null), 4000);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this item?')) return;
    const res = await fetch(`/api/vendor/inventory?id=${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) { fetchItems(); }
  };

  const isVendor = role === 'vendor';
  const totalItems = items.length;
  const availableItems = items.filter(i => i.status === 'available').length;
  const outOfStock = items.filter(i => i.status === 'out_of_stock').length;
  const totalValue = items.reduce((s, i) => s + parseFloat(i.price) * parseInt(i.quantity || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">
            {isVendor ? 'My Inventory' : 'Vendor Inventory'}
          </h1>
          <p className="text-sm text-surface-400 mt-0.5">
            {isVendor ? 'Manage your product catalogue for schools' : 'Browse items available from vendors'}
          </p>
        </div>
        {isVendor && (
          <button onClick={openAddForm} className="btn-primary flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Item
          </button>
        )}
      </div>

      {/* Flash message */}
      {message && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium animate-fade-in ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Items',   value: totalItems,    color: 'text-gray-900' },
          { label: 'Available',     value: availableItems,color: 'text-emerald-600' },
          { label: 'Out of Stock',  value: outOfStock,    color: 'text-red-600' },
          { label: 'Catalogue Value', value: `₹${totalValue.toLocaleString('en-IN')}`, color: 'text-brand-600' },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-display font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(c => (
          <button key={c.value} onClick={() => setCategoryFilter(c.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              categoryFilter === c.value
                ? 'bg-brand-500 text-white'
                : 'bg-white text-surface-500 border border-surface-200 hover:bg-surface-50'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Items grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card p-4 h-48 animate-pulse bg-surface-100"/>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-surface-300 mb-4">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          <p className="text-gray-900 font-semibold">No items found</p>
          <p className="text-sm text-surface-400 mt-1">
            {isVendor ? 'Add your first item to get started.' : 'No vendor inventory available yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map(item => (
            <div key={item.id} className="card p-4 flex flex-col gap-3 hover:shadow-card-hover transition-shadow">
              {/* Category + status row */}
              <div className="flex items-center justify-between">
                <CategoryBadge category={item.category} />
                <StatusBadge status={item.status} />
              </div>

              {/* Name & description */}
              <div>
                <p className="text-sm font-semibold text-gray-900 leading-snug">{item.name}</p>
                {item.description && (
                  <p className="text-xs text-surface-400 mt-1 line-clamp-2">{item.description}</p>
                )}
              </div>

              {/* Price & stock */}
              <div className="flex items-end justify-between mt-auto pt-3 border-t border-surface-100">
                <div>
                  <p className="text-lg font-display font-bold text-gray-900">
                    ₹{parseFloat(item.price).toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-surface-400">per {item.unit}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${item.quantity > 10 ? 'text-emerald-600' : item.quantity > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                    {item.quantity} in stock
                  </p>
                  {!isVendor && item.vendor_name && (
                    <p className="text-xs text-surface-400 mt-0.5">{item.vendor_name}</p>
                  )}
                </div>
              </div>

              {/* Vendor actions */}
              {isVendor && (
                <div className="flex gap-2 pt-2 border-t border-surface-100">
                  <button onClick={() => openEditForm(item)}
                    className="flex-1 text-xs text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg font-medium transition-colors">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(item.id)}
                    className="flex-1 text-xs text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg font-medium transition-colors">
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
              <h2 className="text-base font-display font-bold text-gray-900">
                {editItem ? 'Edit Item' : 'Add New Item'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-surface-500 mb-1.5">Item Name *</label>
                <input className="input-field" placeholder="e.g. NCERT Mathematics Grade 5"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>

              {/* Category + Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-500 mb-1.5">Category *</label>
                  <select className="input-field" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} required>
                    {CATEGORIES.filter(c => c.value).map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-500 mb-1.5">Unit</label>
                  <select className="input-field" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                    {['piece', 'set', 'pair', 'box', 'pack', 'kg', 'litre'].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price + Quantity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-500 mb-1.5">Price (₹) *</label>
                  <input className="input-field" type="number" min="0" step="0.01" placeholder="0.00"
                    value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-500 mb-1.5">Quantity</label>
                  <input className="input-field" type="number" min="0" placeholder="0"
                    value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                </div>
              </div>

              {/* Status (edit only) */}
              {editItem && (
                <div>
                  <label className="block text-xs font-semibold text-surface-500 mb-1.5">Status</label>
                  <select className="input-field" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="available">Available</option>
                    <option value="out_of_stock">Out of Stock</option>
                    <option value="discontinued">Discontinued</option>
                  </select>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-surface-500 mb-1.5">Description</label>
                <textarea className="input-field resize-none" rows={3} placeholder="Item description, size details, etc."
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              {message && (
                <p className={`text-xs font-medium ${message.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
                  {message.text}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 rounded-xl border border-surface-200 text-sm font-medium text-surface-500 hover:bg-surface-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary">
                  {saving ? 'Saving...' : editItem ? 'Update Item' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
