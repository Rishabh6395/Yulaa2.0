'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormConfig } from '@/hooks/useFormConfig';

type Course = {
  id: string;
  title: string;
  type: string;
  price: number;
  is_free: boolean;
  is_published: boolean;
  is_external: boolean;
  approved_at: string | null;
  enrollments: { id: string }[];
  modules: { lessons: { id: string }[] }[];
};

export default function ManageCoursesPage() {
  const fc      = useFormConfig('create_course_form');
  const router  = useRouter();
  const [courses,   setCourses]   = useState<Course[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');
  const [form, setForm] = useState({
    title: '', description: '', type: 'recorded', price: '0',
    is_free: false, certificate_enabled: false, is_external: false, tags: '',
  });

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const load = () => {
    setLoading(true);
    fetch('/api/courses?mine=true', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setCourses(d.courses ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    const res = await fetch('/api/courses', {
      method: 'POST', headers,
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        type: form.type,
        price: form.is_free ? 0 : Number(form.price),
        is_free: form.is_free,
        certificate_enabled: form.certificate_enabled,
        is_external: form.is_external,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Failed'); setSaving(false); return; }
    setShowForm(false);
    setForm({ title: '', description: '', type: 'recorded', price: '0', is_free: false, certificate_enabled: false, is_external: false, tags: '' });
    load();
    setSaving(false);
  };

  const togglePublish = async (id: string, current: boolean) => {
    await fetch('/api/courses', {
      method: 'PATCH', headers,
      body: JSON.stringify({ id, is_published: !current }),
    });
    load();
  };

  const totalLessons = (c: Course) => c.modules.reduce((s, m) => s + m.lessons.length, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">My Courses</h1>
          <p className="text-sm text-surface-400 mt-0.5">Create and manage courses for your students.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">+ New Course</button>
      </div>

      {showForm && (
        <div className="card p-6 space-y-4 border-2 border-brand-200 dark:border-brand-800">
          <h2 className="font-semibold">New Course</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fc.visible('title') && <div className="col-span-2">
              <label className="label">{fc.label('title')}</label>
              <input required={fc.required('title')} className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>}
            {fc.visible('description') && <div className="col-span-2">
              <label className="label">{fc.label('description')}</label>
              <textarea className="input resize-none h-20" required={fc.required('description')} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>}
            {fc.visible('type') && <div>
              <label className="label">{fc.label('type')}</label>
              <select className="input" required={fc.required('type')} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="recorded">Recorded</option>
                <option value="live">Live</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>}
            {fc.visible('price') && <div>
              <label className="label">{fc.label('price')}</label>
              <input type="number" min="0" className="input" required={fc.required('price')} disabled={form.is_free} value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
            </div>}
            {fc.visible('tags') && <div>
              <label className="label">{fc.label('tags')}</label>
              <input className="input" required={fc.required('tags')} placeholder="maths, class10, cbse" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
            </div>}
            <div className="flex items-end pb-2 gap-4">
              {fc.visible('isFree') && <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_free} onChange={e => setForm(f => ({ ...f, is_free: e.target.checked }))} />
                <span className="text-sm">{fc.label('isFree')}</span>
              </label>}
              {fc.visible('certificateEnabled') && <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.certificate_enabled} onChange={e => setForm(f => ({ ...f, certificate_enabled: e.target.checked }))} />
                <span className="text-sm">{fc.label('certificateEnabled')}</span>
              </label>}
            </div>
            {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}
            <div className="col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Creating…' : 'Create Course'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="card p-4 animate-pulse h-20 bg-surface-100 dark:bg-gray-800" />)}
        </div>
      ) : courses.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-surface-400 text-sm">No courses yet. Create your first course.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-50 dark:bg-gray-800 border-b border-surface-200 dark:border-gray-700">
              <tr>
                <th className="text-left p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Course</th>
                <th className="text-left p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Type</th>
                <th className="text-left p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Price</th>
                <th className="text-left p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Enrolled</th>
                <th className="text-left p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Lessons</th>
                <th className="text-left p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Status</th>
                <th className="text-left p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-gray-700">
              {courses.map(c => (
                <tr key={c.id} className="hover:bg-surface-50/50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="p-4">
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{c.title}</p>
                    {c.is_external && !c.approved_at && <p className="text-xs text-amber-500">Pending approval</p>}
                  </td>
                  <td className="p-4 text-sm text-surface-400 capitalize">{c.type}</td>
                  <td className="p-4 text-sm text-gray-700 dark:text-gray-300">{c.is_free ? 'Free' : `₹${Number(c.price).toLocaleString()}`}</td>
                  <td className="p-4 text-sm font-medium text-gray-700 dark:text-gray-300">{c.enrollments.length}</td>
                  <td className="p-4 text-sm text-gray-700 dark:text-gray-300">{totalLessons(c)}</td>
                  <td className="p-4">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.is_published ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500'}`}>
                      {c.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-3">
                      <button onClick={() => router.push(`/dashboard/courses/manage/${c.id}`)} className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium">
                        Build
                      </button>
                      <button onClick={() => togglePublish(c.id, c.is_published)} className="text-xs text-surface-500 hover:underline">
                        {c.is_published ? 'Unpublish' : 'Publish'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
