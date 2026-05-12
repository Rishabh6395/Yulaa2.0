'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Enrollment = {
  id: string;
  progress_pct: number;
  completed_at: string | null;
  certificate_no: string | null;
  payment_status: string;
  enrolled_at: string;
  course: {
    id: string;
    title: string;
    thumbnail: string | null;
    type: string;
    certificate_enabled: boolean;
    teacher: { user: { firstName: string; lastName: string } } | null;
    instructor_name: string | null;
  };
};

export default function MyCoursesPage() {
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading,     setLoading]     = useState(true);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  useEffect(() => {
    setLoading(true);
    fetch('/api/courses/my-enrollments', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setEnrollments(d.enrollments ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const instructorName = (e: Enrollment) => e.course.teacher
    ? `${e.course.teacher.user.firstName} ${e.course.teacher.user.lastName}`
    : (e.course.instructor_name ?? 'External Instructor');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">My Courses</h1>
          <p className="text-sm text-surface-400 mt-0.5">Your enrolled courses and learning progress.</p>
        </div>
        <button onClick={() => router.push('/dashboard/courses')} className="btn btn-secondary btn-sm">
          ← Browse Courses
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="card animate-pulse h-40 bg-surface-100 dark:bg-gray-800" />)}
        </div>
      ) : enrollments.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-surface-400 text-sm">No courses enrolled yet.</p>
          <button onClick={() => router.push('/dashboard/courses')} className="text-brand-600 dark:text-brand-400 text-sm mt-2 hover:underline block">
            Explore available courses →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {enrollments.map(e => {
            const isComplete = e.progress_pct >= 100;
            return (
              <div
                key={e.id}
                onClick={() => router.push(`/dashboard/courses/${e.course.id}`)}
                className="card overflow-hidden cursor-pointer hover:shadow-md transition-all"
              >
                {e.course.thumbnail && (
                  <div className="h-32 overflow-hidden">
                    <img src={e.course.thumbnail} alt={e.course.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 line-clamp-1">{e.course.title}</h3>
                    <p className="text-xs text-surface-400 mt-0.5">{instructorName(e)}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-surface-400">
                      <span>{Math.round(e.progress_pct)}% complete</span>
                      {isComplete && <span className="text-emerald-500 font-medium">✓ Completed</span>}
                    </div>
                    <div className="h-1.5 bg-surface-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${e.progress_pct}%` }} />
                    </div>
                  </div>

                  {e.certificate_no && (
                    <p className="text-xs text-amber-600 font-medium">🎓 Certificate: {e.certificate_no}</p>
                  )}
                  {!e.certificate_no && isComplete && e.course.certificate_enabled && (
                    <p className="text-xs text-surface-400">Certificate being generated…</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
