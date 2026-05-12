'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type Lesson = {
  id: string;
  title: string;
  type: string;
  duration: number | null;
  is_preview: boolean;
  content_url: string | null;
  meeting_link: string | null;
  scheduled_at: string | null;
};

type Module = {
  id: string;
  title: string;
  description: string | null;
  lessons: Lesson[];
};

type Course = {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  type: string;
  price: number;
  is_free: boolean;
  certificate_enabled: boolean;
  total_duration: number;
  tags: string[];
  instructor_name: string | null;
  teacher: { user: { firstName: string; lastName: string; avatar_url: string | null } } | null;
  modules: Module[];
  enrolled_count: number;
  is_enrolled: boolean;
  enrollment: {
    id: string;
    progress_pct: number;
    payment_status: string;
    completed_at: string | null;
    certificate_no: string | null;
  } | null;
};

const LESSON_ICONS: Record<string, string> = {
  video:    '▷',
  live:     '◉',
  document: '⊞',
  quiz:     '✎',
};

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [course,    setCourse]    = useState<Course | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [expanded,  setExpanded]  = useState<string[]>([]);

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    setLoading(true);
    fetch(`/api/courses/${courseId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setCourse(d.course); if (d.course?.modules?.length) setExpanded([d.course.modules[0].id]); setLoading(false); })
      .catch(() => setLoading(false));
  }, [courseId]);

  const enroll = async () => {
    setEnrolling(true);
    const res = await fetch(`/api/courses/${courseId}/enroll`, { method: 'POST', headers, body: JSON.stringify({}) });
    const data = await res.json();
    if (res.ok) {
      setCourse(prev => prev ? { ...prev, is_enrolled: true, enrollment: data.enrollment } : prev);
    }
    setEnrolling(false);
  };

  const markComplete = async (lessonId: string) => {
    const res = await fetch(`/api/courses/${courseId}/progress`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ lesson_id: lessonId }),
    });
    const data = await res.json();
    if (res.ok && course) {
      setCourse(prev => prev ? { ...prev, enrollment: { ...prev.enrollment!, progress_pct: data.progress_pct, certificate_no: data.certificate_no } } : prev);
    }
  };

  if (loading) return (
    <div className="space-y-4 max-w-3xl">
      <div className="card animate-pulse h-48 bg-surface-100 dark:bg-gray-800" />
      <div className="card animate-pulse h-32 bg-surface-100 dark:bg-gray-800" />
    </div>
  );

  if (!course) return <div className="card p-10 text-center"><p className="text-surface-400">Course not found.</p></div>;

  const instructorName = course.teacher
    ? `${course.teacher.user.firstName} ${course.teacher.user.lastName}`
    : (course.instructor_name ?? 'External Instructor');
  const isFree = course.is_free || Number(course.price) === 0;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <button onClick={() => router.push('/dashboard/courses')} className="text-surface-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1 text-sm">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15,18 9,12 15,6"/></svg>
        Back to Courses
      </button>

      {/* Hero */}
      <div className="card overflow-hidden">
        {course.thumbnail && (
          <div className="aspect-video overflow-hidden">
            <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1">
              <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">{course.title}</h1>
              <p className="text-sm text-surface-400 mt-1">{instructorName} · {course.enrolled_count} students enrolled</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{isFree ? 'Free' : `₹${Number(course.price).toLocaleString()}`}</p>
            </div>
          </div>

          {course.description && <p className="text-sm text-gray-600 dark:text-gray-400">{course.description}</p>}

          <div className="flex flex-wrap gap-2">
            {course.tags.map(t => <span key={t} className="text-xs bg-surface-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{t}</span>)}
          </div>

          <div className="flex items-center gap-4 text-sm text-surface-400">
            {course.total_duration > 0 && <span>{Math.round(course.total_duration / 60)}h total</span>}
            <span>{course.modules.reduce((s, m) => s + m.lessons.length, 0)} lessons</span>
            {course.certificate_enabled && <span className="text-amber-500 font-medium">✓ Certificate on completion</span>}
          </div>

          {/* Enrollment CTA */}
          {!course.is_enrolled ? (
            <button onClick={enroll} disabled={enrolling} className="btn btn-primary w-full">
              {enrolling ? 'Enrolling…' : isFree ? 'Enroll for Free' : `Enroll for ₹${Number(course.price).toLocaleString()}`}
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-emerald-600 font-medium">✓ Enrolled</span>
                {course.enrollment?.progress_pct !== undefined && (
                  <span className="text-surface-400">{Math.round(course.enrollment.progress_pct)}% complete</span>
                )}
              </div>
              {course.enrollment?.progress_pct !== undefined && (
                <div className="h-2 bg-surface-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${course.enrollment.progress_pct}%` }} />
                </div>
              )}
              {course.enrollment?.certificate_no && (
                <p className="text-sm text-amber-600 font-medium">🎓 Certificate: {course.enrollment.certificate_no}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Course Content */}
      <div className="card p-6 space-y-3">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Course Content</h2>
        {course.modules.map(mod => (
          <div key={mod.id} className="border border-surface-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpanded(prev => prev.includes(mod.id) ? prev.filter(id => id !== mod.id) : [...prev, mod.id])}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-surface-50 dark:hover:bg-gray-800/40 transition-colors"
            >
              <div>
                <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{mod.title}</p>
                <p className="text-xs text-surface-400">{mod.lessons.length} lessons</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                className={`flex-shrink-0 transition-transform ${expanded.includes(mod.id) ? 'rotate-180' : ''}`}>
                <polyline points="6,9 12,15 18,9"/>
              </svg>
            </button>
            {expanded.includes(mod.id) && (
              <div className="border-t border-surface-200 dark:border-gray-700 divide-y divide-surface-100 dark:divide-gray-700">
                {mod.lessons.map(lesson => (
                  <div key={lesson.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-base text-surface-400 w-5 flex-shrink-0">{LESSON_ICONS[lesson.type] ?? '▷'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{lesson.title}</p>
                      {lesson.duration && <p className="text-xs text-surface-400">{lesson.duration} min</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {lesson.is_preview && <span className="text-xs text-brand-600 font-medium">Preview</span>}
                      {course.is_enrolled && lesson.content_url && (
                        <a href={lesson.content_url} target="_blank" rel="noopener noreferrer"
                          onClick={() => markComplete(lesson.id)}
                          className="text-xs text-brand-600 dark:text-brand-400 hover:underline">
                          Watch
                        </a>
                      )}
                      {course.is_enrolled && lesson.meeting_link && (
                        <a href={lesson.meeting_link} target="_blank" rel="noopener noreferrer"
                          onClick={() => markComplete(lesson.id)}
                          className="text-xs text-emerald-600 hover:underline">
                          Join Live
                        </a>
                      )}
                      {!course.is_enrolled && !lesson.is_preview && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-surface-300">
                          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
