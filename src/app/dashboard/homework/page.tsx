'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { useApi } from '@/hooks/useApi';

const EMPTY_FORM = { class_id: '', subject: '', title: '', description: '', due_date: '' };

export default function HomeworkPage() {
  const [showAddModal,  setShowAddModal]  = useState(false);
  const [editHw,        setEditHw]        = useState<any>(null);
  const [noteHw,        setNoteHw]        = useState<any>(null);  // for parent note
  const [form,          setForm]          = useState(EMPTY_FORM);
  const [editForm,      setEditForm]      = useState({ title: '', description: '', due_date: '' });
  const [note,          setNote]          = useState('');
  const [saving,        setSaving]        = useState(false);
  const [editSaving,    setEditSaving]    = useState(false);
  const [noteSaving,    setNoteSaving]    = useState(false);

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

  const { data, isLoading, mutate } = useApi<{ homework: any[] }>('/api/homework');
  const { data: clsData }           = useApi<{ classes: any[] }>('/api/classes');
  const homework = data?.homework ?? [];
  const classes  = clsData?.classes ?? [];

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date(new Date().toDateString());

  // Create homework (teacher/admin)
  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/homework', { method: 'POST', headers, body: JSON.stringify(form) });
    if (res.ok) { setShowAddModal(false); setForm(EMPTY_FORM); mutate(); }
    setSaving(false);
  };

  // Open edit modal (teacher) — pre-fill with existing values
  const openEdit = (hw: any) => {
    setEditHw(hw);
    setEditForm({ title: hw.title, description: hw.description || '', due_date: hw.due_date?.split('T')[0] ?? '' });
  };

  // Save homework edit (teacher/admin)
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

  // Parent: add note / mark done
  const openNote = (hw: any) => { setNoteHw(hw); setNote(''); };
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
          {[1,2,3].map(i => <div key={i} className="card p-5 h-40 animate-pulse bg-surface-100"/>)}
        </div>
      ) : homework.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-surface-400">No homework assigned yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {homework.map((hw) => {
            const overdue = isOverdue(hw.due_date);
            return (
              <div key={hw.id} className="card-hover p-5 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <span className="badge-info text-[10px]">{hw.subject}</span>
                  {overdue && hw.status === 'active' ? (
                    <span className="badge-danger text-[10px]">Overdue</span>
                  ) : (
                    <span className="badge-neutral text-[10px]">{hw.status}</span>
                  )}
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
                  {/* Teacher: Edit button */}
                  {isTeacherOrAdmin && (
                    <button
                      onClick={() => openEdit(hw)}
                      className="flex-1 text-xs bg-surface-50 dark:bg-gray-800 text-surface-600 dark:text-gray-400 border border-surface-200 dark:border-gray-700 px-3 py-1.5 rounded-lg hover:bg-surface-100 font-medium transition-colors flex items-center justify-center gap-1.5"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Edit
                    </button>
                  )}

                  {/* Parent: Add note / mark done */}
                  {isParent && (
                    <button
                      onClick={() => openNote(hw)}
                      className="flex-1 text-xs bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800 px-3 py-1.5 rounded-lg hover:bg-brand-100 font-medium transition-colors flex items-center justify-center gap-1.5"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                      {hw.parent_note ? 'Edit Note' : 'Add Note'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assign Homework Modal (teacher/admin) */}
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
            <textarea className="input-field" rows={3} placeholder="Instructions for students..." value={form.description} onChange={e => setForm({...form, description: e.target.value})}/>
          </div>
          <div>
            <label className="label">Due Date *</label>
            <input type="date" className="input-field" required value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})}/>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Assign'}</button>
          </div>
        </form>
      </Modal>

      {/* Edit Homework Modal (teacher) */}
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
            <button type="submit" disabled={editSaving} className="btn-primary flex-1">{editSaving ? 'Saving...' : 'Update'}</button>
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
            <textarea className="input-field" rows={3} placeholder="e.g. Completed, needs review. Facing difficulty with Q3..." value={note} onChange={e => setNote(e.target.value)}/>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setNoteHw(null)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={noteSaving} className="btn-primary flex-1">{noteSaving ? 'Saving...' : 'Save Note'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
