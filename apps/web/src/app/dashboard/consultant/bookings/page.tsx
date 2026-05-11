'use client';

import { useEffect, useState } from 'react';

type Booking = {
  id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  mode: string;
  meeting_link: string | null;
  status: string;
  session_fee: number | null;
  payment_status: string;
  parent: { id: string; name: string; email: string };
  student: { id: string; firstName: string; lastName: string } | null;
  rating: { rating: number; review: string | null } | null;
};

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  cancelled: 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400',
};

export default function ConsultantBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('');
  const [link,     setLink]     = useState<Record<string, string>>({});

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const load = () => {
    setLoading(true);
    const params = filter ? `?status=${filter}` : '';
    fetch(`/api/career-sessions/bookings${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setBookings(d.bookings ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  const action = async (id: string, act: string, extra: Record<string, string> = {}) => {
    await fetch('/api/career-sessions/bookings', {
      method: 'PATCH', headers,
      body: JSON.stringify({ id, action: act, ...extra }),
    });
    load();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">My Bookings</h1>
        <p className="text-sm text-surface-400 mt-0.5">Manage incoming session bookings from parents.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['', 'pending', 'confirmed', 'completed', 'cancelled'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-sm rounded-full font-medium capitalize transition-colors ${filter === s ? 'bg-brand-500 text-white' : 'bg-surface-100 dark:bg-gray-800 text-surface-500'}`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="card p-4 animate-pulse h-28 bg-surface-100 dark:bg-gray-800" />)}
        </div>
      ) : bookings.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-surface-400 text-sm">No bookings found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map(b => (
            <div key={b.id} className="card p-5 space-y-3">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{b.parent.name}</p>
                  <p className="text-xs text-surface-400">
                    {new Date(b.session_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · {b.start_time}–{b.end_time} · <span className="capitalize">{b.mode}</span>
                  </p>
                  {b.student && (
                    <p className="text-xs text-surface-400">For: {b.student.firstName} {b.student.lastName}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[b.status] ?? ''}`}>
                    {b.status}
                  </span>
                  {b.session_fee && <span className="text-sm font-bold">₹{b.session_fee.toLocaleString()}</span>}
                </div>
              </div>

              {b.status === 'pending' && (
                <div className="flex gap-2 flex-wrap">
                  <div className="flex gap-2 flex-1 min-w-40">
                    <input
                      className="input flex-1 text-sm"
                      placeholder="Meeting link (optional)"
                      value={link[b.id] ?? ''}
                      onChange={e => setLink(l => ({ ...l, [b.id]: e.target.value }))}
                    />
                    <button
                      onClick={() => action(b.id, 'confirm', link[b.id] ? { meeting_link: link[b.id] } : {})}
                      className="btn btn-primary btn-sm"
                    >
                      Confirm
                    </button>
                  </div>
                  <button onClick={() => action(b.id, 'cancel')} className="btn btn-secondary btn-sm text-red-500">Decline</button>
                </div>
              )}

              {b.status === 'confirmed' && (
                <div className="flex gap-2">
                  <button onClick={() => action(b.id, 'complete')} className="btn btn-primary btn-sm">Mark Completed</button>
                  <button onClick={() => action(b.id, 'cancel')} className="btn btn-secondary btn-sm text-red-500">Cancel</button>
                </div>
              )}

              {b.rating && (
                <div className="flex items-center gap-2 text-sm text-surface-400">
                  <span>Rated</span>
                  <span className="flex items-center gap-0.5 text-amber-400 font-bold">
                    {'★'.repeat(b.rating.rating)}{'☆'.repeat(5 - b.rating.rating)}
                  </span>
                  {b.rating.review && <span className="italic">"{b.rating.review}"</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
