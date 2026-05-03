'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Modal from '@/components/ui/Modal';
import PageError from '@/components/ui/PageError';

// ─── Fee Type Master Modal ────────────────────────────────────────────────────

function FeeTypeMasterModal({ open, onClose, token }: { open: boolean; onClose: () => void; token: string }) {
  const [structures, setStructures] = useState<any[]>([]);
  const [classes,    setClasses]    = useState<any[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [form,       setForm]       = useState({ id: '', name: '', amount: '', frequency: 'monthly', classId: '' });
  const [saving,     setSaving]     = useState(false);
  const [msg,        setMsg]        = useState('');

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sr, cr] = await Promise.all([
        fetch('/api/fees?action=structures', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch('/api/classes', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      ]);
      setStructures(sr.structures || []);
      setClasses(cr.classes || []);
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const FREQ_OPTS = [
    { v: 'one_time', l: 'One Time' }, { v: 'monthly', l: 'Monthly' },
    { v: 'quarterly', l: 'Quarterly' }, { v: 'annually', l: 'Annually' },
  ];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.amount) { setMsg('Name and amount are required'); return; }
    setSaving(true); setMsg('');
    try {
      const res = await fetch('/api/fees', {
        method: 'POST', headers,
        body: JSON.stringify({ action: 'upsert_structure', ...form, amount: parseFloat(form.amount) }),
      });
      const d = await res.json();
      if (!res.ok) { setMsg(d.error || 'Failed to save'); return; }
      setForm({ id: '', name: '', amount: '', frequency: 'monthly', classId: '' });
      load();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this fee type?')) return;
    await fetch(`/api/fees?structureId=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    load();
  };

  const fmt = (n: any) => `₹${parseFloat(n || 0).toLocaleString('en-IN')}`;

  return (
    <Modal open={open} onClose={onClose} title="Fee Type Master">
      <div className="space-y-5">
        <form onSubmit={handleSave} className="space-y-3 p-4 bg-surface-50 dark:bg-gray-800/40 rounded-xl border border-surface-200 dark:border-gray-700">
          <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide">{form.id ? 'Edit Fee Type' : 'Add Fee Type'}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Name *</label>
              <input className="input-field" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Tuition Fee" />
            </div>
            <div>
              <label className="label">Amount (₹) *</label>
              <input type="number" className="input-field" required min="1" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Frequency</label>
              <select className="input-field" value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
                {FREQ_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Class (optional)</label>
              <select className="input-field" value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value }))}>
                <option value="">All Classes</option>
                {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          {msg && <p className="text-xs text-red-600">{msg}</p>}
          <div className="flex gap-2">
            {form.id && <button type="button" onClick={() => setForm({ id: '', name: '', amount: '', frequency: 'monthly', classId: '' })} className="btn-secondary text-sm">Cancel Edit</button>}
            <button type="submit" disabled={saving} className="btn-primary text-sm">{saving ? 'Saving...' : form.id ? 'Update' : 'Add Fee Type'}</button>
          </div>
        </form>

        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-surface-100 dark:bg-gray-700 rounded-lg animate-pulse" />)}</div>
        ) : structures.length === 0 ? (
          <p className="text-sm text-surface-400 text-center py-4">No fee types configured yet.</p>
        ) : (
          <div className="space-y-2">
            {structures.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-surface-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.name}</p>
                  <p className="text-xs text-surface-400">{fmt(s.amount)} · {s.frequency}{s.class_name ? ` · ${s.class_name}` : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setForm({ id: s.id, name: s.name, amount: String(s.amount), frequency: s.frequency, classId: s.classId || '' })}
                    className="text-xs text-brand-600 dark:text-brand-400 hover:underline">Edit</button>
                  <button onClick={() => handleDelete(s.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Apply Fees Modal ─────────────────────────────────────────────────────────

function ApplyFeesModal({ open, onClose, token, onSuccess }: { open: boolean; onClose: () => void; token: string; onSuccess: () => void }) {
  const [classes,    setClasses]    = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [students,   setStudents]   = useState<any[]>([]);
  const [scope,      setScope]      = useState<'class' | 'students'>('class');
  const [classId,    setClassId]    = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [feeStructureId, setFeeStructureId]     = useState('');
  const [amount,     setAmount]     = useState('');
  const [dueDate,    setDueDate]    = useState('');
  const [applying,   setApplying]   = useState(false);
  const [msg,        setMsg]        = useState<{ type: string; text: string } | null>(null);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const fmt = (n: any) => `₹${parseFloat(n || 0).toLocaleString('en-IN')}`;

  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch('/api/classes', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/fees?action=structures', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([cr, sr]) => {
      setClasses(cr.classes || []);
      setStructures(sr.structures || []);
    });
  }, [open, token]);

  useEffect(() => {
    if (!classId) { setStudents([]); return; }
    fetch(`/api/students?class_id=${classId}&status=active`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setStudents(d.students || []));
  }, [classId, token]);

  // Auto-fill amount when structure is selected
  useEffect(() => {
    const s = structures.find((x: any) => x.id === feeStructureId);
    if (s) setAmount(String(s.amount));
  }, [feeStructureId, structures]);

  const toggleStudent = (id: string) =>
    setSelectedStudents(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dueDate) { setMsg({ type: 'error', text: 'Due date is required' }); return; }
    if (!amount || parseFloat(amount) <= 0) { setMsg({ type: 'error', text: 'Amount must be greater than 0' }); return; }
    if (scope === 'students' && selectedStudents.length === 0) { setMsg({ type: 'error', text: 'Select at least one student' }); return; }
    if (scope === 'class' && !classId) { setMsg({ type: 'error', text: 'Select a class' }); return; }
    setApplying(true); setMsg(null);
    try {
      const res = await fetch('/api/fees', {
        method: 'POST', headers,
        body: JSON.stringify({
          action:          'apply_bulk',
          classId:         scope === 'class' ? classId : undefined,
          studentIds:      scope === 'students' ? selectedStudents : [],
          feeStructureId:  feeStructureId || undefined,
          amount:          parseFloat(amount),
          dueDate,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setMsg({ type: 'error', text: d.error || 'Failed to apply fees' }); return; }
      const failNote = d.failed > 0 ? ` (${d.failed} failed — may already have an invoice)` : '';
      setMsg({ type: d.failed > 0 ? 'error' : 'success', text: `Fee applied to ${d.created} student${d.created !== 1 ? 's' : ''}${failNote}` });
      setTimeout(() => { onClose(); onSuccess(); }, 1500);
    } finally { setApplying(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Apply Fees">
      <form onSubmit={handleApply} className="space-y-4">
        {/* Scope selector */}
        <div>
          <label className="label">Apply To</label>
          <div className="flex gap-2 mt-1">
            {(['class', 'students'] as const).map(s => (
              <button key={s} type="button" onClick={() => { setScope(s); setSelectedStudents([]); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${scope === s ? 'bg-brand-500 text-white border-brand-500' : 'bg-white dark:bg-gray-800 border-surface-200 dark:border-gray-700 text-surface-500 hover:bg-surface-50'}`}>
                {s === 'class' ? 'Entire Class' : 'Select Students'}
              </button>
            ))}
          </div>
        </div>

        {/* Class selector */}
        <div>
          <label className="label">Class *</label>
          <select className="input-field" required value={classId} onChange={e => { setClassId(e.target.value); setSelectedStudents([]); }}>
            <option value="">Select class</option>
            {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Student multi-select */}
        {scope === 'students' && classId && (
          <div>
            <label className="label">Students *</label>
            {students.length === 0 ? (
              <p className="text-sm text-surface-400 py-2">No active students in this class.</p>
            ) : (
              <div className="border border-surface-200 dark:border-gray-700 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                <div className="flex items-center justify-between px-3 py-2 bg-surface-50 dark:bg-gray-800 border-b border-surface-200 dark:border-gray-700">
                  <span className="text-xs font-medium text-surface-500">{selectedStudents.length}/{students.length} selected</span>
                  <button type="button" className="text-xs text-brand-600 dark:text-brand-400"
                    onClick={() => setSelectedStudents(selectedStudents.length === students.length ? [] : students.map((s: any) => s.id))}>
                    {selectedStudents.length === students.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                {students.map((s: any) => (
                  <label key={s.id} className="flex items-center gap-3 px-3 py-2 hover:bg-surface-50 dark:hover:bg-gray-700/50 cursor-pointer border-b border-surface-100 dark:border-gray-700/50 last:border-0">
                    <input type="checkbox" className="rounded" checked={selectedStudents.includes(s.id)} onChange={() => toggleStudent(s.id)} />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{s.firstName} {s.lastName}</span>
                    {s.admissionNo && <span className="text-xs text-surface-400 ml-auto">{s.admissionNo}</span>}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Fee structure */}
        <div>
          <label className="label">Fee Type (optional)</label>
          <select className="input-field" value={feeStructureId} onChange={e => setFeeStructureId(e.target.value)}>
            <option value="">Custom amount</option>
            {structures.map((s: any) => <option key={s.id} value={s.id}>{s.name} — {fmt(s.amount)}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Amount (₹) *</label>
            <input type="number" className="input-field" required min="1" step="0.01"
              value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className="label">Due Date *</label>
            <input type="date" className="input-field" required value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
        </div>

        {msg && (
          <div className={`px-3 py-2 rounded-lg text-sm font-medium ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'}`}>
            {msg.text}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={applying} className="btn-primary flex-1">
            {applying ? 'Applying...' : 'Apply Fees'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

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
      if (!res.ok) { setError(d.error || 'Failed to send fee notifications — please try again'); return; }
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

function FeesTable({ invoices, loading, fetchError, summary, filter, setFilter, title, subtitle, isParent, role, token, onRefresh }: {
  invoices: any[];
  loading: boolean;
  fetchError: string | null;
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
  const [showApply,     setShowApply]     = useState(false);
  const [showFeeTypes,  setShowFeeTypes]  = useState(false);
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
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setShowFeeTypes(true)} className="btn-secondary flex items-center gap-2">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2z"/><circle cx="7" cy="7" r="1"/></svg>
              Fee Types
            </button>
            <button onClick={() => setShowApply(true)} className="btn-secondary flex items-center gap-2">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              Apply Fees
            </button>
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
      {!isParent && <NotifyModal    open={showNotify}   onClose={() => setShowNotify(false)}   token={token} />}
      {!isParent && <FeeTypeMasterModal open={showFeeTypes} onClose={() => setShowFeeTypes(false)} token={token} />}
      {!isParent && <ApplyFeesModal open={showApply} onClose={() => setShowApply(false)} token={token} onSuccess={() => onRefresh?.()} />}

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
              <div className={`rounded-xl border p-3 text-sm space-y-1 ${(uploadResult.errors ?? []).length > 0 ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'}`}>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{uploadResult.created} of {uploadResult.total} invoices created</p>
                {(uploadResult.errors ?? []).map((err: string, i: number) => <p key={i} className="text-xs text-amber-700 dark:text-amber-400">{err}</p>)}
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
              {fetchError ? (
                <tr><td colSpan={isParent ? 7 : 8}><PageError message={fetchError} onRetry={onRefresh} /></td></tr>
              ) : loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: isParent ? 7 : 8 }).map((_, j) => (
                      <td key={j}><div className="h-4 bg-surface-100 rounded animate-pulse w-16"/></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={isParent ? 7 : 8} className="text-center py-8 text-surface-400">No invoices found.</td></tr>
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
                      <a
                        href={`/api/fees/invoice-pdf?invoiceId=${inv.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs flex items-center gap-1 text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1.5 rounded-lg hover:bg-indigo-100 font-medium transition-colors"
                        title="Download PDF Invoice"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                        PDF Invoice
                      </a>
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
  const [fetchError,  setFetchError]  = useState<string | null>(null);
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

  const loadFees = useCallback(async () => {
    if (role === null) return;
    if (role === 'parent' && !activeChild) return;
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams();
      if (filter) params.set('status', filter);
      if (role === 'parent' && activeChild) params.set('student_id', activeChild.id);
      const res = await fetch(`/api/fees?${params}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to load fee invoices');
      setInvoices(d.invoices || []);
      setSummary(d.summary);
    } catch (e: any) {
      setFetchError(e.message || 'Failed to load fee invoices — please try again.');
    } finally {
      setLoading(false);
    }
  }, [filter, token, role, activeChild]);

  useEffect(() => { loadFees(); }, [loadFees, refreshKey]);

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
      fetchError={fetchError}
      filter={filter}
      setFilter={setFilter}
      isParent={isParent}
      role={role || ''}
      token={token || ''}
      title={isParent ? `${childName}'s Fees` : 'Fee Management'}
      subtitle={isParent ? `Fee invoices for ${childName}` : 'Track invoices and payments'}
      onRefresh={loadFees}
    />
  );
}
