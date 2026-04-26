'use client';

import { useState, useRef } from 'react';
import Modal from '@/components/ui/Modal';
import { useApi } from '@/hooks/useApi';

function initials(first: string, last: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
}

function LinkChildModal({
  parent,
  students,
  schoolId,
  onClose,
  onSuccess,
}: {
  parent: any;
  students: any[];
  schoolId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedId, setSelectedId] = useState('');
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const linkedIds = new Set(parent.children.map((c: any) => c.id));
  const available = students.filter((s) => !linkedIds.has(s.id));

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) { setError('Please select a student'); return; }
    setSaving(true); setError('');
    const res = await fetch(`/api/parents?school_id=${schoolId}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ parent_id: parent.id, student_id: selectedId }),
    });
    if (res.ok) { onSuccess(); onClose(); }
    else { const d = await res.json(); setError(d.error || 'Failed to link student — please try again'); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Link child — {parent.first_name} {parent.last_name}
          </h3>
          <button onClick={onClose} className="text-surface-400 hover:text-gray-700 dark:hover:text-gray-300">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 px-3 py-2 rounded-lg">{error}</p>}
        <form onSubmit={handleLink} className="space-y-4">
          <div>
            <label className="label">Select Student *</label>
            <select className="input-field" value={selectedId} onChange={e => setSelectedId(e.target.value)} required>
              <option value="">Choose a student…</option>
              {available.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name}
                  {s.grade ? ` (${s.grade}${s.section ? `-${s.section}` : ''})` : ''}
                  {s.admission_no ? ` — ${s.admission_no}` : ''}
                </option>
              ))}
            </select>
            {available.length === 0 && (
              <p className="text-xs text-surface-400 mt-1">All students are already linked to this parent.</p>
            )}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving || available.length === 0} className="btn-primary flex-1">
              {saving ? 'Linking…' : 'Link Child'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SchoolParentsPage({ params }: { params: { id: string } }) {
  const schoolId = params.id;

  const [page,          setPage]         = useState(1);
  const [search,        setSearch]       = useState('');
  const [showAddModal,  setShowAddModal] = useState(false);
  const [linkTarget,    setLinkTarget]   = useState<any>(null);

  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', email: '', password: '', student_ids: [] as string[],
  });
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState('');

  const fileRef                                           = useRef<HTMLInputElement>(null);
  const [uploading,    setUploading]                      = useState(false);
  const [uploadResult, setUploadResult]                   = useState<{ created: number; linked: number; errors: string[]; total: number } | null>(null);
  const [showResultModal, setShowResultModal]             = useState(false);

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const qp = new URLSearchParams({ page: String(page), limit: '20', school_id: schoolId });
  if (search) qp.set('search', search);

  const { data, isLoading, mutate } = useApi<{ parents: any[]; total: number; totalPages: number }>(
    `/api/parents?${qp}`
  );
  const { data: stuData } = useApi<{ students: any[] }>(
    `/api/super-admin/schools/${schoolId}/students?limit=500`
  );

  const parents  = data?.parents    ?? [];
  const total    = data?.total      ?? 0;
  const totalPgs = data?.totalPages ?? 1;
  const students = stuData?.students ?? [];

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(''); setSaving(true);
    const res = await fetch('/api/parents', {
      method: 'POST', headers,
      body: JSON.stringify({ ...form, school_id: schoolId }),
    });
    const d = await res.json();
    if (!res.ok) { setFormError(d.error || 'Failed'); setSaving(false); return; }
    setShowAddModal(false);
    setForm({ first_name: '', last_name: '', phone: '', email: '', password: '', student_ids: [] });
    mutate();
    setSaving(false);
  };

  const handleUnlink = async (parentId: string, studentId: string) => {
    await fetch('/api/parents', {
      method: 'PATCH', headers,
      body: JSON.stringify({ action: 'unlink', parent_id: parentId, student_id: studentId }),
    });
    mutate();
  };

  const handleDownloadTemplate = async () => {
    const res  = await fetch('/api/parents/bulk', { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'parents-template.csv';
    a.click(); URL.revokeObjectURL(url);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('school_id', schoolId);
    const res  = await fetch('/api/parents/bulk', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    const d = await res.json();
    setUploadResult(d);
    setShowResultModal(true);
    setUploading(false);
    if (d.created > 0 || d.linked > 0) mutate();
    if (fileRef.current) fileRef.current.value = '';
  };

  const toggleChildId = (id: string) => {
    setForm(f => ({
      ...f,
      student_ids: f.student_ids.includes(id)
        ? f.student_ids.filter(x => x !== id)
        : [...f.student_ids, id],
    }));
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Parents</h1>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">{total} parents registered</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={handleUpload} />
          <button onClick={handleDownloadTemplate} className="btn-secondary text-sm flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Template
          </button>
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-secondary text-sm flex items-center gap-2">
            {uploading
              ? <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>}
            {uploading ? 'Uploading…' : 'Import CSV'}
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm flex items-center gap-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Add Parent
          </button>
        </div>
      </div>

      {/* Search */}
      <input
        type="text" placeholder="Search by name, phone or email…"
        className="input-field max-w-xs"
        value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
      />

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Parent</th>
                <th>Contact</th>
                <th>Children</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 4 }).map((_, j) => (
                    <td key={j}><div className="h-4 bg-surface-100 rounded animate-pulse w-24"/></td>
                  ))}</tr>
                ))
              ) : parents.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-10 text-surface-400">No parents found. Add your first parent.</td></tr>
              ) : parents.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-pink-50 dark:bg-pink-950/50 flex items-center justify-center text-pink-600 dark:text-pink-400 text-xs font-bold flex-shrink-0">
                        {initials(p.first_name, p.last_name)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{p.first_name} {p.last_name}</p>
                        <p className="text-xs text-surface-400">{p.email?.includes('@noemail.local') ? '' : p.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-sm text-surface-500 dark:text-gray-400">{p.phone || '—'}</td>
                  <td>
                    {p.children.length === 0 ? (
                      <span className="text-xs text-surface-300 dark:text-gray-600">No children linked</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {p.children.map((c: any) => (
                          <span key={c.id} className="inline-flex items-center gap-1 text-xs bg-surface-50 dark:bg-gray-800 text-surface-600 dark:text-gray-300 px-2 py-0.5 rounded-md">
                            {c.first_name} {c.last_name}
                            {c.grade ? ` (${c.grade}${c.section ? `-${c.section}` : ''})` : ''}
                            <button
                              onClick={() => handleUnlink(p.id, c.id)}
                              className="ml-0.5 text-red-400 hover:text-red-600 dark:hover:text-red-400"
                              title="Unlink"
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    <button
                      onClick={() => setLinkTarget(p)}
                      className="text-xs bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-400 px-2.5 py-1 rounded-lg hover:bg-pink-100 font-medium transition-colors"
                    >
                      + Child
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPgs > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-100 dark:border-gray-800">
            <p className="text-xs text-surface-400">Page {page} of {totalPgs}</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs py-1.5 px-3">Previous</button>
              <button disabled={page >= totalPgs} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs py-1.5 px-3">Next</button>
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
                <p className="text-xs text-emerald-600/70 mt-0.5">Parents created</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/40 rounded-xl p-3">
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{uploadResult.linked}</p>
                <p className="text-xs text-blue-600/70 mt-0.5">Children linked</p>
              </div>
            </div>
            {uploadResult.errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1">
                {uploadResult.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-1.5 rounded-lg">{err}</p>
                ))}
              </div>
            )}
            <button onClick={() => setShowResultModal(false)} className="btn-primary w-full">Done</button>
          </div>
        )}
      </Modal>

      {/* Add Parent modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Parent / Guardian">
        <form onSubmit={handleAdd} className="space-y-4">
          {formError && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 px-3 py-2 rounded-lg">{formError}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First Name *</label>
              <input className="input-field" required placeholder="First name"
                value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})}/>
            </div>
            <div>
              <label className="label">Last Name</label>
              <input className="input-field" placeholder="Last name"
                value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})}/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Phone *</label>
              <input className="input-field" required type="tel" placeholder="10-digit mobile"
                value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}/>
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input-field" type="email" placeholder="parent@email.com"
                value={form.email} onChange={e => setForm({...form, email: e.target.value})}/>
            </div>
          </div>
          <div>
            <label className="label">Login Password</label>
            <input className="input-field" type="password" placeholder="Leave blank to use phone number as password"
              value={form.password} onChange={e => setForm({...form, password: e.target.value})}/>
            <p className="text-xs text-surface-400 mt-1">If left blank, phone number is set as the initial password.</p>
          </div>

          {students.length > 0 && (
            <div>
              <label className="label">Link Children (optional)</label>
              <div className="max-h-40 overflow-y-auto border border-surface-200 dark:border-gray-700 rounded-xl divide-y divide-surface-100 dark:divide-gray-800">
                {students.map((s: any) => (
                  <label key={s.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-surface-50 dark:hover:bg-gray-800">
                    <input
                      type="checkbox"
                      className="rounded text-brand-500"
                      checked={form.student_ids.includes(s.id)}
                      onChange={() => toggleChildId(s.id)}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {s.firstName ?? s.first_name} {s.lastName ?? s.last_name}
                      {s.grade ? ` · ${s.grade}${s.section ? `-${s.section}` : ''}` : ''}
                      <span className="text-xs text-surface-400 ml-1">{s.admissionNo ?? s.admission_no}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : 'Add Parent'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Link Child modal */}
      {linkTarget && (
        <LinkChildModal
          parent={linkTarget}
          students={students.map((s: any) => ({
            id:           s.id,
            first_name:   s.firstName ?? s.first_name,
            last_name:    s.lastName  ?? s.last_name,
            admission_no: s.admissionNo ?? s.admission_no,
            grade:        s.grade    ?? s.class?.grade    ?? null,
            section:      s.section  ?? s.class?.section  ?? null,
          }))}
          schoolId={schoolId}
          onClose={() => setLinkTarget(null)}
          onSuccess={() => mutate()}
        />
      )}
    </div>
  );
}
