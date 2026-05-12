'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Course = {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  type: string;
  price: number;
  is_free: boolean;
  total_duration: number;
  certificate_enabled: boolean;
  tags: string[];
  instructor_name: string | null;
  teacher: { user: { firstName: string; lastName: string } } | null;
  enrollments: { id: string }[];
  modules: { lessons: { id: string }[] }[];
};

const TYPE_LABELS: Record<string, string> = {
  recorded: 'Recorded',
  live:     'Live',
  hybrid:   'Hybrid',
};

const TYPE_COLORS: Record<string, string> = {
  recorded: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  live:     'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  hybrid:   'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400',
};

export default function CoursesPage() {
  const router = useRouter();
  const [courses,   setCourses]   = useState<Course[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState('');
  const [userRole,  setUserRole]  = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  const getRole = () => {
    if (typeof window === 'undefined' || !token) return '';
    try { return JSON.parse(atob(token.split('.')[1])).primaryRole || ''; } catch { return ''; }
  };

  const load = () => {
    setLoading(true);
    const params = filter ? `?type=${filter}` : '';
    fetch(`/api/courses${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setCourses(d.courses ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    const role = getRole();
    setUserRole(role);
    load();
  }, [filter]);

  const isTeacherOrAdmin = ['teacher', 'school_admin', 'principal', 'super_admin'].includes(userRole);
  const totalLessons = (c: Course) => c.modules.reduce((s, m) => s + m.lessons.length, 0);
  const instructorName = (c: Course) => c.teacher
    ? `${c.teacher.user.firstName} ${c.teacher.user.lastName}`
    : (c.instructor_name ?? 'External Instructor');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Courses</h1>
          <p className="text-sm text-surface-400 mt-0.5">Browse and enroll in courses to advance your learning.</p>
        </div>
        <div className="flex gap-2">
          {(userRole === 'student' || userRole === 'parent') && (
            <button onClick={() => router.push('/dashboard/courses/my-courses')} className="btn btn-secondary btn-sm">
              My Courses →
            </button>
          )}
          {isTeacherOrAdmin && (
            <button onClick={() => router.push('/dashboard/courses/manage')} className="btn btn-primary btn-sm">
              Manage Courses →
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[['', 'All'], ['recorded', 'Recorded'], ['live', 'Live'], ['hybrid', 'Hybrid']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${filter === val ? 'bg-brand-500 text-white' : 'bg-surface-100 dark:bg-gray-800 text-surface-500'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="card animate-pulse h-64 bg-surface-100 dark:bg-gray-800" />)}
        </div>
      ) : courses.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-surface-400 text-sm">No courses available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map(c => (
            <div
              key={c.id}
              onClick={() => router.push(`/dashboard/courses/${c.id}`)}
              className="card overflow-hidden cursor-pointer hover:shadow-md transition-all group"
            >
              <div className="aspect-video bg-surface-100 dark:bg-gray-700 overflow-hidden">
                {c.thumbnail ? (
                  <img src={c.thumbnail} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-300">
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
                    </svg>
                  </div>
                )}
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 line-clamp-2">{c.title}</h3>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${TYPE_COLORS[c.type] ?? ''}`}>{TYPE_LABELS[c.type] ?? c.type}</span>
                </div>
                <p className="text-xs text-surface-400">{instructorName(c)}</p>
                <div className="flex items-center gap-3 text-xs text-surface-400">
                  <span>{totalLessons(c)} lessons</span>
                  {c.total_duration > 0 && <span>{Math.round(c.total_duration / 60)}h</span>}
                  {c.certificate_enabled && <span className="text-amber-500 font-medium">+ Certificate</span>}
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-surface-100 dark:border-gray-700">
                  <span className="font-bold text-gray-900 dark:text-gray-100">
                    {c.is_free || Number(c.price) === 0 ? 'Free' : `₹${Number(c.price).toLocaleString()}`}
                  </span>
                  <span className="text-xs text-surface-400">{c.enrollments.length} enrolled</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
