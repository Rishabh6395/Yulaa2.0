'use client';

import { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/ui/Modal';

const CATEGORIES = [
  { value: 'furniture',    label: 'Furniture' },
  { value: 'electronics',  label: 'Electronics' },
  { value: 'stationery',   label: 'Stationery' },
  { value: 'sports',       label: 'Sports' },
  { value: 'lab',          label: 'Lab Equipment' },
  { value: 'cleaning',     label: 'Cleaning' },
  { value: 'books',        label: 'Books' },
  { value: 'other',        label: 'Other' },
];

const CAT_CFG: Record<string, { icon: string; bg: string; text: string }> = {
  furniture:   { icon: '🪑', bg: 'bg-amber-100',   text: 'text-amber-700' },
  electronics: { icon: '💻', bg: 'bg-blue-100',    text: 'text-blue-700' },
  stationery:  { icon: '✏️', bg: 'bg-yellow-100',  text: 'text-yellow-700' },
  sports:      { icon: '⚽', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  lab:         { icon: '🔬', bg: 'bg-purple-100',  text: 'text-purple-700' },
  cleaning:    { icon: '🧹', bg: 'bg-teal-100',    text: 'text-teal-700' },
  books:       { icon: '📚', bg: 'bg-orange-100',  text: 'text-orange-700' },
  other:       { icon: '📦', bg: 'bg-surface-100', text: 'text-surface-600' },
};

const EMPTY_ITEM = { name: '', category: 'furniture', unit: 'piece', minStock: '0', description: '' };
const EMPTY_PURCHASE = { vendorName: '', quantity: '', unitPrice: '', purchaseDate: '', invoiceNo: '' };
const EMPTY_ISSUE = { issuedTo: '', issuedToName: '', quantity: '', purpose: '', expectedReturn: '' };

export default function SchoolInventoryPage() {
  const [items,      setItems]      = useState<any[]>([]);
  const [activeItem, setActiveItem] = useState<any | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [catFilter,  setCatFilter]  = useState('');
  const [tab,        setTab]        = useState<'stock' | 'issues' | 'purchases'>('stock');
  const [showItem,   setShowItem]   = useState(false);
  const [showPurch,  setShowPurch]  = useState(false);
  const [showIssue,  setShowIssue]  = useState(false);
  const [itemForm,   setItemForm]   = useState(EMPTY_ITEM);
  const [purchForm,  setPurchForm]  = useState(EMPTY_PURCHASE);
  const [issueForm,  setIssueForm]  = useState(EMPTY_ISSUE);
  const [saving,     setSaving]     = useState(false);
  const [msg,        setMsg]        = useState<{ type: string; text: string } | null>(null);
  const [role,       setRole]       = useState('');
  const [lowCount,   setLowCount]   = useState(0);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const isAdmin = ['school_admin', 'super_admin', 'principal'].includes(role);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = catFilter ? `?category=${catFilter}` : '';
      const res = await fetch(`/api/school-inventory${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      setItems(d.items || []);
      setLowCount(d.lowStockCount || 0);
    } finally { setLoading(false); }
  }, [token, catFilter]);

  const openItem = useCallback(async (id: string) => {
    const res = await fetch(`/api/school-inventory?itemId=${id}`, { headers: { Authorization: `Bearer ${token}` } });
    const d = await res.json();
    setActiveItem(d.item || null);
  }, [token]);

  useEffect(() => {
    const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
    setRole(user.primaryRole || '');
    fetchItems();
  }, [fetchItems]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMsg(null);
    try {
      const res = await fetch('/api/school-inventory', { method: 'POST', headers, body: JSON.stringify({ ...itemForm, minStock: Number(itemForm.minStock) }) });
      const d = await res.json();
      if (!res.ok) { setMsg({ type: 'error', text: d.error || 'Failed' }); return; }
      setMsg({ type: 'success', text: 'Item added!' });
      setShowItem(false); setItemForm(EMPTY_ITEM);
      fetchItems();
    } finally { setSaving(false); }
  };

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return;
    setSaving(true); setMsg(null);
    try {
      const res = await fetch('/api/school-inventory', {
        method: 'POST', headers,
        body: JSON.stringify({ action: 'purchase', itemId: activeItem.id, ...purchForm }),
      });
      const d = await res.json();
      if (!res.ok) { setMsg({ type: 'error', text: d.error || 'Failed' }); return; }
      setMsg({ type: 'success', text: 'Purchase recorded!' });
      setShowPurch(false); setPurchForm(EMPTY_PURCHASE);
      openItem(activeItem.id); fetchItems();
    } finally { setSaving(false); }
  };

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return;
    setSaving(true); setMsg(null);
    try {
      const res = await fetch('/api/school-inventory', {
        method: 'POST', headers,
        body: JSON.stringify({ action: 'issue', itemId: activeItem.id, ...issueForm }),
      });
      const d = await res.json();
      if (!res.ok) { setMsg({ type: 'error', text: d.error || 'Failed' }); return; }
      setMsg({ type: 'success', text: 'Item issued!' });
      setShowIssue(false); setIssueForm(EMPTY_ISSUE);
      openItem(activeItem.id); fetchItems();
    } finally { setSaving(false); }
  };

  const handleReturn = async (issueId: string) => {
    await fetch('/api/school-inventory', { method: 'POST', headers, body: JSON.stringify({ action: 'return', issueId }) });
    if (activeItem) openItem(activeItem.id);
    fetchItems();
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    await fetch('/api/school-inventory', { method: 'DELETE', headers, body: JSON.stringify({ itemId: id }) });
    if (activeItem?.id === id) setActiveItem(null);
    fetchItems();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">School Inventory</h1>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">
            Manage school assets, purchases and issues
            {lowCount > 0 && <span className="ml-2 text-amber-600 dark:text-amber-400 font-semibold">· {lowCount} low stock</span>}
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => { setMsg(null); setShowItem(true); }} className="btn-primary flex items-center gap-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Item
          </button>
        )}
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setCatFilter('')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!catFilter ? 'bg-brand-500 text-white' : 'bg-surface-50 dark:bg-gray-800/40 text-surface-600 dark:text-gray-400 hover:bg-surface-100'}`}>
          All
        </button>
        {CATEGORIES.map(c => (
          <button key={c.value} onClick={() => setCatFilter(c.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${catFilter === c.value ? 'bg-brand-500 text-white' : 'bg-surface-50 dark:bg-gray-800/40 text-surface-600 dark:text-gray-400 hover:bg-surface-100'}`}>
            {CAT_CFG[c.value]?.icon} {c.label}
          </button>
        ))}
      </div>

      {msg && (
        <div className={`px-4 py-2 rounded-xl text-sm font-medium ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'}`}>
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Item list */}
        <div className="lg:col-span-1 space-y-2">
          {loading ? (
            [1,2,3,4].map(i => <div key={i} className="h-16 rounded-2xl bg-surface-50 dark:bg-gray-800/40 animate-pulse" />)
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-surface-400 dark:text-gray-500">
              <div className="text-4xl mb-3">📦</div>
              <p className="text-sm">No items found.</p>
            </div>
          ) : items.map(it => {
            const cfg = CAT_CFG[it.category] || CAT_CFG.other;
            const qty = it.stock?.quantity ?? 0;
            const isLow = qty <= it.minStock;
            return (
              <div key={it.id}
                onClick={() => { openItem(it.id); setTab('stock'); }}
                className={`card p-3 cursor-pointer transition-all hover:shadow-md ${activeItem?.id === it.id ? 'ring-2 ring-brand-400' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${cfg.bg}`}>{cfg.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{it.name}</p>
                    <p className="text-xs text-surface-400 dark:text-gray-500">{it.unit}</p>
                  </div>
                  <div className={`text-right flex-shrink-0 ${isLow ? 'text-amber-600 dark:text-amber-400' : 'text-surface-400 dark:text-gray-500'}`}>
                    <p className="text-sm font-bold">{qty}</p>
                    <p className="text-xs">{isLow ? '⚠️ low' : 'in stock'}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Item detail */}
        <div className="lg:col-span-2">
          {!activeItem ? (
            <div className="card p-12 text-center text-surface-400 dark:text-gray-500">
              <div className="text-5xl mb-4">📦</div>
              <p className="text-sm">Select an item to view details</p>
            </div>
          ) : (
            <div className="card p-6 space-y-5">
              {/* Item header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${(CAT_CFG[activeItem.category] || CAT_CFG.other).bg}`}>
                    {(CAT_CFG[activeItem.category] || CAT_CFG.other).icon}
                  </div>
                  <div>
                    <h2 className="text-xl font-display font-bold">{activeItem.name}</h2>
                    <p className="text-sm text-surface-400 dark:text-gray-500 capitalize">{activeItem.category} · {activeItem.unit}</p>
                    {activeItem.description && <p className="text-xs text-surface-400 dark:text-gray-500 mt-0.5">{activeItem.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${(activeItem.stock?.quantity ?? 0) <= activeItem.minStock ? 'text-amber-600 dark:text-amber-400' : 'text-brand-600 dark:text-brand-400'}`}>
                      {activeItem.stock?.quantity ?? 0}
                    </p>
                    <p className="text-xs text-surface-400 dark:text-gray-500">in stock</p>
                  </div>
                  {isAdmin && (
                    <button onClick={() => deleteItem(activeItem.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              {isAdmin && (
                <div className="flex gap-2">
                  <button onClick={() => setShowPurch(true)} className="btn-secondary text-xs py-1.5 px-3 flex-1">
                    📥 Record Purchase
                  </button>
                  <button onClick={() => setShowIssue(true)} className="btn-secondary text-xs py-1.5 px-3 flex-1">
                    📤 Issue Item
                  </button>
                </div>
              )}

              {/* Tabs */}
              <div className="flex gap-1 bg-surface-50 dark:bg-gray-800/40 rounded-xl p-1">
                {(['stock', 'issues', 'purchases'] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors capitalize ${
                      tab === t ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100' : 'text-surface-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}>
                    {t}
                  </button>
                ))}
              </div>

              {tab === 'stock' && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-surface-50 dark:border-gray-800">
                    <span className="text-surface-400 dark:text-gray-500">Current Stock</span>
                    <span className="font-semibold">{activeItem.stock?.quantity ?? 0} {activeItem.unit}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-surface-50 dark:border-gray-800">
                    <span className="text-surface-400 dark:text-gray-500">Minimum Stock</span>
                    <span className="font-semibold">{activeItem.minStock} {activeItem.unit}</span>
                  </div>
                  {activeItem.stock?.location && (
                    <div className="flex justify-between py-2">
                      <span className="text-surface-400 dark:text-gray-500">Location</span>
                      <span className="font-semibold">{activeItem.stock.location}</span>
                    </div>
                  )}
                </div>
              )}

              {tab === 'issues' && (
                <div>
                  {activeItem.issues?.length === 0 ? (
                    <p className="text-xs text-surface-400 dark:text-gray-500 text-center py-6">No issues recorded.</p>
                  ) : (
                    <div className="space-y-2">
                      {activeItem.issues?.map((iss: any) => (
                        <div key={iss.id} className="flex items-center gap-3 p-3 bg-surface-50 dark:bg-gray-800/40 rounded-xl">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{iss.issuedToName || iss.issuedTo}</p>
                            <p className="text-xs text-surface-400 dark:text-gray-500">
                              {iss.quantity} {activeItem.unit} · {new Date(iss.issuedDate).toLocaleDateString('en-IN')}
                              {iss.purpose ? ` · ${iss.purpose}` : ''}
                            </p>
                          </div>
                          {iss.status === 'issued' ? (
                            <button onClick={() => handleReturn(iss.id)} className="btn-secondary text-xs py-1 px-2">Return</button>
                          ) : (
                            <span className="badge-success text-xs">Returned</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === 'purchases' && (
                <div>
                  {activeItem.purchases?.length === 0 ? (
                    <p className="text-xs text-surface-400 dark:text-gray-500 text-center py-6">No purchases recorded.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-surface-400 dark:text-gray-500 text-left border-b border-surface-100 dark:border-gray-700">
                            <th className="pb-2 font-medium">Vendor</th>
                            <th className="pb-2 font-medium">Qty</th>
                            <th className="pb-2 font-medium">Unit Price</th>
                            <th className="pb-2 font-medium">Total</th>
                            <th className="pb-2 font-medium">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-50 dark:divide-gray-800">
                          {activeItem.purchases?.map((p: any) => (
                            <tr key={p.id}>
                              <td className="py-2">{p.vendorName || '—'}</td>
                              <td className="py-2">{p.quantity}</td>
                              <td className="py-2">₹{Number(p.unitPrice).toFixed(2)}</td>
                              <td className="py-2 font-medium">₹{Number(p.totalAmount).toFixed(2)}</td>
                              <td className="py-2">{new Date(p.purchaseDate).toLocaleDateString('en-IN')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Item Modal */}
      <Modal open={showItem} onClose={() => setShowItem(false)} title="Add Inventory Item">
        <form onSubmit={handleCreateItem} className="space-y-4">
          <div>
            <label className="label">Item Name *</label>
            <input className="input-field" required value={itemForm.name} onChange={e => setItemForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Whiteboard Marker" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Category *</label>
              <select className="input-field" value={itemForm.category} onChange={e => setItemForm(f => ({...f, category: e.target.value}))}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Unit</label>
              <input className="input-field" value={itemForm.unit} onChange={e => setItemForm(f => ({...f, unit: e.target.value}))} placeholder="piece / kg / box" />
            </div>
          </div>
          <div>
            <label className="label">Minimum Stock Alert</label>
            <input type="number" className="input-field" value={itemForm.minStock} onChange={e => setItemForm(f => ({...f, minStock: e.target.value}))} min="0" />
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input-field" value={itemForm.description} onChange={e => setItemForm(f => ({...f, description: e.target.value}))} placeholder="Optional notes" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowItem(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Adding...' : 'Add Item'}</button>
          </div>
        </form>
      </Modal>

      {/* Record Purchase Modal */}
      <Modal open={showPurch} onClose={() => setShowPurch(false)} title={`Record Purchase — ${activeItem?.name}`}>
        <form onSubmit={handlePurchase} className="space-y-4">
          <div>
            <label className="label">Vendor Name</label>
            <input className="input-field" value={purchForm.vendorName} onChange={e => setPurchForm(f => ({...f, vendorName: e.target.value}))} placeholder="Vendor / Supplier name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Quantity *</label>
              <input type="number" className="input-field" required value={purchForm.quantity} onChange={e => setPurchForm(f => ({...f, quantity: e.target.value}))} min="1" />
            </div>
            <div>
              <label className="label">Unit Price (₹) *</label>
              <input type="number" step="0.01" className="input-field" required value={purchForm.unitPrice} onChange={e => setPurchForm(f => ({...f, unitPrice: e.target.value}))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Purchase Date</label>
              <input type="date" className="input-field" value={purchForm.purchaseDate} onChange={e => setPurchForm(f => ({...f, purchaseDate: e.target.value}))} />
            </div>
            <div>
              <label className="label">Invoice No.</label>
              <input className="input-field" value={purchForm.invoiceNo} onChange={e => setPurchForm(f => ({...f, invoiceNo: e.target.value}))} placeholder="Optional" />
            </div>
          </div>
          {purchForm.quantity && purchForm.unitPrice && (
            <p className="text-sm font-medium text-surface-600 dark:text-gray-400">
              Total: ₹{(Number(purchForm.quantity) * Number(purchForm.unitPrice)).toFixed(2)}
            </p>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowPurch(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Record Purchase'}</button>
          </div>
        </form>
      </Modal>

      {/* Issue Item Modal */}
      <Modal open={showIssue} onClose={() => setShowIssue(false)} title={`Issue Item — ${activeItem?.name} (${activeItem?.stock?.quantity ?? 0} available)`}>
        <form onSubmit={handleIssue} className="space-y-4">
          <div>
            <label className="label">Issued To (ID / Roll No.) *</label>
            <input className="input-field" required value={issueForm.issuedTo} onChange={e => setIssueForm(f => ({...f, issuedTo: e.target.value}))} placeholder="Teacher ID or student roll no." />
          </div>
          <div>
            <label className="label">Name</label>
            <input className="input-field" value={issueForm.issuedToName} onChange={e => setIssueForm(f => ({...f, issuedToName: e.target.value}))} placeholder="Name of recipient" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Quantity *</label>
              <input type="number" className="input-field" required value={issueForm.quantity} onChange={e => setIssueForm(f => ({...f, quantity: e.target.value}))} min="1" max={activeItem?.stock?.quantity ?? 999} />
            </div>
            <div>
              <label className="label">Expected Return</label>
              <input type="date" className="input-field" value={issueForm.expectedReturn} onChange={e => setIssueForm(f => ({...f, expectedReturn: e.target.value}))} />
            </div>
          </div>
          <div>
            <label className="label">Purpose</label>
            <input className="input-field" value={issueForm.purpose} onChange={e => setIssueForm(f => ({...f, purpose: e.target.value}))} placeholder="e.g. Class use, Lab experiment" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowIssue(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Issuing...' : 'Issue Item'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
