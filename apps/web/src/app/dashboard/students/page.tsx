'use client';

import { useRef, useState } from 'react';
import Modal from '@/components/ui/Modal';
import PageError from '@/components/ui/PageError';
import PhotoUpload from '@/components/ui/PhotoUpload';
import { useApi } from '@/hooks/useApi';
import { useFormConfig } from '@/hooks/useFormConfig';

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
  const [form,          setForm]          = useState({ admission_no: '', first_name: '', last_name: '', middle_name: '', roll_no: '', sr_no: '', dob: '', gender: '', class_id: '', address: '', blood_group: '', aadhaar_no: '', category: '', religion: '', nationality: '', mother_tongue: '', house_id: '', stream: '', admission_category: '', boarding_type: '', diet_type: '', disability_type: '', transport_route_id: '', bus_stop: '', doctor_name: '', doctor_phone: '', insurance_provider: '', passport_no: '', parent_name: '', parent_phone: '', parent_email: '', photo_url: '' });
  const [saving,        setSaving]        = useState(false);

  const [parentTarget, setParentTarget] = useState<{ id: string; name: string } | null>(null);
  const [parentForm, setParentForm] = useState({ parent_name: '', parent_phone: '', parent_email: '' });
  const [addingParent, setAddingParent] = useState(false);

  // Bulk upload state
  const fileInputRef                        = useRef<HTMLInputElement>(null);
  const [uploading,     setUploading]       = useState(false);
  const [uploadResult,  setUploadResult]    = useState<{ created: number; errors: string[]; total: number } | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  const fc = useFormConfig('add_student_form');

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Build URL — SWR uses this as the cache key, so each unique filter combo is cached separately
  const params = new URLSearchParams({ page: page.toString(), limit: '15' });
  if (search)       params.set('search',   search);
  if (statusFilter) params.set('status',   statusFilter);
  if (classFilter)  params.set('class_id', classFilter);

  const { data, isLoading, error, mutate } = useApi<{ students: any[]; total: number }>(`/api/students?${params}`);
  const { data: clsData }                   = useApi<{ classes:  any[] }>('/api/classes');

  const students = data?.students ?? [];
  const total    = data?.total    ?? 0;
  const classes  = clsData?.classes ?? [];

  const [actionError, setActionError] = useState<string | null>(null);
  const [saveError,   setSaveError]   = useState<string | null>(null);

  const handleApproval = async (id: string, status: string) => {
    setActionError(null);
    const res = await fetch('/api/students', { method: 'PATCH', headers, body: JSON.stringify({ id, admission_status: status }) });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setActionError(d.error || 'Failed to update student status — please try again.');
    }
    mutate();
  };

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch('/api/students', { method: 'POST', headers, body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) { setSaveError(d.error || 'Failed to add student — please try again.'); return; }
      setShowAddModal(false);
      setForm({ admission_no: '', first_name: '', last_name: '', middle_name: '', roll_no: '', sr_no: '', dob: '', gender: '', class_id: '', address: '', blood_group: '', aadhaar_no: '', category: '', religion: '', nationality: '', mother_tongue: '', house_id: '', stream: '', admission_category: '', boarding_type: '', diet_type: '', disability_type: '', transport_route_id: '', bus_stop: '', doctor_name: '', doctor_phone: '', insurance_provider: '', passport_no: '', parent_name: '', parent_phone: '', parent_email: '', photo_url: '' });
      mutate();
    } catch { setSaveError('Network error — please check your connection and try again.'); }
    finally { setSaving(false); }
  };

  const handleAddParent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!parentTarget) return;
    setAddingParent(true);
    const res = await fetch('/api/students', {
      method: 'PATCH', headers,
      body: JSON.stringify({ action: 'add_parent', studentId: parentTarget.id, ...parentForm }),
    });
    if (res.ok) {
      setParentTarget(null);
      setParentForm({ parent_name: '', parent_phone: '', parent_email: '' });
      mutate();
    }
    setAddingParent(false);
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
          <button onClick={() => { setShowAddModal(true); fc.refresh(); }} className="btn-primary flex items-center gap-2">
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
              {error ? (
                <tr><td colSpan={7}><PageError message="Failed to load students — please try again." onRetry={() => mutate()} /></td></tr>
              ) : isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                    <td key={j}><div className="h-4 bg-surface-100 rounded animate-pulse w-20"/></td>
                  ))}</tr>
                ))
              ) : students.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-surface-400">No students found. Add your first student or import a CSV.</td></tr>
              ) : students.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      {s.photo_url ? (
                        <img src={s.photo_url} alt={`${s.first_name} ${s.last_name}`} className="w-8 h-8 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 text-xs font-bold shrink-0">
                          {s.first_name[0]}{s.last_name[0]}
                        </div>
                      )}
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
                    <div className="flex gap-1.5 flex-wrap">
                      {s.admission_status === 'pending' && (
                        <>
                          <button onClick={() => handleApproval(s.id, 'approved')} className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg hover:bg-emerald-100 font-medium transition-colors">Approve</button>
                          <button onClick={() => handleApproval(s.id, 'rejected')} className="text-xs bg-red-50 text-red-700 px-2.5 py-1 rounded-lg hover:bg-red-100 font-medium transition-colors">Reject</button>
                        </>
                      )}
                      <button
                        onClick={() => { setParentTarget({ id: s.id, name: `${s.first_name} ${s.last_name}` }); setParentForm({ parent_name: '', parent_phone: '', parent_email: '' }); }}
                        className="text-xs bg-surface-50 dark:bg-gray-800 text-surface-600 dark:text-gray-300 px-2.5 py-1 rounded-lg hover:bg-surface-100 dark:hover:bg-gray-700 font-medium transition-colors"
                      >
                        + Parent
                      </button>
                    </div>
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

      <Modal
        open={!!parentTarget}
        onClose={() => setParentTarget(null)}
        title={`Add Parent — ${parentTarget?.name ?? ''}`}
      >
        <form onSubmit={handleAddParent} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Parent Name *</label>
              <input className="input-field" required placeholder="Full name" value={parentForm.parent_name}
                onChange={e => setParentForm({...parentForm, parent_name: e.target.value})}/>
            </div>
            <div>
              <label className="label">Phone *</label>
              <input className="input-field" required type="tel" placeholder="10-digit mobile" value={parentForm.parent_phone}
                onChange={e => setParentForm({...parentForm, parent_phone: e.target.value})}/>
            </div>
            <div className="col-span-2">
              <label className="label">Email</label>
              <input className="input-field" type="email" placeholder="parent@email.com" value={parentForm.parent_email}
                onChange={e => setParentForm({...parentForm, parent_email: e.target.value})}/>
            </div>
          </div>
          <p className="text-xs text-surface-400">If email is provided, the parent can log in. Phone number is used as initial password.</p>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setParentTarget(null)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={addingParent} className="btn-primary flex-1">
              {addingParent ? 'Adding...' : 'Add Parent'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Student">
        <form onSubmit={handleAdd} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          {saveError && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm font-medium">
              {saveError}
            </div>
          )}

          {fc.visible('photo') && (
            <div className="flex justify-center pb-2">
              <PhotoUpload
                value={form.photo_url}
                onChange={url => setForm({ ...form, photo_url: url })}
                label={fc.label('photo')}
                required={fc.required('photo')}
                size={96}
              />
            </div>
          )}

          {/* Name row */}
          <div className="grid grid-cols-2 gap-4">
            {fc.visible('firstName') && (
              <div>
                <label className="label">{fc.label('firstName')}{fc.required('firstName') && <span className="text-red-500 ml-0.5">*</span>}</label>
                <input className="input-field" required={fc.required('firstName')} readOnly={!fc.editable('firstName')} value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})}/>
              </div>
            )}
            {fc.visible('lastName') && (
              <div>
                <label className="label">{fc.label('lastName')}{fc.required('lastName') && <span className="text-red-500 ml-0.5">*</span>}</label>
                <input className="input-field" required={fc.required('lastName')} readOnly={!fc.editable('lastName')} value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})}/>
              </div>
            )}
          </div>

          {fc.visible('middleName') && (
            <div>
              <label className="label">{fc.label('middleName')}{fc.required('middleName') && <span className="text-red-500 ml-0.5">*</span>}</label>
              <input className="input-field" required={fc.required('middleName')} readOnly={!fc.editable('middleName')} value={form.middle_name} onChange={e => setForm({...form, middle_name: e.target.value})}/>
            </div>
          )}

          {/* Admission + Roll numbers */}
          <div className="grid grid-cols-3 gap-4">
            {fc.visible('admissionNo') && (
              <div>
                <label className="label">{fc.label('admissionNo')}{fc.required('admissionNo') && <span className="text-red-500 ml-0.5">*</span>}</label>
                <input className="input-field" required={fc.required('admissionNo')} readOnly={!fc.editable('admissionNo')} value={form.admission_no} onChange={e => setForm({...form, admission_no: e.target.value})}/>
              </div>
            )}
            {fc.visible('rollNo') && (
              <div>
                <label className="label">{fc.label('rollNo')}{fc.required('rollNo') && <span className="text-red-500 ml-0.5">*</span>}</label>
                <input className="input-field" required={fc.required('rollNo')} readOnly={!fc.editable('rollNo')} value={form.roll_no} onChange={e => setForm({...form, roll_no: e.target.value})}/>
              </div>
            )}
            {fc.visible('srNo') && (
              <div>
                <label className="label">{fc.label('srNo')}{fc.required('srNo') && <span className="text-red-500 ml-0.5">*</span>}</label>
                <input className="input-field" required={fc.required('srNo')} readOnly={!fc.editable('srNo')} value={form.sr_no} onChange={e => setForm({...form, sr_no: e.target.value})}/>
              </div>
            )}
          </div>

          {/* DOB + Gender + Class */}
          <div className="grid grid-cols-2 gap-4">
            {fc.visible('dob') && (
              <div>
                <label className="label">{fc.label('dob')}{fc.required('dob') && <span className="text-red-500 ml-0.5">*</span>}</label>
                <input type="date" className="input-field" readOnly={!fc.editable('dob')} value={form.dob} onChange={e => setForm({...form, dob: e.target.value})}/>
              </div>
            )}
            {fc.visible('gender') && (
              <div>
                <label className="label">{fc.label('gender')}{fc.required('gender') && <span className="text-red-500 ml-0.5">*</span>}</label>
                <select className="input-field" required={fc.required('gender')} disabled={!fc.editable('gender')} value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}>
                  <option value="">Select</option>
                  {fc.options('gender', ['Male', 'Female', 'Other']).map(o => (
                    <option key={o} value={o.toLowerCase()}>{o}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {fc.visible('classId') && (
              <div>
                <label className="label">{fc.label('classId')}{fc.required('classId') && <span className="text-red-500 ml-0.5">*</span>}</label>
                <select className="input-field" required={fc.required('classId')} disabled={!fc.editable('classId')} value={form.class_id} onChange={e => setForm({...form, class_id: e.target.value})}>
                  <option value="">Select class</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.grade} - {c.section}</option>)}
                </select>
              </div>
            )}
            {fc.visible('bloodGroup') && (
              <div>
                <label className="label">{fc.label('bloodGroup')}{fc.required('bloodGroup') && <span className="text-red-500 ml-0.5">*</span>}</label>
                <select className="input-field" required={fc.required('bloodGroup')} disabled={!fc.editable('bloodGroup')} value={form.blood_group} onChange={e => setForm({...form, blood_group: e.target.value})}>
                  <option value="">Select</option>
                  {fc.options('bloodGroup', ['A+','A-','B+','B-','AB+','AB-','O+','O-']).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Aadhaar + Category */}
          <div className="grid grid-cols-2 gap-4">
            {fc.visible('aadhaarNo') && (
              <div>
                <label className="label">{fc.label('aadhaarNo')}{fc.required('aadhaarNo') && <span className="text-red-500 ml-0.5">*</span>}</label>
                <input className="input-field" maxLength={12} placeholder="12-digit Aadhaar" required={fc.required('aadhaarNo')} readOnly={!fc.editable('aadhaarNo')} value={form.aadhaar_no} onChange={e => setForm({...form, aadhaar_no: e.target.value})}/>
              </div>
            )}
            {fc.visible('category') && (
              <div>
                <label className="label">{fc.label('category')}{fc.required('category') && <span className="text-red-500 ml-0.5">*</span>}</label>
                <select className="input-field" required={fc.required('category')} disabled={!fc.editable('category')} value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                  <option value="">Select</option>
                  {fc.options('category', ['General','OBC','SC','ST','EWS','Differently Abled']).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Religion + Mother Tongue + Nationality */}
          <div className="grid grid-cols-3 gap-4">
            {fc.visible('religion') && (
              <div>
                <label className="label">{fc.label('religion')}{fc.required('religion') && <span className="text-red-500 ml-0.5">*</span>}</label>
                <select className="input-field" required={fc.required('religion')} disabled={!fc.editable('religion')} value={form.religion} onChange={e => setForm({...form, religion: e.target.value})}>
                  <option value="">Select</option>
                  {['Hindu','Muslim','Christian','Sikh','Buddhist','Jain','Parsi','Others'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            )}
            {fc.visible('motherTongue') && (
              <div>
                <label className="label">{fc.label('motherTongue')}{fc.required('motherTongue') && <span className="text-red-500 ml-0.5">*</span>}</label>
                <input className="input-field" required={fc.required('motherTongue')} readOnly={!fc.editable('motherTongue')} value={form.mother_tongue} onChange={e => setForm({...form, mother_tongue: e.target.value})}/>
              </div>
            )}
            {fc.visible('nationality') && (
              <div>
                <label className="label">{fc.label('nationality')}{fc.required('nationality') && <span className="text-red-500 ml-0.5">*</span>}</label>
                <input className="input-field" placeholder="e.g. Indian" required={fc.required('nationality')} readOnly={!fc.editable('nationality')} value={form.nationality} onChange={e => setForm({...form, nationality: e.target.value})}/>
              </div>
            )}
          </div>

          {/* Stream + Admission Category + Boarding */}
          <div className="grid grid-cols-2 gap-4">
            {fc.visible('stream') && (
              <div>
                <label className="label">{fc.label('stream')}{fc.required('stream') && <span className="text-red-500 ml-0.5">*</span>}</label>
                <select className="input-field" required={fc.required('stream')} disabled={!fc.editable('stream')} value={form.stream} onChange={e => setForm({...form, stream: e.target.value})}>
                  <option value="">Select</option>
                  {['Science','Commerce','Arts','General'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            )}
            {fc.visible('admissionCategory') && (
              <div>
                <label className="label">{fc.label('admissionCategory')}{fc.required('admissionCategory') && <span className="text-red-500 ml-0.5">*</span>}</label>
                <select className="input-field" required={fc.required('admissionCategory')} disabled={!fc.editable('admissionCategory')} value={form.admission_category} onChange={e => setForm({...form, admission_category: e.target.value})}>
                  <option value="">Select</option>
                  {['Regular','EWS/RTE','Sports','NCC','Minority','Legacy','Staff Ward','Management Quota'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {fc.visible('boardingType') && (
              <div>
                <label className="label">{fc.label('boardingType')}{fc.required('boardingType') && <span className="text-red-500 ml-0.5">*</span>}</label>
                <select className="input-field" required={fc.required('boardingType')} disabled={!fc.editable('boardingType')} value={form.boarding_type} onChange={e => setForm({...form, boarding_type: e.target.value})}>
                  <option value="">Select</option>
                  {['Day Scholar','Boarder','Weekly Boarder','Day Boarder'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            )}
            {fc.visible('dietType') && (
              <div>
                <label className="label">{fc.label('dietType')}{fc.required('dietType') && <span className="text-red-500 ml-0.5">*</span>}</label>
                <select className="input-field" required={fc.required('dietType')} disabled={!fc.editable('dietType')} value={form.diet_type} onChange={e => setForm({...form, diet_type: e.target.value})}>
                  <option value="">Select</option>
                  {['Vegetarian','Non-Vegetarian','Vegan','Halal','Jain','Gluten-Free'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            )}
          </div>

          {fc.visible('disabilityType') && (
            <div>
              <label className="label">{fc.label('disabilityType')}{fc.required('disabilityType') && <span className="text-red-500 ml-0.5">*</span>}</label>
              <select className="input-field" required={fc.required('disabilityType')} disabled={!fc.editable('disabilityType')} value={form.disability_type} onChange={e => setForm({...form, disability_type: e.target.value})}>
                <option value="">Select</option>
                {['None','Visual','Hearing','Physical','Dyslexia','ADHD','Autism','Cerebral Palsy'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          )}

          {/* Transport */}
          <div className="grid grid-cols-2 gap-4">
            {fc.visible('transportRouteId') && (
              <div>
                <label className="label">{fc.label('transportRouteId')}{fc.required('transportRouteId') && <span className="text-red-500 ml-0.5">*</span>}</label>
                <input className="input-field" placeholder="Route name / ID" required={fc.required('transportRouteId')} readOnly={!fc.editable('transportRouteId')} value={form.transport_route_id} onChange={e => setForm({...form, transport_route_id: e.target.value})}/>
              </div>
            )}
            {fc.visible('busStop') && (
              <div>
                <label className="label">{fc.label('busStop')}{fc.required('busStop') && <span className="text-red-500 ml-0.5">*</span>}</label>
                <input className="input-field" required={fc.required('busStop')} readOnly={!fc.editable('busStop')} value={form.bus_stop} onChange={e => setForm({...form, bus_stop: e.target.value})}/>
              </div>
            )}
          </div>

          {/* Health */}
          <div className="grid grid-cols-2 gap-4">
            {fc.visible('doctorName') && (
              <div>
                <label className="label">{fc.label('doctorName')}{fc.required('doctorName') && <span className="text-red-500 ml-0.5">*</span>}</label>
                <input className="input-field" required={fc.required('doctorName')} readOnly={!fc.editable('doctorName')} value={form.doctor_name} onChange={e => setForm({...form, doctor_name: e.target.value})}/>
              </div>
            )}
            {fc.visible('doctorPhone') && (
              <div>
                <label className="label">{fc.label('doctorPhone')}{fc.required('doctorPhone') && <span className="text-red-500 ml-0.5">*</span>}</label>
                <input className="input-field" type="tel" required={fc.required('doctorPhone')} readOnly={!fc.editable('doctorPhone')} value={form.doctor_phone} onChange={e => setForm({...form, doctor_phone: e.target.value})}/>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {fc.visible('insuranceProvider') && (
              <div>
                <label className="label">{fc.label('insuranceProvider')}{fc.required('insuranceProvider') && <span className="text-red-500 ml-0.5">*</span>}</label>
                <input className="input-field" required={fc.required('insuranceProvider')} readOnly={!fc.editable('insuranceProvider')} value={form.insurance_provider} onChange={e => setForm({...form, insurance_provider: e.target.value})}/>
              </div>
            )}
            {fc.visible('passportNo') && (
              <div>
                <label className="label">{fc.label('passportNo')}{fc.required('passportNo') && <span className="text-red-500 ml-0.5">*</span>}</label>
                <input className="input-field" required={fc.required('passportNo')} readOnly={!fc.editable('passportNo')} value={form.passport_no} onChange={e => setForm({...form, passport_no: e.target.value})}/>
              </div>
            )}
          </div>

          {fc.visible('address') && (
            <div>
              <label className="label">{fc.label('address')}{fc.required('address') && <span className="text-red-500 ml-0.5">*</span>}</label>
              <textarea className="input-field" rows={2} readOnly={!fc.editable('address')} value={form.address} onChange={e => setForm({...form, address: e.target.value})}/>
            </div>
          )}

          {/* Parent section */}
          <div className="border-t border-surface-100 dark:border-gray-800 pt-4">
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Parent / Guardian (optional)</p>
            <div className="grid grid-cols-2 gap-4">
              {fc.visible('parentName') && (
                <div>
                  <label className="label">{fc.label('parentName')}{fc.required('parentName') && <span className="text-red-500 ml-0.5">*</span>}</label>
                  <input className="input-field" placeholder="Full name" required={fc.required('parentName')} readOnly={!fc.editable('parentName')} value={form.parent_name} onChange={e => setForm({...form, parent_name: e.target.value})}/>
                </div>
              )}
              {fc.visible('parentPhone') && (
                <div>
                  <label className="label">{fc.label('parentPhone')}{fc.required('parentPhone') && <span className="text-red-500 ml-0.5">*</span>}</label>
                  <input className="input-field" type="tel" placeholder="10-digit mobile" required={fc.required('parentPhone')} readOnly={!fc.editable('parentPhone')} value={form.parent_phone} onChange={e => setForm({...form, parent_phone: e.target.value})}/>
                </div>
              )}
              {fc.visible('parentEmail') && (
                <div className="col-span-2">
                  <label className="label">{fc.label('parentEmail')}{fc.required('parentEmail') && <span className="text-red-500 ml-0.5">*</span>}</label>
                  <input className="input-field" type="email" placeholder="parent@email.com" required={fc.required('parentEmail')} readOnly={!fc.editable('parentEmail')} value={form.parent_email} onChange={e => setForm({...form, parent_email: e.target.value})}/>
                </div>
              )}
            </div>
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
