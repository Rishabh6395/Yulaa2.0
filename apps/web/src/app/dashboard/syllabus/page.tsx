'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Modal from '@/components/ui/Modal';
import { useApi } from '@/hooks/useApi';

const STATUS_CFG: Record<string, { label: string; cls: string; icon: string }> = {
  pending:     { label: 'Pending',     cls: 'badge-neutral',  icon: '⏳' },
  in_progress: { label: 'In Progress', cls: 'badge-primary',  icon: '▶️' },
  completed:   { label: 'Completed',   cls: 'badge-success',  icon: '✅' },
};

const EMPTY_FORM = { grade: '', section: '', classId: '', subject: '', chapter: '', topic: '', orderNo: 0, academicYear: '', startDate: '', endDate: '' };

export default function SyllabusPage() {
  const [items,         setItems]         = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [classFilter,   setClassFilter]   = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [showForm,      setShowForm]      = useState(false);
  const [showUpload,    setShowUpload]    = useState(false);
  const [form,          setForm]          = useState(EMPTY_FORM);
  const [saving,        setSaving]        = useState(false);
  const [uploading,     setUploading]     = useState(false);
  const [msg,           setMsg]           = useState<{ type: string; text: string } | null>(null);
  const [role,          setRole]          = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Load all classes from DB
  const { data: classData } = useApi<{ classes: any[] }>('/api/classes');
  const classes = classData?.classes || [];

  // Distinct grade list
  const grades = [...new Set(classes.map((c: any) => c.grade))].sort();

  // Sections for the currently selected grade in the form
  const sectionsForGrade = classes
    .filter((c: any) => c.grade === form.grade)
    .map((c: any) => ({ id: c.id, section: c.section, name: c.name }));

  // Load subjects from master when classId is set in form
  const subjectsUrl = form.classId ? `/api/masters/streams?classId=${form.classId}` : null;
  const { data: subjectData } = useApi<{ streamMasters: any[] }>(subjectsUrl);
  const subjects = subjectData?.streamMasters ?? [];

  const isAdmin   = ['school_admin', 'super_admin', 'principal', 'hod'].includes(role);
  const isTeacher = role === 'teacher';
  const canManage = isAdmin || isTeacher;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (classFilter)   params.set('classId',  classFilter);
      if (subjectFilter) params.set('subject',  subjectFilter);
      const res = await fetch(`/api/syllabus?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      setItems(d.items || []);
    } finally { setLoading(false); }
  }, [token, classFilter, subjectFilter]);

  useEffect(() => {
    const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
    setRole(user.primaryRole || '');
    fetchItems();
  }, [fetchItems]);

  // When grade changes in form, reset section/classId/subject
  const handleGradeChange = (grade: string) => {
    setForm(f => ({ ...f, grade, section: '', classId: '', subject: '' }));
  };

  // When section changes, resolve classId
  const handleSectionChange = (classId: string) => {
    const cls = classes.find((c: any) => c.id === classId);
    setForm(f => ({ ...f, section: cls?.section ?? '', classId, subject: '' }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.classId) { setMsg({ type: 'error', text: 'Please select a class and section' }); return; }
    if (!form.subject) { setMsg({ type: 'error', text: 'Please select a subject' }); return; }
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/syllabus', { method: 'POST', headers, body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) { setMsg({ type: 'error', text: d.error || 'Failed' }); return; }
      setMsg({ type: 'success', text: 'Added to syllabus!' });
      setShowForm(false);
      setForm(EMPTY_FORM);
      fetchItems();
    } finally { setSaving(false); }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file || !form.classId || !form.subject) {
      setMsg({ type: 'error', text: 'Select class, subject, and a CSV file' });
      return;
    }
    setUploading(true);
    setMsg(null);
    try {
      const text = await file.text();
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      const items: any[] = [];
      for (const line of lines.slice(1)) {
        const parts = line.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
        const [chapter, topic, orderNo] = parts;
        if (chapter) items.push({ classId: form.classId, subject: form.subject, chapter, topic: topic || null, orderNo: Number(orderNo) || items.length + 1 });
      }
      if (items.length === 0) { setMsg({ type: 'error', text: 'No valid rows found in CSV' }); return; }
      const res = await fetch('/api/syllabus', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'bulk_upsert', items }),
      });
      const d = await res.json();
      if (!res.ok) { setMsg({ type: 'error', text: d.error || 'Upload failed' }); return; }
      setMsg({ type: 'success', text: `Uploaded ${d.created} chapters` });
      setShowUpload(false);
      setForm(EMPTY_FORM);
      if (fileRef.current) fileRef.current.value = '';
      fetchItems();
    } finally { setUploading(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch('/api/syllabus', { method: 'PATCH', headers, body: JSON.stringify({ id, status }) });
    fetchItems();
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Remove this item?')) return;
    await fetch('/api/syllabus', { method: 'DELETE', headers, body: JSON.stringify({ id }) });
    fetchItems();
  };

  // Group by class + subject
  const grouped = items.reduce<Record<string, Record<string, any[]>>>((acc, it) => {
    const classKey = it.classId || 'unknown';
    if (!acc[classKey]) acc[classKey] = {};
    if (!acc[classKey][it.subject]) acc[classKey][it.subject] = [];
    acc[classKey][it.subject].push(it);
    return acc;
  }, {});

  // class name is now embedded in each item by the API; this is a fallback for the filter header
  const getClassName = (id: string) => classes.find((c: any) => c.id === id)?.name || id;

  const progressPct = (its: any[]) => {
    if (!its.length) return 0;
    return Math.round(its.filter(i => i.status === 'completed').length / its.length * 100);
  };

  // Subjects for the filter dropdown — all distinct subjects from loaded items
  const distinctSubjects = [...new Set(items.map((i: any) => i.subject as string))].sort();

  const ClassSectionSubjectFields = ({ isUpload = false }: { isUpload?: boolean }) => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Grade *</label>
          <select className="input-field" required value={form.grade} onChange={e => handleGradeChange(e.target.value)}>
            <option value="">Select grade</option>
            {grades.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Section *</label>
          <select className="input-field" required value={form.classId} onChange={e => handleSectionChange(e.target.value)} disabled={!form.grade}>
            <option value="">{form.grade ? 'Select section' : 'Select grade first'}</option>
            {sectionsForGrade.map((c: any) => <option key={c.id} value={c.id}>{c.section || c.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Subject *</label>
        {subjects.length > 0 ? (
          <select className="input-field" required value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} disabled={!form.classId}>
            <option value="">{form.classId ? 'Select subject' : 'Select section first'}</option>
            {subjects.map((s: any) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        ) : (
          <div className="input-field text-surface-400 dark:text-gray-500 text-sm">
            {form.classId ? 'No subjects configured for this class — add subjects in Masters' : 'Select a section first'}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">Syllabus</h1>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">Track chapter and topic completion</p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button onClick={() => { setMsg(null); setForm(EMPTY_FORM); setShowUpload(true); }} className="btn-secondary flex items-center gap-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Upload CSV
              </button>
            )}
            <button onClick={() => { setMsg(null); setForm(EMPTY_FORM); setShowForm(true); }} className="btn-primary flex items-center gap-2">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Chapter
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select className="input-field text-sm max-w-[180px]" value={classFilter} onChange={e => setClassFilter(e.target.value)}>
          <option value="">All Classes</option>
          {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input-field text-sm max-w-[180px]" value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}>
          <option value="">All Subjects</option>
          {distinctSubjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {msg && (
        <div className={`px-4 py-2 rounded-xl text-sm font-medium ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'}`}>
          {msg.text}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-4">{[1,2].map(i => <div key={i} className="h-40 rounded-2xl bg-surface-50 dark:bg-gray-800/40 animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center text-surface-400 dark:text-gray-500">
          <div className="text-4xl mb-3">📖</div>
          <p className="text-sm">No syllabus items found.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([classId, subjects]) => {
          // Use class name embedded in first item by the API; fall back to classes list, then ID
          const firstItem = Object.values(subjects as Record<string, any[]>)[0]?.[0];
          const displayClassName = firstItem?.class?.name || getClassName(classId);
          return (
          <div key={classId} className="space-y-4">
            <h2 className="text-sm font-semibold text-surface-500 dark:text-gray-400 uppercase tracking-wide">
              Class: {displayClassName}
            </h2>
            {Object.entries(subjects).map(([subject, subItems]) => {
              const pct = progressPct(subItems);
              return (
                <div key={subject} className="card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{subject}</span>
                      <span className="text-xs text-surface-400 dark:text-gray-500">{subItems.length} chapters</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-1.5 bg-surface-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-surface-400 dark:text-gray-500">{pct}%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {subItems.map((it: any) => {
                      const sCfg = STATUS_CFG[it.status] || STATUS_CFG.pending;
                      return (
                        <div key={it.id} className="flex items-center gap-3 p-2.5 bg-surface-50 dark:bg-gray-800/40 rounded-xl">
                          <span className="text-base">{sCfg.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{it.chapter}</p>
                            {it.topic && <p className="text-xs text-surface-400 dark:text-gray-500 truncate">{it.topic}</p>}
                            {(it.startDate || it.endDate) && (
                              <p className="text-xs text-surface-300 dark:text-gray-600 mt-0.5">
                                {it.startDate ? new Date(it.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                                {it.startDate && it.endDate ? ' – ' : ''}
                                {it.endDate ? new Date(it.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                              </p>
                            )}
                          </div>
                          {canManage && (
                            <select
                              value={it.status}
                              onChange={e => updateStatus(it.id, e.target.value)}
                              className="input-field text-xs py-1 px-2 w-32"
                            >
                              <option value="pending">Pending</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                            </select>
                          )}
                          {isAdmin && (
                            <button onClick={() => deleteItem(it.id)}
                              className="w-6 h-6 flex items-center justify-center rounded text-surface-300 hover:text-red-500 transition-colors">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          );
        })
      )}

      {/* Add Chapter Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Syllabus Chapter">
        <form onSubmit={handleCreate} className="space-y-4">
          <ClassSectionSubjectFields />
          <div>
            <label className="label">Chapter *</label>
            <input className="input-field" required value={form.chapter} onChange={e => setForm(f => ({...f, chapter: e.target.value}))} placeholder="e.g. Chapter 3: Laws of Motion" />
          </div>
          <div>
            <label className="label">Topic (optional)</label>
            <input className="input-field" value={form.topic} onChange={e => setForm(f => ({...f, topic: e.target.value}))} placeholder="Specific topic or subtopic" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date</label>
              <input type="date" className="input-field" value={form.startDate} onChange={e => setForm(f => ({...f, startDate: e.target.value}))} />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" className="input-field" value={form.endDate} onChange={e => setForm(f => ({...f, endDate: e.target.value}))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Order No.</label>
              <input type="number" className="input-field" value={form.orderNo} onChange={e => setForm(f => ({...f, orderNo: Number(e.target.value)}))} min={0} />
            </div>
            <div>
              <label className="label">Academic Year</label>
              <input className="input-field" value={form.academicYear} onChange={e => setForm(f => ({...f, academicYear: e.target.value}))} placeholder="2025-2026" />
            </div>
          </div>
          {msg && showForm && (
            <div className={`px-3 py-2 rounded-lg text-sm ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Adding...' : 'Add Chapter'}</button>
          </div>
        </form>
      </Modal>

      {/* Upload CSV Modal */}
      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Upload Syllabus (CSV)">
        <form onSubmit={handleUpload} className="space-y-4">
          <ClassSectionSubjectFields isUpload />
          <div>
            <label className="label">CSV File *</label>
            <input ref={fileRef} type="file" accept=".csv" className="input-field text-sm" required />
            <p className="text-xs text-surface-400 dark:text-gray-500 mt-1">
              Columns: <code className="font-mono bg-surface-100 dark:bg-gray-700 px-1 rounded">chapter, topic (optional), orderNo (optional)</code>. First row is header.
            </p>
          </div>
          {msg && showUpload && (
            <div className={`px-3 py-2 rounded-lg text-sm ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowUpload(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={uploading} className="btn-primary flex-1">{uploading ? 'Uploading...' : 'Upload'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
