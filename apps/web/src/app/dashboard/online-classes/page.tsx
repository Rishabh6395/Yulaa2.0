'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type OnlineClass = {
  id: string;
  title: string;
  subject: string | null;
  platform: string;
  meeting_link: string | null;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  isRecorded: boolean;
  recordingUrl: string | null;
  class?: { name: string; grade: string; section: string };
  teacher?: { user: { firstName: string; lastName: string } };
  attendances?: { id: string; status: string }[];
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  live:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  ended:     'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  cancelled: 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400',
};

export default function OnlineClassesPage() {
  const router = useRouter();
  const [classes,  setClasses]  = useState<OnlineClass[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [view,     setView]     = useState<'today' | 'upcoming' | 'past'>('today');
  const [userRole, setUserRole] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  const getRole = () => {
    if (typeof window === 'undefined' || !token) return '';
    try { return JSON.parse(atob(token.split('.')[1])).primaryRole || ''; } catch { return ''; }
  };

  const load = () => {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const params = view === 'today' ? `?date=${today}` : view === 'upcoming' ? '?upcoming=true' : '';
    fetch(`/api/online-classes${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setClasses(d.classes ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { setUserRole(getRole()); load(); }, [view]);

  const isTeacherOrAdmin = ['teacher', 'school_admin', 'principal', 'hod'].includes(userRole);

  const updateStatus = async (id: string, status: string) => {
    await fetch('/api/online-classes', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    load();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Online Classes</h1>
          <p className="text-sm text-surface-400 mt-0.5">
            {isTeacherOrAdmin ? 'Manage and host live classes for your students.' : 'Join live classes and access recordings.'}
          </p>
        </div>
        {isTeacherOrAdmin && (
          <button onClick={() => router.push('/dashboard/online-classes/create')} className="btn btn-primary">
            + Create Class
          </button>
        )}
      </div>

      <div className="flex gap-2">
        {(['today', 'upcoming', 'past'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1.5 text-sm rounded-full font-medium capitalize transition-colors ${view === v ? 'bg-brand-500 text-white' : 'bg-surface-100 dark:bg-gray-800 text-surface-500'}`}
          >
            {v === 'today' ? "Today's" : v}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="card p-4 animate-pulse h-24 bg-surface-100 dark:bg-gray-800" />)}
        </div>
      ) : classes.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-surface-400 text-sm">
            No online classes {view === 'today' ? 'scheduled for today' : view === 'upcoming' ? 'upcoming' : 'in the past'}.
          </p>
          {isTeacherOrAdmin && (
            <button onClick={() => router.push('/dashboard/online-classes/create')} className="text-brand-600 dark:text-brand-400 text-sm mt-2 hover:underline block">
              Create one now →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {classes.map(c => {
            const dt      = new Date(c.scheduledAt);
            const isLive  = c.status === 'live';
            const isPast  = dt < new Date() && c.status !== 'live';
            return (
              <div key={c.id} className={`card p-5 space-y-3 ${isLive ? 'border-2 border-emerald-400 dark:border-emerald-600' : ''}`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{c.title}</h3>
                      {isLive && (
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> LIVE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-surface-400 mt-0.5">
                      {c.subject && `${c.subject} · `}
                      {c.class ? `${c.class.grade}-${c.class.section} · ` : ''}
                      {c.teacher ? `${c.teacher.user.firstName} ${c.teacher.user.lastName} · ` : ''}
                      {dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · {dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · {c.durationMinutes} min
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs bg-surface-100 dark:bg-gray-700 px-2 py-0.5 rounded-full uppercase font-medium">{c.platform}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[c.status] ?? ''}`}>{c.status}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {c.meeting_link && !isPast && (
                    <a href={c.meeting_link} target="_blank" rel="noopener noreferrer"
                      className={`btn btn-sm ${isLive ? 'btn-primary' : 'btn-secondary'}`}>
                      {isLive ? '▶ Join Live Class' : 'Open Meeting Link'}
                    </a>
                  )}
                  {c.isRecorded && c.recordingUrl && (
                    <a href={c.recordingUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                      ▷ Watch Recording
                    </a>
                  )}
                  {isTeacherOrAdmin && c.status === 'scheduled' && !isPast && (
                    <button onClick={() => updateStatus(c.id, 'live')} className="btn btn-primary btn-sm">
                      Start Class
                    </button>
                  )}
                  {isTeacherOrAdmin && c.status === 'live' && (
                    <>
                      <button onClick={() => updateStatus(c.id, 'ended')} className="btn btn-secondary btn-sm">End Class</button>
                      <button onClick={() => router.push(`/dashboard/online-classes/${c.id}/attendance`)} className="btn btn-secondary btn-sm">
                        Mark Attendance
                      </button>
                    </>
                  )}
                  {isTeacherOrAdmin && c.status === 'ended' && (
                    <button onClick={() => router.push(`/dashboard/online-classes/${c.id}/attendance`)} className="btn btn-secondary btn-sm text-xs">
                      View Attendance
                    </button>
                  )}
                </div>

                {isTeacherOrAdmin && c.attendances && c.status !== 'scheduled' && (
                  <p className="text-xs text-surface-400">
                    Attendance: {c.attendances.filter(a => a.status === 'present').length} / {c.attendances.length} present
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
