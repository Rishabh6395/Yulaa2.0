'use client';

import { useState, useEffect, useCallback } from 'react';
import { COMPLIANCE_CATEGORIES, type ComplianceCategoryKey } from '@/modules/compliance/compliance.types';

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
  compliant:       { label: 'Compliant',       cls: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',  dot: 'bg-emerald-500' },
  non_compliant:   { label: 'Non-Compliant',   cls: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',                          dot: 'bg-red-500' },
  pending:         { label: 'Pending',         cls: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',              dot: 'bg-amber-500' },
  not_applicable:  { label: 'N/A',             cls: 'bg-surface-100 dark:bg-gray-800 text-surface-500 dark:text-gray-400 border-surface-200 dark:border-gray-700',             dot: 'bg-surface-400' },
};

const STATUSES = ['compliant', 'non_compliant', 'pending', 'not_applicable'] as const;

// ── Helper ────────────────────────────────────────────────────────────────────

function categoryLabel(key: string) {
  return COMPLIANCE_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

// ── Add item modal ────────────────────────────────────────────────────────────

function AddItemModal({ onClose, onSaved, token }: { onClose: () => void; onSaved: () => void; token: string }) {
  const [form, setForm] = useState<{
    category: ComplianceCategoryKey;
    title: string; description: string; status: string; dueDate: string; notes: string;
  }>({
    category: COMPLIANCE_CATEGORIES[0].key,
    title: '',
    description: '',
    status: 'pending',
    dueDate: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setErr('Title is required'); return; }
    setSaving(true);
    setErr('');
    const res = await fetch('/api/compliance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) { onSaved(); onClose(); }
    else { const d = await res.json(); setErr(d.message || 'Failed to save'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 dark:border-gray-800">
          <h2 className="font-display font-bold text-gray-900 dark:text-gray-100">Add Compliance Item</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-gray-800 text-surface-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-surface-500 dark:text-gray-400 mb-1">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as ComplianceCategoryKey }))}
                className="w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-300">
                {COMPLIANCE_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-500 dark:text-gray-400 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-300">
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 dark:text-gray-400 mb-1">Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Fire NOC Certificate"
              className="w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 dark:text-gray-400 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2} placeholder="Optional details…"
              className="w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-surface-500 dark:text-gray-400 mb-1">Due Date</label>
              <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-500 dark:text-gray-400 mb-1">Notes</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Internal notes"
                className="w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-300" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-surface-200 dark:border-gray-700 text-sm font-medium text-surface-600 dark:text-gray-400 hover:bg-surface-50 dark:hover:bg-gray-800">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? 'Saving…' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Inline status editor ──────────────────────────────────────────────────────

function StatusDropdown({ current, itemId, token, onUpdated }: { current: string; itemId: string; token: string; onUpdated: (id: string, status: string) => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const pick = async (status: string) => {
    setOpen(false);
    if (status === current) return;
    setSaving(true);
    await fetch(`/api/compliance/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    setSaving(false);
    onUpdated(itemId, status);
  };

  const cfg = STATUS_CONFIG[current] ?? STATUS_CONFIG.pending;
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} disabled={saving}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold cursor-pointer transition-opacity ${cfg.cls} ${saving ? 'opacity-50' : ''}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}/>
        {cfg.label}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-20 bg-white dark:bg-gray-900 border border-surface-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden min-w-[160px]">
          {STATUSES.map(s => (
            <button key={s} onClick={() => pick(s)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-surface-50 dark:hover:bg-gray-800 text-left ${s === current ? 'bg-surface-50 dark:bg-gray-800' : ''}`}>
              <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s].dot}`}/>
              {STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CompliancePage() {
  const [items, setItems]           = useState<any[]>([]);
  const [summary, setSummary]       = useState<any>(null);
  const [activeCategory, setActive] = useState<string>('all');
  const [loading, setLoading]       = useState(true);
  const [showAdd, setShowAdd]       = useState(false);
  const [seeding, setSeeding]       = useState(false);
  const [search, setSearch]         = useState('');
  const [token, setToken]           = useState('');

  useEffect(() => { setToken(localStorage.getItem('token') ?? ''); }, []);

  const fetchItems = useCallback(async (cat: string) => {
    if (!token) return;
    setLoading(true);
    const url = cat === 'all' ? '/api/compliance' : `/api/compliance?category=${cat}`;
    const [itemsRes, summaryRes] = await Promise.all([
      fetch(url,                            { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }),
      fetch('/api/compliance?dashboard=1',  { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }),
    ]);
    const [itemsData, summaryData] = await Promise.all([itemsRes.json(), summaryRes.json()]);
    setItems(Array.isArray(itemsData) ? itemsData : []);
    setSummary(summaryData);
    setLoading(false);
  }, [token]);

  useEffect(() => { if (token) fetchItems(activeCategory); }, [token, activeCategory, fetchItems]);

  const handleStatusUpdate = (id: string, status: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i));
  };

  const handleSeedDefaults = async () => {
    setSeeding(true);
    await fetch('/api/compliance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'seed_defaults' }),
    });
    setSeeding(false);
    fetchItems(activeCategory);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this compliance item?')) return;
    await fetch(`/api/compliance/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setItems(prev => prev.filter(i => i.id !== id));
  };

  // Summary counts
  const counts = {
    compliant:      (summary?.byStatus ?? []).find((x: any) => x.status === 'compliant')?._count ?? 0,
    non_compliant:  (summary?.byStatus ?? []).find((x: any) => x.status === 'non_compliant')?._count ?? 0,
    pending:        (summary?.byStatus ?? []).find((x: any) => x.status === 'pending')?._count ?? 0,
    not_applicable: (summary?.byStatus ?? []).find((x: any) => x.status === 'not_applicable')?._count ?? 0,
  };
  const total = counts.compliant + counts.non_compliant + counts.pending + counts.not_applicable;
  const score = total > 0 ? Math.round(((counts.compliant + counts.not_applicable) / total) * 100) : 0;

  const filtered = items.filter(i => !search || i.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Compliance</h1>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">Track and manage all school compliance requirements.</p>
        </div>
        <div className="flex items-center gap-2">
          {items.length === 0 && !loading && (
            <button onClick={handleSeedDefaults} disabled={seeding}
              className="px-4 py-2 rounded-xl border border-brand-200 dark:border-brand-800 text-brand-600 dark:text-brand-400 text-sm font-medium hover:bg-brand-50 dark:hover:bg-brand-950/40 disabled:opacity-60">
              {seeding ? 'Loading defaults…' : 'Load Default Checklist'}
            </button>
          )}
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold shadow-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Add Item
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { key: 'compliant',      icon: '✓', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
          { key: 'non_compliant',  icon: '✗', color: 'text-red-600 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-950/40' },
          { key: 'pending',        icon: '◷', color: 'text-amber-600 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-950/40' },
          { key: 'not_applicable', icon: '—', color: 'text-surface-500 dark:text-gray-400',    bg: 'bg-surface-100 dark:bg-gray-800' },
        ].map(({ key, icon, color, bg }) => (
          <div key={key} className="card p-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center text-lg font-bold ${color}`}>{icon}</div>
              <div>
                <p className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">{counts[key as keyof typeof counts]}</p>
                <p className="text-xs text-surface-400 dark:text-gray-500">{STATUS_CONFIG[key].label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Compliance score bar */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Overall Compliance Score</span>
          <span className={`text-xl font-display font-bold ${score >= 80 ? 'text-emerald-600 dark:text-emerald-400' : score >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>{score}%</span>
        </div>
        <div className="h-3 bg-surface-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${score}%` }} />
        </div>
        <p className="text-xs text-surface-400 dark:text-gray-500 mt-2">{counts.compliant + counts.not_applicable} of {total} items addressed</p>
      </div>

      {/* Category tabs + search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 flex-1">
          {[{ key: 'all', label: 'All' }, ...COMPLIANCE_CATEGORIES].map(c => (
            <button key={c.key} onClick={() => setActive(c.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeCategory === c.key
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-surface-100 dark:bg-gray-800 text-surface-500 dark:text-gray-400 hover:bg-surface-200 dark:hover:bg-gray-700'
              }`}>
              {c.label}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items…"
          className="w-full sm:w-56 px-3 py-2 rounded-xl border border-surface-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-300" />
      </div>

      {/* Items table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-surface-400 dark:text-gray-500 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-surface-100 dark:bg-gray-800 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-400 dark:text-gray-500">
                <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">No compliance items yet</p>
            <p className="text-xs text-surface-400 dark:text-gray-500">Click "Load Default Checklist" to get started with a pre-built list.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-50 dark:bg-gray-800/60 border-b border-surface-100 dark:border-gray-800">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 dark:text-gray-400 uppercase tracking-wider">Item</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">Due Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">Notes</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 w-10"/>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-gray-800">
              {filtered.map(item => (
                <tr key={item.id} className="hover:bg-surface-50 dark:hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{item.title}</p>
                    {item.description && <p className="text-xs text-surface-400 dark:text-gray-500 mt-0.5 line-clamp-1">{item.description}</p>}
                    <span className="md:hidden text-xs text-surface-400 dark:text-gray-500">{categoryLabel(item.category)}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="px-2 py-0.5 rounded-md bg-surface-100 dark:bg-gray-800 text-xs font-medium text-surface-600 dark:text-gray-400">
                      {categoryLabel(item.category)}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-surface-500 dark:text-gray-400">
                    {item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-surface-500 dark:text-gray-400 max-w-[180px]">
                    <span className="line-clamp-1">{item.notes || '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusDropdown current={item.status} itemId={item.id} token={token} onUpdated={handleStatusUpdate} />
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && <AddItemModal token={token} onClose={() => setShowAdd(false)} onSaved={() => fetchItems(activeCategory)} />}
    </div>
  );
}
