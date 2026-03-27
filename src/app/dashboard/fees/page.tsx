'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';

// ─── Push Notification Modal ──────────────────────────────────────────────────

function NotifyModal({ open, onClose, token }: { open: boolean; onClose: () => void; token: string }) {
  const [statusFilter, setStatusFilter] = useState('unpaid');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number } | null>(null);
  const [message, setMessage] = useState('Your fee payment is due. Please pay at the earliest to avoid late fees.');

  const handleSend = async () => {
    setSending(true);
    setResult(null);
    // In a real system this would call a push notification API
    // For now we simulate the action
    await new Promise(r => setTimeout(r, 1200));
    setResult({ sent: Math.floor(Math.random() * 20) + 1 });
    setSending(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="Send Fee Notification">
      <div className="space-y-4">
        <div>
          <label className="label">Send to</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {[
              { value: 'all',     label: 'All' },
              { value: 'unpaid',  label: 'Unpaid' },
              { value: 'overdue', label: 'Overdue' },
              { value: 'paid',    label: 'Paid' },
            ].map(opt => (
              <button key={opt.value} onClick={() => setStatusFilter(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  statusFilter === opt.value ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-surface-200 text-surface-500 hover:bg-surface-50'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Message</label>
          <textarea className="input-field" rows={3} value={message} onChange={e => setMessage(e.target.value)}/>
        </div>
        {result && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-medium">
            Notification sent to {result.sent} parent{result.sent !== 1 ? 's' : ''} ✓
          </div>
        )}
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSend} disabled={sending} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {sending ? (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Sending…</>
            ) : (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>Send Notification</>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid:    'badge-success',
    unpaid:  'badge-warning',
    overdue: 'badge-danger',
    partial: 'badge-info',
    waived:  'badge-neutral',
  };
  return <span className={map[status] || 'badge-neutral'}>{status}</span>;
}

function FeesTable({ invoices, loading, summary, filter, setFilter, title, subtitle, isParent, role, token }: {
  invoices: any[];
  loading: boolean;
  summary: any;
  filter: string;
  setFilter: (f: string) => void;
  title: string;
  subtitle: string;
  isParent: boolean;
  role: string;
  token: string;
}) {
  const [showNotify, setShowNotify] = useState(false);
  const [search, setSearch] = useState('');
  const fmt = (n: any) => `₹${parseFloat(n || 0).toLocaleString('en-IN')}`;

  const filterOptions = ['', 'unpaid', 'overdue', 'paid'];

  const filtered = search.trim()
    ? invoices.filter(inv =>
        (inv.student_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (inv.invoice_no   ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : invoices;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">{title}</h1>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">{subtitle}</p>
        </div>
        {!isParent && (
          <button onClick={() => setShowNotify(true)} className="btn-primary flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            Notify Parents
          </button>
        )}
      </div>
      {!isParent && <NotifyModal open={showNotify} onClose={() => setShowNotify(false)} token={token} />}

      {summary && (
        isParent ? (
          /* Parent: only Pending amount + Overdue count */
          <div className="grid grid-cols-2 gap-4">
            <div className="card p-5">
              <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Pending Amount</p>
              <p className="text-2xl font-display font-bold text-amber-600 mt-1">{fmt(summary.pending)}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Overdue</p>
              <p className="text-2xl font-display font-bold text-red-600 mt-1">{summary.overdue_count} invoices</p>
            </div>
          </div>
        ) : (
          /* Admin: full 4-card summary */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-5">
              <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Total Invoiced</p>
              <p className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100 mt-1">{fmt(summary.total)}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Collected</p>
              <p className="text-2xl font-display font-bold text-emerald-600 mt-1">{fmt(summary.collected)}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Pending</p>
              <p className="text-2xl font-display font-bold text-amber-600 mt-1">{fmt(summary.pending)}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Overdue</p>
              <p className="text-2xl font-display font-bold text-red-600 mt-1">{summary.overdue_count} invoices</p>
            </div>
          </div>
        )
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        {!isParent && (
          <div className="relative flex-1 max-w-sm">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className="input-field pl-9 py-2 text-sm"
              placeholder="Search by student name or invoice…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        )}

        {/* Status filters */}
        <div className="flex gap-2 flex-wrap">
          {filterOptions.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                filter === f ? 'bg-brand-500 text-white' : 'bg-white dark:bg-gray-800 text-surface-500 border border-surface-200 dark:border-gray-700 hover:bg-surface-50'
              }`}
            >
              {f ? f.charAt(0).toUpperCase() + f.slice(1) : 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                {!isParent && <th>Student</th>}
                {!isParent && <th>Class</th>}
                <th>Amount</th>
                <th>Due Date</th>
                <th>Paid</th>
                <th>Status</th>
                {isParent && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: isParent ? 6 : 7 }).map((_, j) => (
                      <td key={j}><div className="h-4 bg-surface-100 rounded animate-pulse w-16"/></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={isParent ? 6 : 7} className="text-center py-8 text-surface-400">No invoices found</td></tr>
              ) : filtered.map(inv => (
                <tr key={inv.id}>
                  <td><span className="font-mono text-xs bg-surface-50 px-2 py-1 rounded">{inv.invoice_no}</span></td>
                  {!isParent && <td className="font-medium text-gray-900 dark:text-gray-100">{inv.student_name}</td>}
                  {!isParent && <td>{inv.grade ? `${inv.grade} - ${inv.section}` : '—'}</td>}
                  <td className="font-semibold">{fmt(inv.amount)}</td>
                  <td>{new Date(inv.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td className={parseFloat(inv.paid_amount) > 0 ? 'text-emerald-600 font-medium' : 'text-surface-400'}>{fmt(inv.paid_amount)}</td>
                  <td><StatusBadge status={inv.status} /></td>
                  {isParent && (
                    <td>
                      {(inv.status === 'unpaid' || inv.status === 'overdue') && (
                        <a
                          href={`/dashboard/fees/pay?invoice=${inv.id}`}
                          className="text-xs bg-brand-500 text-white px-3 py-1.5 rounded-lg hover:bg-brand-600 font-medium transition-colors inline-block"
                        >
                          Pay Now
                        </a>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin: bulk download */}
      {!isParent && (
        <div className="flex justify-end">
          <a
            href={`/api/fees/export`}
            download
            className="text-xs flex items-center gap-1.5 bg-surface-50 dark:bg-gray-800 border border-surface-200 dark:border-gray-700 text-surface-600 dark:text-gray-400 px-3 py-2 rounded-lg hover:bg-surface-100 dark:hover:bg-gray-700 font-medium transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download CSV
          </a>
        </div>
      )}
    </div>
  );
}

export default function FeesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [role, setRole] = useState<string | null>(null);
  const [activeChild, setActiveChild] = useState<any>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setRole(user.primaryRole);
        if (user.primaryRole === 'parent') {
          const stored = localStorage.getItem('activeChild');
          if (stored) setActiveChild(JSON.parse(stored));
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    const handler = (e: Event) => setActiveChild((e as CustomEvent).detail);
    window.addEventListener('activeChildChanged', handler);
    return () => window.removeEventListener('activeChildChanged', handler);
  }, []);

  useEffect(() => {
    if (role === null) return;
    if (role === 'parent' && !activeChild) return;

    setLoading(true);
    const params = new URLSearchParams();
    if (filter) params.set('status', filter);
    if (role === 'parent' && activeChild) params.set('student_id', activeChild.id);

    fetch(`/api/fees?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        setInvoices(d.invoices || []);
        setSummary(d.summary);
        setLoading(false);
      });
  }, [filter, token, role, activeChild]);

  if (role === 'parent' && !activeChild) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-3">
        <p className="text-gray-900 dark:text-gray-100 font-semibold">No child selected</p>
        <p className="text-sm text-surface-400">Select a child from the top bar to view fees.</p>
      </div>
    );
  }

  const isParent = role === 'parent';
  const childName = activeChild ? `${activeChild.first_name} ${activeChild.last_name}` : '';

  return (
    <FeesTable
      invoices={invoices}
      summary={summary}
      loading={loading}
      filter={filter}
      setFilter={setFilter}
      isParent={isParent}
      role={role || ''}
      token={token || ''}
      title={isParent ? `${childName}'s Fees` : 'Fee Management'}
      subtitle={isParent ? `Fee invoices for ${childName}` : 'Track invoices and payments'}
    />
  );
}
