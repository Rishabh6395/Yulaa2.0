'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

type Lesson = {
  id: string;
  title: string;
  type: string;
  contentUrl: string | null;
  meetingLink: string | null;
  duration: number | null;
  isPreview: boolean;
  scheduledAt: string | null;
  sortOrder: number;
  description: string | null;
};

type Module = {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  lessons: Lesson[];
};

type Course = {
  id: string;
  title: string;
  type: string;
  is_published: boolean;
  is_external: boolean;
  approved_at: string | null;
};

const LESSON_TYPES = [
  { value: 'video',    label: 'Video' },
  { value: 'live',     label: 'Live Session' },
  { value: 'text',     label: 'Text / Article' },
  { value: 'quiz',     label: 'Quiz' },
  { value: 'resource', label: 'Resource / PDF' },
];

const blankLesson = { title: '', type: 'video', content_url: '', meeting_link: '', duration: '', is_preview: false, scheduled_at: '', description: '' };

export default function CourseBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [course,   setCourse]   = useState<Course | null>(null);
  const [modules,  setModules]  = useState<Module[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState<string[]>([]);

  // Module form
  const [showModForm,  setShowModForm]  = useState(false);
  const [modTitle,     setModTitle]     = useState('');
  const [modDesc,      setModDesc]      = useState('');
  const [savingMod,    setSavingMod]    = useState(false);
  const [editModId,    setEditModId]    = useState<string | null>(null);

  // Lesson form per module
  const [lessonForm, setLessonForm] = useState<Record<string, typeof blankLesson>>({});
  const [showLessonForm, setShowLessonForm] = useState<Record<string, boolean>>({});
  const [savingLesson, setSavingLesson] = useState<string | null>(null);
  const [editLesson, setEditLesson] = useState<{ moduleId: string; lessonId: string } | null>(null);

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const loadCourse = useCallback(async () => {
    const [courseRes, modRes] = await Promise.all([
      fetch(`/api/courses/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`/api/courses/${id}/modules`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    const courseData = await courseRes.json();
    const modData    = await modRes.json();
    if (courseData.course) setCourse({ ...courseData.course, is_published: courseData.course.isPublished, is_external: courseData.course.isExternal, approved_at: courseData.course.approvedAt });
    setModules(modData.modules ?? []);
    setLoading(false);
  }, [id, token]);

  useEffect(() => { loadCourse(); }, [loadCourse]);

  const toggle = (modId: string) =>
    setExpanded(prev => prev.includes(modId) ? prev.filter(x => x !== modId) : [...prev, modId]);

  /* ── Module CRUD ── */
  const saveModule = async () => {
    if (!modTitle.trim()) return;
    setSavingMod(true);
    if (editModId) {
      await fetch(`/api/courses/${id}/modules`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ module_id: editModId, title: modTitle, description: modDesc }),
      });
    } else {
      await fetch(`/api/courses/${id}/modules`, {
        method: 'POST', headers,
        body: JSON.stringify({ title: modTitle, description: modDesc }),
      });
    }
    setModTitle(''); setModDesc(''); setShowModForm(false); setEditModId(null);
    setSavingMod(false);
    loadCourse();
  };

  const deleteModule = async (moduleId: string) => {
    if (!confirm('Delete this module and all its lessons?')) return;
    await fetch(`/api/courses/${id}/modules`, {
      method: 'DELETE', headers,
      body: JSON.stringify({ module_id: moduleId }),
    });
    loadCourse();
  };

  const startEditModule = (mod: Module) => {
    setEditModId(mod.id);
    setModTitle(mod.title);
    setModDesc(mod.description ?? '');
    setShowModForm(true);
  };

  /* ── Lesson CRUD ── */
  const getForm = (moduleId: string) => lessonForm[moduleId] ?? { ...blankLesson };
  const setForm = (moduleId: string, patch: Partial<typeof blankLesson>) =>
    setLessonForm(prev => ({ ...prev, [moduleId]: { ...getForm(moduleId), ...patch } }));

  const openLessonForm = (moduleId: string, lesson?: Lesson) => {
    if (lesson) {
      setEditLesson({ moduleId, lessonId: lesson.id });
      setLessonForm(prev => ({
        ...prev,
        [moduleId]: {
          title:        lesson.title,
          type:         lesson.type,
          content_url:  lesson.contentUrl ?? '',
          meeting_link: lesson.meetingLink ?? '',
          duration:     lesson.duration?.toString() ?? '',
          is_preview:   lesson.isPreview,
          scheduled_at: lesson.scheduledAt ? lesson.scheduledAt.slice(0, 16) : '',
          description:  lesson.description ?? '',
        },
      }));
    } else {
      setEditLesson(null);
      setLessonForm(prev => ({ ...prev, [moduleId]: { ...blankLesson } }));
    }
    setShowLessonForm(prev => ({ ...prev, [moduleId]: true }));
    setExpanded(prev => prev.includes(moduleId) ? prev : [...prev, moduleId]);
  };

  const cancelLessonForm = (moduleId: string) => {
    setShowLessonForm(prev => ({ ...prev, [moduleId]: false }));
    setEditLesson(null);
  };

  const saveLesson = async (moduleId: string) => {
    const f = getForm(moduleId);
    if (!f.title.trim()) return;
    setSavingLesson(moduleId);

    if (editLesson?.moduleId === moduleId) {
      await fetch(`/api/courses/${id}/modules/${moduleId}/lessons`, {
        method: 'PATCH', headers,
        body: JSON.stringify({
          lesson_id:    editLesson.lessonId,
          title:        f.title,
          type:         f.type,
          content_url:  f.content_url || null,
          meeting_link: f.meeting_link || null,
          duration:     f.duration ? Number(f.duration) : null,
          is_preview:   f.is_preview,
          scheduled_at: f.scheduled_at || null,
          description:  f.description || null,
        }),
      });
    } else {
      await fetch(`/api/courses/${id}/modules/${moduleId}/lessons`, {
        method: 'POST', headers,
        body: JSON.stringify({
          title:        f.title,
          type:         f.type,
          content_url:  f.content_url || null,
          meeting_link: f.meeting_link || null,
          duration:     f.duration ? Number(f.duration) : null,
          is_preview:   f.is_preview,
          scheduled_at: f.scheduled_at || null,
          description:  f.description || null,
        }),
      });
    }

    setSavingLesson(null);
    setShowLessonForm(prev => ({ ...prev, [moduleId]: false }));
    setEditLesson(null);
    loadCourse();
  };

  const deleteLesson = async (moduleId: string, lessonId: string) => {
    if (!confirm('Delete this lesson?')) return;
    await fetch(`/api/courses/${id}/modules/${moduleId}/lessons`, {
      method: 'DELETE', headers,
      body: JSON.stringify({ lesson_id: lessonId }),
    });
    loadCourse();
  };

  if (loading) return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="card p-4 animate-pulse h-16 bg-surface-100 dark:bg-gray-800" />
      ))}
    </div>
  );

  if (!course) return <div className="card p-10 text-center"><p className="text-surface-400">Course not found.</p></div>;

  const totalLessons = modules.reduce((s, m) => s + m.lessons.length, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button onClick={() => router.push('/dashboard/courses/manage')} className="text-xs text-surface-400 hover:text-brand-500 flex items-center gap-1 mb-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15,18 9,12 15,6"/></svg>
            Back to My Courses
          </button>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">{course.title}</h1>
          <p className="text-sm text-surface-400 mt-0.5">
            {modules.length} modules · {totalLessons} lessons
            {course.is_external && !course.approved_at && (
              <span className="ml-2 text-amber-500">· Pending approval</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {course.is_published ? (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">Published</span>
          ) : (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500">Draft</span>
          )}
        </div>
      </div>

      {/* Add Module Form */}
      {showModForm ? (
        <div className="card p-5 space-y-3 border-2 border-brand-200 dark:border-brand-800">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
            {editModId ? 'Edit Module' : 'New Module'}
          </h3>
          <div>
            <label className="label">Module Title</label>
            <input
              className="input"
              autoFocus
              placeholder="e.g. Introduction to Algebra"
              value={modTitle}
              onChange={e => setModTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveModule()}
            />
          </div>
          <div>
            <label className="label">Description (optional)</label>
            <input className="input" value={modDesc} onChange={e => setModDesc(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button onClick={saveModule} disabled={savingMod || !modTitle.trim()} className="btn btn-primary text-sm">
              {savingMod ? 'Saving…' : editModId ? 'Update Module' : 'Add Module'}
            </button>
            <button onClick={() => { setShowModForm(false); setEditModId(null); setModTitle(''); setModDesc(''); }} className="btn btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => { setShowModForm(true); setEditModId(null); setModTitle(''); setModDesc(''); }}
          className="btn btn-primary"
        >
          + Add Module
        </button>
      )}

      {/* Modules list */}
      {modules.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-surface-400 text-sm">No modules yet. Add your first module above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map((mod, mIdx) => {
            const isOpen = expanded.includes(mod.id);
            const showLF = showLessonForm[mod.id];
            return (
              <div key={mod.id} className="card overflow-hidden">
                {/* Module header */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-surface-50/50 dark:hover:bg-gray-800/30"
                  onClick={() => toggle(mod.id)}
                >
                  <span className="text-surface-300 font-mono text-xs w-5 text-center">{mIdx + 1}</span>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className={`text-surface-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  >
                    <polyline points="6,9 12,15 18,9"/>
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{mod.title}</p>
                    {mod.description && <p className="text-xs text-surface-400 truncate">{mod.description}</p>}
                  </div>
                  <span className="text-xs text-surface-400 flex-shrink-0">{mod.lessons.length} lesson{mod.lessons.length !== 1 ? 's' : ''}</span>
                  <div className="flex gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => startEditModule(mod)} className="text-xs text-brand-500 hover:underline">Edit</button>
                    <button onClick={() => deleteModule(mod.id)} className="text-xs text-red-400 hover:underline">Delete</button>
                  </div>
                </div>

                {/* Module content */}
                {isOpen && (
                  <div className="border-t border-surface-100 dark:border-gray-700">
                    {/* Lessons list */}
                    {mod.lessons.length > 0 && (
                      <div className="divide-y divide-surface-50 dark:divide-gray-700/50">
                        {mod.lessons.map((lesson, lIdx) => (
                          <div key={lesson.id} className="flex items-center gap-3 px-5 py-3">
                            <span className="text-surface-300 text-xs w-8 text-center font-mono">{mIdx + 1}.{lIdx + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{lesson.title}</p>
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium capitalize ${
                                  lesson.type === 'video'    ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400' :
                                  lesson.type === 'live'     ? 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400' :
                                  lesson.type === 'text'     ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' :
                                  lesson.type === 'quiz'     ? 'bg-purple-100 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400' :
                                                               'bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400'
                                }`}>
                                  {LESSON_TYPES.find(t => t.value === lesson.type)?.label ?? lesson.type}
                                </span>
                                {lesson.isPreview && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">Free Preview</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-0.5 text-xs text-surface-400">
                                {lesson.duration && <span>{lesson.duration} min</span>}
                                {lesson.scheduledAt && <span>Scheduled: {new Date(lesson.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>}
                                {lesson.contentUrl && <span className="truncate max-w-xs">URL set</span>}
                              </div>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <button onClick={() => openLessonForm(mod.id, lesson)} className="text-xs text-brand-500 hover:underline">Edit</button>
                              <button onClick={() => deleteLesson(mod.id, lesson.id)} className="text-xs text-red-400 hover:underline">Delete</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add / Edit Lesson Form */}
                    {showLF ? (
                      <div className="p-5 bg-surface-50/60 dark:bg-gray-800/30 space-y-3">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {editLesson?.moduleId === mod.id ? 'Edit Lesson' : 'New Lesson'}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="sm:col-span-2">
                            <label className="label">Lesson Title</label>
                            <input className="input" value={getForm(mod.id).title} onChange={e => setForm(mod.id, { title: e.target.value })} />
                          </div>
                          <div>
                            <label className="label">Type</label>
                            <select className="input" value={getForm(mod.id).type} onChange={e => setForm(mod.id, { type: e.target.value })}>
                              {LESSON_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="label">Duration (minutes)</label>
                            <input type="number" min="1" className="input" value={getForm(mod.id).duration} onChange={e => setForm(mod.id, { duration: e.target.value })} placeholder="e.g. 30" />
                          </div>

                          {/* Content URL — shown for video / resource */}
                          {['video', 'text', 'resource', 'quiz'].includes(getForm(mod.id).type) && (
                            <div className="sm:col-span-2">
                              <label className="label">Content URL</label>
                              <input className="input" type="url" placeholder="https://…" value={getForm(mod.id).content_url} onChange={e => setForm(mod.id, { content_url: e.target.value })} />
                            </div>
                          )}

                          {/* Meeting link — live sessions */}
                          {getForm(mod.id).type === 'live' && (
                            <>
                              <div className="sm:col-span-2">
                                <label className="label">Meeting Link</label>
                                <input className="input" type="url" placeholder="https://meet.google.com/…" value={getForm(mod.id).meeting_link} onChange={e => setForm(mod.id, { meeting_link: e.target.value })} />
                              </div>
                              <div>
                                <label className="label">Scheduled Date & Time</label>
                                <input className="input" type="datetime-local" value={getForm(mod.id).scheduled_at} onChange={e => setForm(mod.id, { scheduled_at: e.target.value })} />
                              </div>
                            </>
                          )}

                          <div className="sm:col-span-2">
                            <label className="label">Description (optional)</label>
                            <textarea className="input resize-none h-16" value={getForm(mod.id).description} onChange={e => setForm(mod.id, { description: e.target.value })} />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={getForm(mod.id).is_preview}
                                onChange={e => setForm(mod.id, { is_preview: e.target.checked })}
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">Free preview — visible without enrollment</span>
                            </label>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveLesson(mod.id)}
                            disabled={savingLesson === mod.id || !getForm(mod.id).title.trim()}
                            className="btn btn-primary text-sm"
                          >
                            {savingLesson === mod.id ? 'Saving…' : editLesson?.moduleId === mod.id ? 'Update Lesson' : 'Add Lesson'}
                          </button>
                          <button onClick={() => cancelLessonForm(mod.id)} className="btn btn-secondary text-sm">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="px-5 py-3 border-t border-surface-50 dark:border-gray-700/50">
                        <button
                          onClick={() => openLessonForm(mod.id)}
                          className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400 font-medium flex items-center gap-1"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          Add Lesson
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
