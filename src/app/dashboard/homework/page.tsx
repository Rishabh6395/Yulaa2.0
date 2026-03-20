'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useApi } from '@/hooks/useApi';

export default function HomeworkPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm]   = useState({ class_id: '', subject: '', title: '', description: '', due_date: '' });
  const [saving, setSaving] = useState(false);

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const user    = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
  const isTeacherOrAdmin = ['teacher', 'school_admin', 'super_admin'].includes(user.primaryRole);

  const { data,         isLoading, mutate } = useApi<{ homework: any[] }>('/api/homework');
  const { data: clsData }                   = useApi<{ classes: any[] }>('/api/classes');
  const homework = data?.homework ?? [];
  const classes  = clsData?.classes ?? [];

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/homework', { method: 'POST', headers, body: JSON.stringify(form) });
    if (res.ok) {
      setShowAddModal(false);
      setForm({ class_id: '', subject: '', title: '', description: '', due_date: '' });
      mutate();
    }
    setSaving(false);
  };

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date(new Date().toDateString());

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Homework</h1>
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
          {homework.map((hw) => (
            <div key={hw.id} className="card-hover p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <span className="badge-info text-[10px]">{hw.subject}</span>
                {isOverdue(hw.due_date) && hw.status === 'active' ? (
                  <span className="badge-danger text-[10px]">Overdue</span>
                ) : (
                  <span className="badge-neutral text-[10px]">{hw.status}</span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">{hw.title}</h3>
              {hw.description && <p className="text-xs text-surface-400 line-clamp-2 mb-3">{hw.description}</p>}
              <div className="mt-auto pt-3 border-t border-surface-100 flex items-center justify-between text-xs text-surface-400">
                <span>{hw.grade} {hw.section}</span>
                <span>Due: {new Date(hw.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
              </div>
              <div className="flex items-center justify-between mt-2 text-xs">
                <span className="text-surface-400">By {hw.teacher_name}</span>
                <span className="text-brand-500 font-medium">{hw.submissions}/{hw.total_students} submitted</span>
              </div>
            </div>
          ))}
        </div>
      )}

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
    </div>
  );
}
