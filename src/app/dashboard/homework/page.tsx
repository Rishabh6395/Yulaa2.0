'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { useApi } from '@/hooks/useApi';

const EMPTY_FORM = { class_id: '', subject: '', title: '', description: '', due_date: '' };

const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  done:         { label: 'Done',       bg: 'bg-emerald-100 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400' },
  not_done:     { label: 'Not Done',   bg: 'bg-red-100     dark:bg-red-950/40',     text: 'text-red-700     dark:text-red-400' },
  parent_noted: { label: 'Noted',      bg: 'bg-brand-100   dark:bg-brand-950/40',   text: 'text-brand-700   dark:text-brand-400' },
  submitted:    { label: 'Submitted',  bg: 'bg-emerald-100 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400' },
  pending:      { label: 'Pending',    bg: 'bg-surface-100 dark:bg-gray-800',       text: 'text-surface-400 dark:text-gray-500' },
};

export default function HomeworkPage() {
  const [showAddModal,  setShowAddModal]  = useState(false);
  const [editHw,        setEditHw]        = useState<any>(null);
  const [noteHw,        setNoteHw]        = useState<any>(null);
  const [viewHw,        setViewHw]        = useState<any>(null); // teacher: view submissions
  const [form,          setForm]          = useState(EMPTY_FORM);
  const [editForm,      setEditForm]      = useState({ title: '', description: '', due_date: '' });
  const [note,          setNote]          = useState('');
  const [saving,        setSaving]        = useState(false);
  const [editSaving,    setEditSaving]    = useState(false);
  const [noteSaving,    setNoteSaving]    = useState(false);
  const [toggling,      setToggling]      = useState<string | null>(null); // hw.id being toggled

  // Teacher: submissions for a homework
  const [submissions,   setSubmissions]   = useState<any[]>([]);
  const [subsLoading,   setSubsLoading]   = useState(false);

  const [activeChild, setActiveChild] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem('activeChild');
    if (stored) setActiveChild(JSON.parse(stored));
    const handler = (e: Event) => setActiveChild((e as CustomEvent).detail);
    window.addEventListener('activeChildChanged', handler);
    return () => window.removeEventListener('activeChildChanged', handler);
  }, []);

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const user    = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
  const isTeacherOrAdmin = ['teacher', 'school_admin', 'super_admin'].includes(user.primaryRole);
  const isParent         = user.primaryRole === 'parent';

  // Include student_id when parent has active child so we get per-student status
  const hwUrl = isParent && activeChild ? `/api/homework?student_id=${activeChild.id}` : '/api/homework';
  const { data, isLoading, mutate } = useApi<{ homework: any[] }>(hwUrl);
  const { data: clsData }           = useApi<{ classes: any[] }>('/api/classes');
  const homework = data?.homework ?? [];
  const classes  = clsData?.classes ?? [];

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date(new Date().toDateString());

  // Create homework
  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/homework', { method: 'POST', headers, body: JSON.stringify(form) });
    if (res.ok) { setShowAddModal(false); setForm(EMPTY_FORM); mutate(); }
    setSaving(false);
  };

  // Edit homework (teacher)
  const openEdit = (hw: any) => {
    setEditHw(hw);
    setEditForm({ title: hw.title, description: hw.description || '', due_date: hw.due_date?.split('T')[0] ?? '' });
  };
  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editHw) return;
    setEditSaving(true);
    const res = await fetch('/api/homework', {
      method: 'PATCH', headers,
      body: JSON.stringify({ id: editHw.id, ...editForm }),
    });
    if (res.ok) { setEditHw(null); mutate(); }
    setEditSaving(false);
  };

  // Parent: quick Done/Not Done toggle
  const handleToggleDone = async (hw: any) => {
    if (!activeChild) return;
    setToggling(hw.id);
    const newStatus = hw.student_status === 'done' ? 'not_done' : 'done';
    await fetch('/api/homework', {
      method: 'PATCH', headers,
      body: JSON.stringify({ id: hw.id, student_id: activeChild.id, done_status: newStatus }),
    });
    mutate();
    setToggling(null);
  };

  // Parent: note modal
  const openNote = (hw: any) => { setNoteHw(hw); setNote(hw.parent_note || ''); };
  const handleNote = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!noteHw) return;
    setNoteSaving(true);
    await fetch('/api/homework', {
      method: 'PATCH', headers,
      body: JSON.stringify({ id: noteHw.id, parent_note: note, student_id: activeChild?.id }),
    });
    setNoteHw(null);
    setNote('');
    mutate();
    setNoteSaving(false);
  };

  // Teacher: view submissions chart
  const openSubmissions = async (hw: any) => {
    setViewHw(hw);
    setSubmissions([]);
    setSubsLoading(true);
    const res  = await fetch(`/api/homework/submissions?id=${hw.id}`, { headers });
    const data = await res.json();
    setSubmissions(data.submissions || []);
    setSubsLoading(false);
  };

  // Submission status counts for teacher chart
  const subCounts = (subs: any[]) => ({
    done:     subs.filter(s => s.status === 'done').length,
    not_done: subs.filter(s => s.status === 'not_done').length,
    noted:    subs.filter(s => s.status === 'parent_noted').length,
    pending:  subs.filter(s => !s.status || s.status === 'pending').length,
    total:    subs.length,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Homework</h1>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">Assignments and submissions</p>
        </div>
        {isTeacherOrAdmin && (
          <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Assign Homework
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="card p-5 h-44 animate-pulse bg-surface-100"/>)}
        </div>
      ) : homework.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-surface-400">No homework assigned yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {homework.map((hw) => {
            const overdue = isOverdue(hw.due_date);
            const stuStatus = hw.student_status;
            const stuCfg    = stuStatus ? STATUS_CFG[stuStatus] : null;
            return (
              <div key={hw.id} className="card-hover p-5 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <span className="badge-info text-[10px]">{hw.subject}</span>
                  <div className="flex items-center gap-1.5">
                    {stuCfg && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${stuCfg.bg} ${stuCfg.text}`}>
                        {stuCfg.label}
                      </span>
                    )}
                    {overdue && hw.status === 'active' ? (
                      <span className="badge-danger text-[10px]">Overdue</span>
                    ) : (
                      <span className="badge-neutral text-[10px]">{hw.status}</span>
                    )}
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">{hw.title}</h3>
                {hw.description && <p className="text-xs text-surface-400 line-clamp-2 mb-3">{hw.description}</p>}
                {hw.parent_note && (
                  <div className="mb-2 p-2 rounded-lg bg-brand-50 dark:bg-brand-950/30 border border-brand-100 dark:border-brand-900">
                    <p className="text-[11px] text-brand-700 dark:text-brand-300 font-medium">Parent note:</p>
                    <p className="text-[11px] text-brand-600 dark:text-brand-400">{hw.parent_note}</p>
                  </div>
                )}
                <div className="mt-auto pt-3 border-t border-surface-100 dark:border-gray-700 flex items-center justify-between text-xs text-surface-400">
                  <span>{hw.grade} {hw.section}</span>
                  <span>Due: {new Date(hw.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs">
                  <span className="text-surface-400">By {hw.teacher_name}</span>
                  <span className="text-brand-500 font-medium">{hw.submissions}/{hw.total_students} submitted</span>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 mt-3">
                  {/* Teacher: Edit + View Submissions */}
                  {isTeacherOrAdmin && (
                    <>
                      <button
                        onClick={() => openEdit(hw)}
                        className="flex-1 text-xs bg-surface-50 dark:bg-gray-800 text-surface-600 dark:text-gray-400 border border-surface-200 dark:border-gray-700 px-3 py-1.5 rounded-lg hover:bg-surface-100 font-medium transition-colors flex items-center justify-center gap-1.5"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Edit
                      </button>
                      <button
                        onClick={() => openSubmissions(hw)}
                        className="flex-1 text-xs bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800 px-3 py-1.5 rounded-lg hover:bg-brand-100 font-medium transition-colors flex items-center justify-center gap-1.5"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        Submissions
                      </button>
                    </>
                  )}

                  {/* Parent: Done/Not Done toggle + Note — locked once done */}
                  {isParent && hw.student_status !== 'done' && (
                    <>
                      <button
                        onClick={() => handleToggleDone(hw)}
                        disabled={toggling === hw.id}
                        className="flex-1 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 border bg-surface-50 dark:bg-gray-800 text-surface-600 dark:text-gray-400 border-surface-200 dark:border-gray-700 hover:bg-surface-100"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                        Mark Done
                      </button>
                      <button
                        onClick={() => openNote(hw)}
                        className="flex-1 text-xs bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800 px-3 py-1.5 rounded-lg hover:bg-brand-100 font-medium transition-colors flex items-center justify-center gap-1.5"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                        {hw.parent_note ? 'Edit Note' : 'Add Note'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assign Homework Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Assign Homework">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Class *</label>
              <select className="input-field" required value={form.class_id} onChange={e => setForm({...form, class_id: e.target.value})}>
                <option value="">Select</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.grade} - {c.section}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Subject *</label>
              <input className="input-field" required placeholder="e.g. Mathematics" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})}/>
            </div>
          </div>
          <div>
            <label className="label">Title *</label>
            <input className="input-field" required placeholder="Homework title" value={form.title} onChange={e => setForm({...form, title: e.target.value})}/>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input-field" rows={3} placeholder="Instructions for students…" value={form.description} onChange={e => setForm({...form, description: e.target.value})}/>
          </div>
          <div>
            <label className="label">Due Date *</label>
            <input type="date" className="input-field" required value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})}/>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : 'Assign'}</button>
          </div>
        </form>
      </Modal>

      {/* Edit Homework Modal */}
      <Modal open={!!editHw} onClose={() => setEditHw(null)} title={`Edit: ${editHw?.title ?? ''}`}>
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input className="input-field" required value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})}/>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input-field" rows={3} value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})}/>
          </div>
          <div>
            <label className="label">Due Date *</label>
            <input type="date" className="input-field" required value={editForm.due_date} onChange={e => setEditForm({...editForm, due_date: e.target.value})}/>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setEditHw(null)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={editSaving} className="btn-primary flex-1">{editSaving ? 'Saving…' : 'Update'}</button>
          </div>
        </form>
      </Modal>

      {/* Parent Note Modal */}
      <Modal open={!!noteHw} onClose={() => setNoteHw(null)} title={`Note for: ${noteHw?.title ?? ''}`}>
        <form onSubmit={handleNote} className="space-y-4">
          <div className="p-3 rounded-xl bg-surface-50 dark:bg-gray-800 border border-surface-200 dark:border-gray-700">
            <p className="text-xs text-surface-400 mb-1">{noteHw?.subject} · Due {noteHw?.due_date ? new Date(noteHw.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{noteHw?.description || noteHw?.title}</p>
          </div>
          <div>
            <label className="label">Your Note</label>
            <textarea className="input-field" rows={3} placeholder="e.g. Completed, needs review. Facing difficulty with Q3…" value={note} onChange={e => setNote(e.target.value)}/>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setNoteHw(null)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={noteSaving} className="btn-primary flex-1">{noteSaving ? 'Saving…' : 'Save Note'}</button>
          </div>
        </form>
      </Modal>

      {/* Teacher: Submissions Chart Modal */}
      <Modal open={!!viewHw} onClose={() => setViewHw(null)} title={`Submissions: ${viewHw?.title ?? ''}`}>
        {subsLoading ? (
          <div className="space-y-2">
            {[1,2,3,4].map(i => <div key={i} className="h-8 bg-surface-100 dark:bg-gray-800 rounded-xl animate-pulse"/>)}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary bar chart */}
            {(() => {
              const c = subCounts(submissions);
              return (
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  {[
                    { label: 'Done',     count: c.done,     cls: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' },
                    { label: 'Not Done', count: c.not_done, cls: 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400' },
                    { label: 'Noted',    count: c.noted,    cls: 'bg-brand-100 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400' },
                    { label: 'Pending',  count: c.pending,  cls: 'bg-surface-100 dark:bg-gray-800 text-surface-500 dark:text-gray-400' },
                  ].map(item => (
                    <div key={item.label} className={`rounded-xl p-3 ${item.cls}`}>
                      <p className="text-xl font-bold">{item.count}</p>
                      <p className="font-semibold opacity-80">{item.label}</p>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Progress bar */}
            {submissions.length > 0 && (() => {
              const c = subCounts(submissions);
              return (
                <div>
                  <div className="flex items-center justify-between text-xs text-surface-400 mb-1">
                    <span>Student responses</span>
                    <span>{submissions.length - c.pending} / {submissions.length} responded</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-100 dark:bg-gray-800 overflow-hidden flex">
                    <div className="bg-emerald-400 transition-all" style={{ width: `${(c.done / submissions.length) * 100}%` }}/>
                    <div className="bg-red-400 transition-all"     style={{ width: `${(c.not_done / submissions.length) * 100}%` }}/>
                    <div className="bg-brand-400 transition-all"   style={{ width: `${(c.noted / submissions.length) * 100}%` }}/>
                  </div>
                </div>
              );
            })()}

            {/* Student list */}
            <div className="max-h-64 overflow-y-auto space-y-1">
              {submissions.map(s => {
                const cfg = STATUS_CFG[s.status] || STATUS_CFG.pending;
                return (
                  <div key={s.student_id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-surface-50 dark:bg-gray-800 text-xs">
                    <div>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{s.student_name}</span>
                      {s.admission_no && <span className="text-surface-400 ml-2">#{s.admission_no}</span>}
                      {s.feedback && <p className="text-surface-400 mt-0.5 text-[11px] italic">{s.feedback}</p>}
                    </div>
                    <span className={`px-2 py-0.5 rounded-md font-semibold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
