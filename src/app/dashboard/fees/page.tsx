'use client';

import { useState, useEffect } from 'react';

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

function FeesTable({ invoices, loading, summary, filter, setFilter, title, subtitle }: {
  invoices: any[];
  loading: boolean;
  summary: any;
  filter: string;
  setFilter: (f: string) => void;
  title: string;
  subtitle: string;
}) {
  const fmt = (n: any) => `₹${parseFloat(n || 0).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-surface-400 mt-0.5">{subtitle}</p>
      </div>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-5">
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Total Invoiced</p>
            <p className="text-2xl font-display font-bold text-gray-900 mt-1">{fmt(summary.total)}</p>
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
      )}

      <div className="flex gap-2 flex-wrap">
        {['', 'unpaid', 'overdue', 'partial', 'paid'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === f ? 'bg-brand-500 text-white' : 'bg-white text-surface-500 border border-surface-200 hover:bg-surface-50'
            }`}
          >
            {f ? f.charAt(0).toUpperCase() + f.slice(1) : 'All'}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Student</th>
                <th>Class</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Paid</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j}><div className="h-4 bg-surface-100 rounded animate-pulse w-16"/></td>
                    ))}
                  </tr>
                ))
              ) : invoices.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-surface-400">No invoices found</td></tr>
              ) : invoices.map(inv => (
                <tr key={inv.id}>
                  <td><span className="font-mono text-xs bg-surface-50 px-2 py-1 rounded">{inv.invoice_no}</span></td>
                  <td className="font-medium text-gray-900">{inv.student_name}</td>
                  <td>{inv.grade ? `${inv.grade} - ${inv.section}` : '—'}</td>
                  <td className="font-semibold">{fmt(inv.amount)}</td>
                  <td>{new Date(inv.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td className={parseFloat(inv.paid_amount) > 0 ? 'text-emerald-600 font-medium' : 'text-surface-400'}>{fmt(inv.paid_amount)}</td>
                  <td><StatusBadge status={inv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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

  // Determine role & active child on mount
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

  // React to child switch events
  useEffect(() => {
    const handler = (e: Event) => setActiveChild((e as CustomEvent).detail);
    window.addEventListener('activeChildChanged', handler);
    return () => window.removeEventListener('activeChildChanged', handler);
  }, []);

  // Fetch invoices whenever filter, role, or activeChild changes
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
        <p className="text-gray-900 font-semibold">No child selected</p>
        <p className="text-sm text-surface-400">Select a child from the top bar to view fees.</p>
      </div>
    );
  }

  const childName = activeChild ? `${activeChild.first_name} ${activeChild.last_name}` : '';

  return (
    <FeesTable
      invoices={invoices}
      summary={summary}
      loading={loading}
      filter={filter}
      setFilter={setFilter}
      title={role === 'parent' ? `${childName}'s Fees` : 'Fee Management'}
      subtitle={role === 'parent' ? `Fee invoices for ${childName}` : 'Track invoices and payments'}
    />
  );
}
