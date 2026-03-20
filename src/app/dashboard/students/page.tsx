'use client';

import { useRef, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useApi } from '@/hooks/useApi';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: 'badge-success',
    pending:  'badge-warning',
    rejected: 'badge-danger',
    withdrawn:'badge-neutral',
  };
  return <span className={map[status] || 'badge-neutral'}>{status}</span>;
}

export default function StudentsPage() {
  const [page,          setPage]          = useState(1);
  const [search,        setSearch]        = useState('');
  const [statusFilter,  setStatusFilter]  = useState('');
  const [classFilter,   setClassFilter]   = useState('');
  const [showAddModal,  setShowAddModal]  = useState(false);
  const [form,          setForm]          = useState({ admission_no: '', first_name: '', last_name: '', dob: '', gender: '', class_id: '', address: '' });
  const [saving,        setSaving]        = useState(false);

  // Bulk upload state
  const fileInputRef                        = useRef<HTMLInputElement>(null);
  const [uploading,     setUploading]       = useState(false);
  const [uploadResult,  setUploadResult]    = useState<{ created: number; errors: string[]; total: number } | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Build URL — SWR uses this as the cache key, so each unique filter combo is cached separately
  const params = new URLSearchParams({ page: page.toString(), limit: '15' });
  if (search)       params.set('search',   search);
  if (statusFilter) params.set('status',   statusFilter);
  if (classFilter)  params.set('class_id', classFilter);

  const { data,         isLoading, mutate } = useApi<{ students: any[]; total: number }>(`/api/students?${params}`);
  const { data: clsData }                   = useApi<{ classes:  any[] }>('/api/classes');

  const students = data?.students ?? [];
  const total    = data?.total    ?? 0;
  const classes  = clsData?.classes ?? [];

  const handleApproval = async (id: string, status: string) => {
    await fetch('/api/students', { method: 'PATCH', headers, body: JSON.stringify({ id, admission_status: status }) });
    mutate();
  };

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/students', { method: 'POST', headers, body: JSON.stringify(form) });
    if (res.ok) {
      setShowAddModal(false);
      setForm({ admission_no: '', first_name: '', last_name: '', dob: '', gender: '', class_id: '', address: '' });
      mutate();
    }
    setSaving(false);
  };

  const downloadTemplate = async () => {
    const res = await fetch('/api/students/bulk', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'students-template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/students/bulk', {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}` },
      body:    formData,
    });
    const data = await res.json();
    setUploadResult(data);
    setShowResultModal(true);
    if (data.created > 0) mutate();
    setUploading(false);
    // reset file input so the same file can be re-uploaded if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Students</h1>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">{total} students total</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            onClick={downloadTemplate}
            className="btn-secondary flex items-center gap-2 text-sm"
            title="Download CSV template"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Template
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-secondary flex items-center gap-2 text-sm"
            title="Upload CSV of students"
          >
            {uploading ? (
              <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            )}
            {uploading ? 'Uploading...' : 'Import CSV'}
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Student
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input type="text" placeholder="Search by name or admission no..." className="input-field max-w-xs"
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}/>
        <select className="input-field max-w-[160px]" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
        <select className="input-field max-w-[180px]" value={classFilter} onChange={(e) => { setClassFilter(e.target.value); setPage(1); }}>
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.grade} - {c.section}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th><th>Admission No</th><th>Class</th><th>Gender</th><th>Status</th><th>Parents</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                    <td key={j}><div className="h-4 bg-surface-100 rounded animate-pulse w-20"/></td>
                  ))}</tr>
                ))
              ) : students.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-surface-400">No students found</td></tr>
              ) : students.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 text-xs font-bold">
                        {s.first_name[0]}{s.last_name[0]}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{s.first_name} {s.last_name}</span>
                    </div>
                  </td>
                  <td><span className="font-mono text-xs bg-surface-50 px-2 py-1 rounded">{s.admission_no}</span></td>
                  <td>{s.grade ? `${s.grade} - ${s.section}` : '—'}</td>
                  <td className="capitalize">{s.gender || '—'}</td>
                  <td><StatusBadge status={s.admission_status} /></td>
                  <td>
                    {s.parents ? (
                      <span className="text-xs text-surface-400">{s.parents.map((p: any) => p.name).join(', ')}</span>
                    ) : '—'}
                  </td>
                  <td>
                    {s.admission_status === 'pending' && (
                      <div className="flex gap-1.5">
                        <button onClick={() => handleApproval(s.id, 'approved')} className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg hover:bg-emerald-100 font-medium transition-colors">Approve</button>
                        <button onClick={() => handleApproval(s.id, 'rejected')} className="text-xs bg-red-50 text-red-700 px-2.5 py-1 rounded-lg hover:bg-red-100 font-medium transition-colors">Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 15 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-100">
            <p className="text-xs text-surface-400">Page {page} of {Math.ceil(total / 15)}</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs py-1.5 px-3">Previous</button>
              <button disabled={page >= Math.ceil(total / 15)} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs py-1.5 px-3">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Upload result modal */}
      <Modal open={showResultModal} onClose={() => setShowResultModal(false)} title="Import Results">
        {uploadResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-surface-50 dark:bg-gray-800 rounded-xl p-3">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{uploadResult.total}</p>
                <p className="text-xs text-surface-400 mt-0.5">Total rows</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/40 rounded-xl p-3">
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{uploadResult.created}</p>
                <p className="text-xs text-emerald-600/70 mt-0.5">Created</p>
              </div>
              <div className="bg-red-50 dark:bg-red-950/40 rounded-xl p-3">
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">{uploadResult.errors.length}</p>
                <p className="text-xs text-red-600/70 mt-0.5">Errors</p>
              </div>
            </div>
            {uploadResult.errors.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-2">Error details</p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {uploadResult.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-1.5 rounded-lg">{err}</p>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => setShowResultModal(false)} className="btn-primary w-full">Done</button>
          </div>
        )}
      </Modal>

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Student">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First Name *</label>
              <input className="input-field" required value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})}/>
            </div>
            <div>
              <label className="label">Last Name *</label>
              <input className="input-field" required value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})}/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Admission No *</label>
              <input className="input-field" required value={form.admission_no} onChange={e => setForm({...form, admission_no: e.target.value})}/>
            </div>
            <div>
              <label className="label">Date of Birth</label>
              <input type="date" className="input-field" value={form.dob} onChange={e => setForm({...form, dob: e.target.value})}/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Gender</label>
              <select className="input-field" value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Class</label>
              <select className="input-field" value={form.class_id} onChange={e => setForm({...form, class_id: e.target.value})}>
                <option value="">Select</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.grade} - {c.section}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Address</label>
            <textarea className="input-field" rows={2} value={form.address} onChange={e => setForm({...form, address: e.target.value})}/>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Add Student'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
