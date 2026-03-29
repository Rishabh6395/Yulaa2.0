'use client';

import { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/ui/Modal';
import { useApi } from '@/hooks/useApi';

const SUBJECTS = [
  'English', 'Hindi', 'Mathematics', 'Science', 'Social Studies',
  'Sanskrit', 'Computer/IT', 'Physics', 'Chemistry', 'Biology',
  'History', 'Geography', 'Civics', 'Economics', 'Other',
];

const STATUS_CFG: Record<string, { label: string; cls: string; icon: string }> = {
  pending:     { label: 'Pending',     cls: 'badge-neutral',  icon: '⏳' },
  in_progress: { label: 'In Progress', cls: 'badge-primary',  icon: '▶️' },
  completed:   { label: 'Completed',   cls: 'badge-success',  icon: '✅' },
};

const EMPTY_FORM = { classId: '', subject: '', chapter: '', topic: '', orderNo: 0, academicYear: '' };

export default function SyllabusPage() {
  const [items,     setItems]     = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [classFilter, setClassFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [showForm,  setShowForm]  = useState(false);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [msg,       setMsg]       = useState<{ type: string; text: string } | null>(null);
  const [role,      setRole]      = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const { data: classData } = useApi<{ classes: any[] }>('/api/classes');
  const classes = classData?.classes || [];

  const isAdmin   = ['school_admin', 'super_admin', 'principal', 'hod'].includes(role);
  const isTeacher = role === 'teacher';
  const canManage = isAdmin || isTeacher;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (classFilter) params.set('classId', classFilter);
      if (subjectFilter) params.set('subject', subjectFilter);
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const getClassName = (id: string) => classes.find(c => c.id === id)?.name || id;

  const progressPct = (items: any[]) => {
    if (!items.length) return 0;
    return Math.round(items.filter(i => i.status === 'completed').length / items.length * 100);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">Syllabus</h1>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">Track chapter and topic completion</p>
        </div>
        {canManage && (
          <button onClick={() => { setMsg(null); setShowForm(true); }} className="btn-primary flex items-center gap-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Chapter
          </button>
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
          {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
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
        Object.entries(grouped).map(([classId, subjects]) => (
          <div key={classId} className="space-y-4">
            <h2 className="text-sm font-semibold text-surface-500 dark:text-gray-400 uppercase tracking-wide">
              Class: {getClassName(classId)}
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
        ))
      )}

      {/* Add Chapter Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Syllabus Chapter">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Class *</label>
              <select className="input-field" required value={form.classId} onChange={e => setForm(f => ({...f, classId: e.target.value}))}>
                <option value="">Select class</option>
                {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Subject *</label>
              <select className="input-field" required value={form.subject} onChange={e => setForm(f => ({...f, subject: e.target.value}))}>
                <option value="">Select subject</option>
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
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
              <label className="label">Order No.</label>
              <input type="number" className="input-field" value={form.orderNo} onChange={e => setForm(f => ({...f, orderNo: Number(e.target.value)}))} min={0} />
            </div>
            <div>
              <label className="label">Academic Year</label>
              <input className="input-field" value={form.academicYear} onChange={e => setForm(f => ({...f, academicYear: e.target.value}))} placeholder="2025-2026" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Adding...' : 'Add Chapter'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
