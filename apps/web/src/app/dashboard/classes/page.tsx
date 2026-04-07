'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useApi } from '@/hooks/useApi';
import { useFormConfig } from '@/hooks/useFormConfig';

export default function ClassesPage() {
  const [showAddModal,  setShowAddModal]  = useState(false);
  const [editTarget,    setEditTarget]    = useState<any>(null);
  const [form,          setForm]          = useState({ grade: '', section: '', academic_year: '', max_students: '', class_teacher_id: '' });
  const [saving,        setSaving]        = useState(false);

  const fc = useFormConfig('add_class_form');

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const { data,         isLoading, mutate } = useApi<{ classes: any[] }>('/api/classes');
  const { data: tData }                     = useApi<{ teachers: any[] }>('/api/teachers');
  const classes  = data?.classes  ?? [];
  const teachers = tData?.teachers ?? [];

  const openAdd = () => {
    setEditTarget(null);
    setForm({ grade: '', section: '', academic_year: '', max_students: '', class_teacher_id: '' });
    setShowAddModal(true);
  };

  const openEdit = (cls: any) => {
    setEditTarget(cls);
    setForm({
      grade:             cls.grade          || '',
      section:           cls.section        || '',
      academic_year:     cls.academic_year  || '',
      max_students:      cls.capacity       ? String(cls.capacity) : '',
      class_teacher_id:  cls.class_teacher_id || '',
    });
    setShowAddModal(true);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      max_students: form.max_students ? Number(form.max_students) : undefined,
      ...(editTarget && { id: editTarget.id }),
    };
    const res = await fetch('/api/classes', {
      method: editTarget ? 'PATCH' : 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setShowAddModal(false);
      mutate();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Classes</h1>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">{classes.length} classes configured</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Class
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Class</th>
                <th>Academic Year</th>
                <th>Class Teacher</th>
                <th>Students</th>
                <th>Capacity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                    <td key={j}><div className="h-4 bg-surface-100 rounded animate-pulse w-20"/></td>
                  ))}</tr>
                ))
              ) : classes.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-surface-400">No classes yet. Add your first class.</td></tr>
              ) : classes.map((cls) => (
                <tr key={cls.id}>
                  <td>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      Grade {cls.grade} – {cls.section}
                    </span>
                  </td>
                  <td className="text-sm text-surface-400">{cls.academic_year || '—'}</td>
                  <td>{cls.teacher_name || <span className="text-surface-300">—</span>}</td>
                  <td>
                    <span className="font-medium text-brand-600 dark:text-brand-400">{cls.student_count}</span>
                  </td>
                  <td>
                    {cls.capacity ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-surface-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-500 rounded-full"
                            style={{ width: `${Math.min(100, (cls.student_count / cls.capacity) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-surface-400">{cls.student_count}/{cls.capacity}</span>
                      </div>
                    ) : <span className="text-surface-300 text-sm">—</span>}
                  </td>
                  <td>
                    <button
                      onClick={() => openEdit(cls)}
                      className="text-xs bg-surface-50 dark:bg-gray-800 text-surface-600 dark:text-gray-300 px-2.5 py-1 rounded-lg hover:bg-surface-100 dark:hover:bg-gray-700 font-medium transition-colors"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editTarget ? 'Edit Class' : 'Add New Class'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {fc.visible('grade') && (
              <div>
                <label className="label">{fc.label('grade')} *</label>
                <input className="input-field" required placeholder="e.g. 5" readOnly={!fc.editable('grade')} value={form.grade} onChange={e => setForm({...form, grade: e.target.value})}/>
              </div>
            )}
            {fc.visible('section') && (
              <div>
                <label className="label">{fc.label('section')} *</label>
                <input className="input-field" required placeholder="e.g. A" readOnly={!fc.editable('section')} value={form.section} onChange={e => setForm({...form, section: e.target.value})}/>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {fc.visible('academicYear') && (
              <div>
                <label className="label">{fc.label('academicYear')}{fc.required('academicYear') && <span className="text-red-500 ml-0.5">*</span>}</label>
                <input className="input-field" placeholder="e.g. 2024-25" readOnly={!fc.editable('academicYear')} value={form.academic_year} onChange={e => setForm({...form, academic_year: e.target.value})}/>
              </div>
            )}
            {fc.visible('maxStudents') && (
              <div>
                <label className="label">{fc.label('maxStudents')}{fc.required('maxStudents') && <span className="text-red-500 ml-0.5">*</span>}</label>
                <input type="number" min="1" className="input-field" placeholder="e.g. 40" readOnly={!fc.editable('maxStudents')} value={form.max_students} onChange={e => setForm({...form, max_students: e.target.value})}/>
              </div>
            )}
          </div>
          {fc.visible('classTeacher') && (
            <div>
              <label className="label">{fc.label('classTeacher')}{fc.required('classTeacher') && <span className="text-red-500 ml-0.5">*</span>}</label>
              <select className="input-field" disabled={!fc.editable('classTeacher')} value={form.class_teacher_id} onChange={e => setForm({...form, class_teacher_id: e.target.value})}>
                <option value="">Select teacher (optional)</option>
                {teachers.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : editTarget ? 'Save Changes' : 'Add Class'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
