'use client';

import { useState, useEffect, useRef } from 'react';
import Modal from '@/components/ui/Modal';

// ─── Push Notification Modal ──────────────────────────────────────────────────

function NotifyModal({ open, onClose, token }: { open: boolean; onClose: () => void; token: string }) {
  const [statusFilter, setStatusFilter] = useState('unpaid');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ notified: number; total: number } | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('Your fee payment is due. Please pay at the earliest to avoid late fees.');

  const handleSend = async () => {
    setSending(true);
    setResult(null);
    setError('');
    try {
      const res = await fetch('/api/fees/notify', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'Failed to send'); return; }
      setResult({ notified: d.notified, total: d.total });
    } catch { setError('Network error'); }
    finally { setSending(false); }
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
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-700 dark:text-emerald-400 font-medium">
            In-app notification sent to {result.notified} parent{result.notified !== 1 ? 's' : ''} ({result.total} invoices found) ✓
          </div>
        )}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
            {error}
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

// ── Fee Receipt ───────────────────────────────────────────────────────────────

function downloadReceipt(inv: any, schoolName: string) {
  const fmt    = (n: any) => `₹${parseFloat(n || 0).toLocaleString('en-IN')}`;
  const due    = parseFloat(inv.amount || 0) - parseFloat(inv.paid_amount || 0);
  const today  = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const dueStr = new Date(inv.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const grade  = inv.grade ? `${inv.grade}${inv.section ? ' - ' + inv.section : ''}` : '—';

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Fee Receipt – ${inv.invoice_no}</title>
<style>
  @media print { body { margin: 0; } }
  body { font-family: Arial, sans-serif; max-width: 400px; margin: 30px auto; padding: 20px; color: #111; }
  .header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 12px; }
  .header h1 { margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 1px; }
  .header h2 { margin: 4px 0 0; font-size: 13px; font-weight: normal; color: #555; }
  .section { border-bottom: 1px dashed #ccc; padding: 10px 0; }
  .row { display: flex; justify-content: space-between; font-size: 13px; margin: 4px 0; }
  .row .label { color: #555; }
  .row .val { font-weight: 600; }
  .total-row { font-size: 15px; font-weight: 700; }
  .due-row .val { color: ${due > 0 ? '#dc2626' : '#16a34a'}; }
  .footer { text-align: center; margin-top: 16px; font-size: 11px; color: #888; }
  .print-btn { display: block; margin: 20px auto; padding: 8px 24px; background: #4f46e5; color: white; border: none; border-radius: 8px; font-size: 13px; cursor: pointer; }
  @media print { .print-btn { display: none; } }
</style></head><body>
<div class="header">
  <h1>${schoolName}</h1>
  <h2>Fee Receipt</h2>
</div>
<div class="section">
  <div class="row"><span class="label">Student</span><span class="val">${inv.student_name || '—'}</span></div>
  <div class="row"><span class="label">Class</span><span class="val">${grade}</span></div>
  <div class="row"><span class="label">Due Date</span><span class="val">${dueStr}</span></div>
</div>
<div class="section">
  <div class="row total-row"><span class="label">Total Amount</span><span class="val">${fmt(inv.amount)}</span></div>
  <div class="row"><span class="label">Amount Paid</span><span class="val" style="color:#16a34a">${fmt(inv.paid_amount)}</span></div>
  <div class="row due-row"><span class="label">Balance Due</span><span class="val">${fmt(due)}</span></div>
</div>
<div class="section" style="border-bottom:none">
  <div class="row"><span class="label">Receipt No.</span><span class="val">${inv.invoice_no}</span></div>
  <div class="row"><span class="label">Status</span><span class="val" style="text-transform:capitalize">${inv.status}</span></div>
  <div class="row"><span class="label">Generated</span><span class="val">${today}</span></div>
</div>
<div class="footer">This is a computer-generated receipt and does not require a signature.</div>
<button class="print-btn" onclick="window.print()">Print Receipt</button>
</body></html>`;

  const win = window.open('', '_blank', 'width=480,height=620');
  if (win) { win.document.write(html); win.document.close(); }
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

function FeesTable({ invoices, loading, summary, filter, setFilter, title, subtitle, isParent, role, token, onRefresh }: {
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
  onRefresh?: () => void;
}) {
  const [showNotify,    setShowNotify]    = useState(false);
  const [showUpload,    setShowUpload]    = useState(false);
  const [uploadFile,    setUploadFile]    = useState<File | null>(null);
  const [uploading,     setUploading]     = useState(false);
  const [uploadResult,  setUploadResult]  = useState<{ created: number; errors: string[]; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');

  const handleDownloadTemplate = () => {
    fetch('/api/fees/upload', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = 'fees-template.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    setUploadResult(null);
    const fd = new FormData();
    fd.append('file', uploadFile);
    const res  = await fetch('/api/fees/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
    const data = await res.json();
    setUploadResult(data);
    setUploading(false);
    if (data.created > 0 && onRefresh) onRefresh();
  };

  const closeUpload = () => {
    setShowUpload(false);
    setUploadFile(null);
    setUploadResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
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
          <div className="flex items-center gap-2">
            <button onClick={() => setShowUpload(true)} className="btn-secondary flex items-center gap-2">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Upload Fees
            </button>
            <button onClick={() => setShowNotify(true)} className="btn-primary flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
              Notify Parents
            </button>
          </div>
        )}
      </div>
      {!isParent && <NotifyModal open={showNotify} onClose={() => setShowNotify(false)} token={token} />}

      {/* Fee Upload Modal */}
      <Modal open={showUpload} onClose={closeUpload} title="Bulk Upload Fee Invoices">
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-surface-50 dark:bg-gray-800 border border-surface-200 dark:border-gray-700 text-xs text-surface-500 dark:text-gray-400 space-y-1">
            <p className="font-semibold text-gray-700 dark:text-gray-300">Required columns:</p>
            <p><span className="font-mono bg-surface-100 dark:bg-gray-700 px-1 rounded">admission_no</span>, <span className="font-mono bg-surface-100 dark:bg-gray-700 px-1 rounded">amount</span>, <span className="font-mono bg-surface-100 dark:bg-gray-700 px-1 rounded">due_date</span> (YYYY-MM-DD)</p>
            <p>Optional: <span className="font-mono bg-surface-100 dark:bg-gray-700 px-1 rounded">installment_no</span>, <span className="font-mono bg-surface-100 dark:bg-gray-700 px-1 rounded">description</span></p>
          </div>
          <button onClick={handleDownloadTemplate} className="w-full flex items-center justify-center gap-2 text-sm text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800 rounded-xl py-2 hover:bg-brand-50 dark:hover:bg-brand-950/30 transition-colors font-medium">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download Excel Template
          </button>
          <form onSubmit={handleUpload} className="space-y-3">
            <div>
              <label className="label">Select File (CSV or XLSX)</label>
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx" className="input-field text-sm"
                onChange={e => setUploadFile(e.target.files?.[0] ?? null)} />
            </div>
            {uploadResult && (
              <div className={`rounded-xl border p-3 text-sm space-y-1 ${uploadResult.errors.length > 0 ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'}`}>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{uploadResult.created} of {uploadResult.total} invoices created</p>
                {uploadResult.errors.map((err, i) => <p key={i} className="text-xs text-amber-700 dark:text-amber-400">{err}</p>)}
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={closeUpload} className="btn-secondary flex-1">Close</button>
              <button type="submit" disabled={!uploadFile || uploading} className="btn-primary flex-1">{uploading ? 'Uploading…' : 'Upload'}</button>
            </div>
          </form>
        </div>
      </Modal>

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
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: isParent ? 7 : 8 }).map((_, j) => (
                      <td key={j}><div className="h-4 bg-surface-100 rounded animate-pulse w-16"/></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={isParent ? 7 : 8} className="text-center py-8 text-surface-400">No invoices found</td></tr>
              ) : filtered.map(inv => (
                <tr key={inv.id}>
                  <td><span className="font-mono text-xs bg-surface-50 px-2 py-1 rounded">{inv.invoice_no}</span></td>
                  {!isParent && <td className="font-medium text-gray-900 dark:text-gray-100">{inv.student_name}</td>}
                  {!isParent && <td>{inv.grade ? `${inv.grade} - ${inv.section}` : '—'}</td>}
                  <td className="font-semibold">{fmt(inv.amount)}</td>
                  <td>{new Date(inv.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td className={parseFloat(inv.paid_amount) > 0 ? 'text-emerald-600 font-medium' : 'text-surface-400'}>{fmt(inv.paid_amount)}</td>
                  <td><StatusBadge status={inv.status} /></td>
                  <td>
                    <div className="flex items-center gap-2">
                      {isParent && (inv.status === 'unpaid' || inv.status === 'overdue') && (
                        <a
                          href={`/dashboard/fees/pay?invoice=${inv.id}`}
                          className="text-xs bg-brand-500 text-white px-3 py-1.5 rounded-lg hover:bg-brand-600 font-medium transition-colors inline-block"
                        >
                          Pay Now
                        </a>
                      )}
                      {(inv.status === 'paid' || inv.status === 'partial') && (
                        <button
                          onClick={() => {
                            const user = JSON.parse(localStorage.getItem('user') || '{}');
                            downloadReceipt(inv, user.schoolName || 'School');
                          }}
                          className="text-xs flex items-center gap-1 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100 font-medium transition-colors"
                          title="Download receipt"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          Receipt
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin: bulk download */}
      {!isParent && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              fetch('/api/fees/export', { headers: { Authorization: `Bearer ${token}` } })
                .then(r => r.blob())
                .then(blob => {
                  const url  = URL.createObjectURL(blob);
                  const a    = document.createElement('a');
                  a.href     = url;
                  a.download = `fees-${new Date().toISOString().slice(0,10)}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                });
            }}
            className="text-xs flex items-center gap-1.5 bg-surface-50 dark:bg-gray-800 border border-surface-200 dark:border-gray-700 text-surface-600 dark:text-gray-400 px-3 py-2 rounded-lg hover:bg-surface-100 dark:hover:bg-gray-700 font-medium transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download CSV
          </button>
        </div>
      )}
    </div>
  );
}

export default function FeesPage() {
  const [invoices,    setInvoices]    = useState<any[]>([]);
  const [summary,     setSummary]     = useState<any>(null);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState('');
  const [role,        setRole]        = useState<string | null>(null);
  const [activeChild, setActiveChild] = useState<any>(null);
  const [refreshKey,  setRefreshKey]  = useState(0);

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

    fetch(`/api/fees?${params}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        setInvoices(d.invoices || []);
        setSummary(d.summary);
        setLoading(false);
      });
  }, [filter, token, role, activeChild, refreshKey]);

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
      onRefresh={() => setRefreshKey(k => k + 1)}
    />
  );
}
