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
  consultant: { id: string; name: string; specialization: string | null };
  rating: { rating: number; review: string | null } | null;
};

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  cancelled: 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400',
};

export default function MyBookingsPage() {
  const [bookings,   setBookings]   = useState<Booking[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState('');
  const [ratingForm, setRatingForm] = useState<Record<string, { rating: number; review: string }>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

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

  const cancel = async (id: string) => {
    await fetch('/api/career-sessions/bookings', {
      method: 'PATCH', headers,
      body: JSON.stringify({ id, action: 'cancel' }),
    });
    load();
  };

  const submitRating = async (bookingId: string) => {
    const form = ratingForm[bookingId];
    if (!form?.rating) return;
    setSubmitting(bookingId);
    await fetch('/api/career-sessions/ratings', {
      method: 'POST', headers,
      body: JSON.stringify({ booking_id: bookingId, rating: form.rating, review: form.review }),
    });
    setRatingForm(prev => { const n = { ...prev }; delete n[bookingId]; return n; });
    setSubmitting(null);
    load();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">My Bookings</h1>
        <p className="text-sm text-surface-400 mt-0.5">Track your career counselling sessions.</p>
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
          <a href="/dashboard/career-sessions" className="text-brand-600 dark:text-brand-400 text-sm mt-2 inline-block hover:underline">
            Browse consultants →
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map(b => (
            <div key={b.id} className="card p-5 space-y-3">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{b.consultant.name}</p>
                  <p className="text-xs text-surface-400">{b.consultant.specialization ?? 'Career Counsellor'}</p>
                  <p className="text-xs text-surface-400 mt-1">
                    {new Date(b.session_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {' · '}{b.start_time}–{b.end_time} · <span className="capitalize">{b.mode}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[b.status] ?? ''}`}>
                    {b.status}
                  </span>
                  {b.session_fee && <span className="text-sm font-bold">₹{b.session_fee.toLocaleString()}</span>}
                </div>
              </div>

              {b.status === 'confirmed' && b.meeting_link && (
                <a
                  href={b.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-brand-600 dark:text-brand-400 hover:underline"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  Join Meeting
                </a>
              )}

              {(b.status === 'pending' || b.status === 'confirmed') && (
                <button onClick={() => cancel(b.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">
                  Cancel Booking
                </button>
              )}

              {b.status === 'completed' && !b.rating && (
                <div className="border-t border-surface-100 dark:border-gray-700 pt-3 space-y-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Rate this session</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => setRatingForm(prev => ({ ...prev, [b.id]: { ...prev[b.id], rating: star, review: prev[b.id]?.review ?? '' } }))}
                        className={`text-2xl transition-colors ${(ratingForm[b.id]?.rating ?? 0) >= star ? 'text-amber-400' : 'text-surface-300 hover:text-amber-300'}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <input
                    className="input text-sm"
                    placeholder="Write a review (optional)…"
                    value={ratingForm[b.id]?.review ?? ''}
                    onChange={e => setRatingForm(prev => ({ ...prev, [b.id]: { ...prev[b.id], review: e.target.value, rating: prev[b.id]?.rating ?? 0 } }))}
                  />
                  <button
                    disabled={!ratingForm[b.id]?.rating || submitting === b.id}
                    onClick={() => submitRating(b.id)}
                    className="btn btn-primary btn-sm"
                  >
                    {submitting === b.id ? 'Submitting…' : 'Submit Rating'}
                  </button>
                </div>
              )}

              {b.rating && (
                <div className="flex items-center gap-2 text-sm text-surface-400 border-t border-surface-100 dark:border-gray-700 pt-2">
                  <span>Your rating:</span>
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
