'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Session = {
  id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  mode: string;
  meeting_link: string | null;
  status: string;
  session_fee: number | null;
  parent: { name: string; email: string };
  student: { firstName: string; lastName: string } | null;
};

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  cancelled: 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400',
};

export default function ConsultantSessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [view,     setView]     = useState<'upcoming' | 'past'>('upcoming');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  useEffect(() => {
    setLoading(true);
    fetch('/api/career-sessions/bookings?status=confirmed', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setSessions(d.bookings ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  const upcoming = sessions.filter(s => s.session_date >= today);
  const past     = sessions.filter(s => s.session_date < today);
  const displayed = view === 'upcoming' ? upcoming : past;

  const grouped: Record<string, Session[]> = {};
  for (const s of displayed) {
    const date = s.session_date;
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(s);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">My Sessions</h1>
          <p className="text-sm text-surface-400 mt-0.5">Confirmed sessions grouped by date.</p>
        </div>
        <button onClick={() => router.push('/dashboard/consultant/bookings')} className="btn btn-secondary btn-sm">
          Manage Bookings →
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setView('upcoming')}
          className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${view === 'upcoming' ? 'bg-brand-500 text-white' : 'bg-surface-100 dark:bg-gray-800 text-surface-500'}`}
        >
          Upcoming ({upcoming.length})
        </button>
        <button
          onClick={() => setView('past')}
          className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${view === 'past' ? 'bg-brand-500 text-white' : 'bg-surface-100 dark:bg-gray-800 text-surface-500'}`}
        >
          Past ({past.length})
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="card p-4 animate-pulse h-20 bg-surface-100 dark:bg-gray-800" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-surface-400 text-sm">
            {view === 'upcoming' ? 'No upcoming sessions. ' : 'No past sessions. '}
          </p>
          {view === 'upcoming' && (
            <button onClick={() => router.push('/dashboard/consultant/availability')} className="text-brand-600 dark:text-brand-400 text-sm mt-1 hover:underline">
              Set your availability →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([date, daySlots]) => (
            <div key={date}>
              <h2 className="text-sm font-semibold text-surface-400 uppercase tracking-wider mb-3">
                {new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h2>
              <div className="space-y-3">
                {daySlots.map(s => (
                  <div key={s.id} className="card p-4 flex items-start gap-4">
                    <div className="text-center min-w-[52px]">
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{s.start_time}</p>
                      <p className="text-xs text-surface-400">{s.end_time}</p>
                    </div>
                    <div className="w-px self-stretch bg-surface-200 dark:bg-gray-700" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{s.parent.name}</p>
                          {s.student && (
                            <p className="text-xs text-surface-400">For: {s.student.firstName} {s.student.lastName}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[s.status] ?? ''}`}>{s.status}</span>
                          <span className="text-xs bg-surface-100 dark:bg-gray-700 px-2 py-0.5 rounded-full capitalize">{s.mode}</span>
                        </div>
                      </div>
                      {s.meeting_link && (
                        <a href={s.meeting_link} target="_blank" rel="noopener noreferrer"
                          className="mt-1.5 inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:underline">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                          Join Meeting
                        </a>
                      )}
                    </div>
                    {s.session_fee && (
                      <span className="text-sm font-bold text-gray-900 dark:text-gray-100 flex-shrink-0">₹{s.session_fee.toLocaleString()}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
