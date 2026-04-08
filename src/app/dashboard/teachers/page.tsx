'use client';

import { useState, useEffect, useRef } from 'react';
import Modal from '@/components/ui/Modal';
import { useFormConfig } from '@/hooks/useFormConfig';

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', phone: '', employee_id: '', qualification: '', joining_date: '' });

  // Bulk upload state
  const [uploadFile, setUploadFile]     = useState<File | null>(null);
  const [uploading, setUploading]       = useState(false);
  const [uploadResult, setUploadResult] = useState<{ created: number; errors: string[]; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fc = useFormConfig('add_teacher_form');
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const user  = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
  const isAdmin = ['school_admin', 'super_admin'].includes(user.primaryRole);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchTeachers = () => {
    fetch('/api/teachers', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setTeachers(d.teachers || []); setLoading(false); });
  };

  useEffect(() => { fetchTeachers(); }, [token]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    const res = await fetch('/api/teachers', { method: 'POST', headers, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setSaveError(data.error || 'Failed to add teacher'); setSaving(false); return; }
    setShowAddModal(false);
    setForm({ first_name: '', last_name: '', email: '', password: '', phone: '', employee_id: '', qualification: '', joining_date: '' });
    fetchTeachers();
    setSaving(false);
  };

  const handleToggleStatus = async (teacherId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await fetch('/api/teachers', { method: 'PATCH', headers, body: JSON.stringify({ id: teacherId, status: newStatus }) });
    fetchTeachers();
  };

  const handleDownloadTemplate = () => {
    fetch('/api/teachers/bulk', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = 'teachers-template.xlsx';
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
    const res  = await fetch('/api/teachers/bulk', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
    const data = await res.json();
    setUploadResult(data);
    setUploading(false);
    if (data.created > 0) fetchTeachers();
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setUploadFile(null);
    setUploadResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const active   = teachers.filter(t => t.status === 'active');
  const inactive = teachers.filter(t => t.status !== 'active');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Teachers</h1>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">
            {active.length} active · {inactive.length} inactive
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button onClick={() => setShowUploadModal(true)} className="btn-secondary flex items-center gap-2">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Upload
            </button>
            <button onClick={() => { setShowAddModal(true); fc.refresh(); }} className="btn-primary flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Teacher
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="card p-5 h-36 animate-pulse bg-surface-100"/>)}
        </div>
      ) : teachers.length === 0 ? (
        <div className="card p-12 text-center"><p className="text-surface-400">No teachers found.</p></div>
      ) : (
        <div className="space-y-6">
          {/* Active Teachers */}
          {active.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Active ({active.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {active.map(t => <TeacherCard key={t.id} teacher={t} isAdmin={isAdmin} onToggle={handleToggleStatus} />)}
              </div>
            </div>
          )}
          {/* Inactive Teachers */}
          {inactive.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Inactive ({inactive.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inactive.map(t => <TeacherCard key={t.id} teacher={t} isAdmin={isAdmin} onToggle={handleToggleStatus} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bulk Upload Modal */}
      <Modal open={showUploadModal} onClose={closeUploadModal} title="Bulk Upload Teachers">
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-surface-50 dark:bg-gray-800 border border-surface-200 dark:border-gray-700 text-xs text-surface-500 dark:text-gray-400 space-y-1">
            <p className="font-semibold text-gray-700 dark:text-gray-300">Required columns:</p>
            <p><span className="font-mono bg-surface-100 dark:bg-gray-700 px-1 rounded">first_name</span>, <span className="font-mono bg-surface-100 dark:bg-gray-700 px-1 rounded">last_name</span>, <span className="font-mono bg-surface-100 dark:bg-gray-700 px-1 rounded">email</span></p>
            <p>Optional: <span className="font-mono bg-surface-100 dark:bg-gray-700 px-1 rounded">password</span> (default: Welcome@123), <span className="font-mono bg-surface-100 dark:bg-gray-700 px-1 rounded">phone</span>, <span className="font-mono bg-surface-100 dark:bg-gray-700 px-1 rounded">employee_id</span>, <span className="font-mono bg-surface-100 dark:bg-gray-700 px-1 rounded">qualification</span>, <span className="font-mono bg-surface-100 dark:bg-gray-700 px-1 rounded">joining_date</span></p>
          </div>
          <button onClick={handleDownloadTemplate} className="w-full flex items-center justify-center gap-2 text-sm text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800 rounded-xl py-2 hover:bg-brand-50 dark:hover:bg-brand-950/30 transition-colors font-medium">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download Excel Template
          </button>
          <form onSubmit={handleUpload} className="space-y-3">
            <div>
              <label className="label">Select File (CSV or XLSX)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx"
                className="input-field text-sm"
                onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
              />
            </div>
            {uploadResult && (
              <div className={`rounded-xl border p-3 text-sm space-y-1 ${uploadResult.errors.length > 0 ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'}`}>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{uploadResult.created} of {uploadResult.total} teachers created successfully</p>
                {uploadResult.errors.map((err, i) => (
                  <p key={i} className="text-xs text-amber-700 dark:text-amber-400">{err}</p>
                ))}
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={closeUploadModal} className="btn-secondary flex-1">Close</button>
              <button type="submit" disabled={!uploadFile || uploading} className="btn-primary flex-1">
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Teacher">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {fc.visible('firstName') && (
              <div>
                <label className="label">{fc.label('firstName')}{fc.required('firstName') ? ' *' : ''}</label>
                <input className="input-field" required={fc.required('firstName')} readOnly={!fc.editable('firstName')} value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} placeholder="First name"/>
              </div>
            )}
            {fc.visible('lastName') && (
              <div>
                <label className="label">{fc.label('lastName')}{fc.required('lastName') ? ' *' : ''}</label>
                <input className="input-field" required={fc.required('lastName')} readOnly={!fc.editable('lastName')} value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} placeholder="Last name"/>
              </div>
            )}
          </div>
          {fc.visible('email') && (
            <div>
              <label className="label">{fc.label('email')}{fc.required('email') ? ' *' : ''}</label>
              <input type="email" className="input-field" required={fc.required('email')} readOnly={!fc.editable('email')} value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="teacher@school.edu"/>
            </div>
          )}
          <div>
            <label className="label">Password *</label>
            <input type="password" className="input-field" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Temporary password"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {fc.visible('phone') && (
              <div>
                <label className="label">{fc.label('phone')}{fc.required('phone') ? ' *' : ''}</label>
                <input className="input-field" required={fc.required('phone')} readOnly={!fc.editable('phone')} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+91 XXXXX XXXXX"/>
              </div>
            )}
            {fc.visible('employeeId') && (
              <div>
                <label className="label">{fc.label('employeeId')}{fc.required('employeeId') ? ' *' : ''}</label>
                <input className="input-field" required={fc.required('employeeId')} readOnly={!fc.editable('employeeId')} value={form.employee_id} onChange={e => setForm({...form, employee_id: e.target.value})} placeholder="EMP-001"/>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {fc.visible('qualification') && (
              <div>
                <label className="label">{fc.label('qualification')}{fc.required('qualification') ? ' *' : ''}</label>
                {fc.options('qualification').length > 0 ? (
                  <select className="input-field" required={fc.required('qualification')} disabled={!fc.editable('qualification')} value={form.qualification} onChange={e => setForm({...form, qualification: e.target.value})}>
                    <option value="">Select qualification</option>
                    {fc.options('qualification').map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input className="input-field" required={fc.required('qualification')} readOnly={!fc.editable('qualification')} value={form.qualification} onChange={e => setForm({...form, qualification: e.target.value})} placeholder="B.Ed, M.A..."/>
                )}
              </div>
            )}
            {fc.visible('joiningDate') && (
              <div>
                <label className="label">{fc.label('joiningDate')}{fc.required('joiningDate') ? ' *' : ''}</label>
                <input type="date" className="input-field" required={fc.required('joiningDate')} readOnly={!fc.editable('joiningDate')} value={form.joining_date} onChange={e => setForm({...form, joining_date: e.target.value})}/>
              </div>
            )}
          </div>
          {saveError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{saveError}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Adding...' : 'Add Teacher'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function TeacherCard({ teacher: t, isAdmin, onToggle }: { teacher: any; isAdmin: boolean; onToggle: (id: string, status: string) => void }) {
  const isActive = t.status === 'active';
  return (
    <div className={`card p-5 ${!isActive ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold flex-shrink-0 ${isActive ? 'bg-brand-50 text-brand-600' : 'bg-surface-100 text-surface-400'}`}>
          {t.first_name[0]}{t.last_name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t.first_name} {t.last_name}</h3>
            {!isActive && <span className="text-[10px] bg-surface-100 text-surface-400 px-1.5 py-0.5 rounded font-medium">Inactive</span>}
          </div>
          {t.employee_id && <p className="text-xs text-surface-400 mt-0.5">{t.employee_id}</p>}
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-surface-100 space-y-1">
        <p className="text-xs text-surface-400 flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          {t.email}
        </p>
        {t.phone && (
          <p className="text-xs text-surface-400 flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            {t.phone}
          </p>
        )}
        {t.qualification && <p className="text-xs text-surface-400">{t.qualification}</p>}
      </div>
      {isAdmin && (
        <div className="mt-3 pt-3 border-t border-surface-100">
          <button
            onClick={() => onToggle(t.id, t.status)}
            className={`w-full text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
              isActive
                ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400'
                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400'
            }`}
          >
            {isActive ? 'Deactivate' : 'Reactivate'}
          </button>
        </div>
      )}
    </div>
  );
}
