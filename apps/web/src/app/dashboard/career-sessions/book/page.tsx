'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

type Consultant = {
  id: string;
  name: string;
  specialization: string | null;
  session_fee: number | null;
  bio: string | null;
  available_modes: string[];
  avg_rating: number | null;
};

type Slot = {
  id: string;
  day_of_week: number | null;
  date: string | null;
  start_time: string;
  end_time: string;
  mode: string;
  max_bookings: number;
  bookings: { id: string }[];
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function BookPageInner() {
  const params    = useSearchParams();
  const router    = useRouter();
  const consultantId = params.get('consultant') ?? '';

  const [consultant, setConsultant] = useState<Consultant | null>(null);
  const [slots,      setSlots]      = useState<Slot[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [sessionDate,  setSessionDate]  = useState('');
  const [mode,         setMode]         = useState('');
  const [notes,        setNotes]        = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState('');

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    if (!consultantId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/career-sessions?id=${consultantId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`/api/career-sessions/availability?consultant_id=${consultantId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([cd, sd]) => {
      const c = cd.consultants?.[0] ?? null;
      setConsultant(c);
      setSlots(sd.slots ?? []);
      if (c?.available_modes?.length === 1) setMode(c.available_modes[0]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [consultantId]);

  const selectedSlotObj = slots.find(s => s.id === selectedSlot);

  const getNextDate = (dayOfWeek: number): string => {
    const today = new Date();
    const diff  = (dayOfWeek - today.getDay() + 7) % 7 || 7;
    const next  = new Date(today);
    next.setDate(today.getDate() + diff);
    return next.toISOString().slice(0, 10);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !mode) { setError('Please select a slot and session mode.'); return; }
    setSubmitting(true); setError('');

    const slot = slots.find(s => s.id === selectedSlot);
    const date = slot?.date ?? (slot?.day_of_week != null ? getNextDate(slot.day_of_week) : sessionDate);

    const res = await fetch('/api/career-sessions/bookings', {
      method: 'POST', headers,
      body: JSON.stringify({
        consultant_id:   consultantId,
        availability_id: selectedSlot,
        session_date:    date,
        start_time:      slot?.start_time ?? '',
        end_time:        slot?.end_time ?? '',
        mode,
        notes,
      }),
    });

    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Booking failed.'); setSubmitting(false); return; }
    router.push('/dashboard/career-sessions/my-bookings');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="card p-6 animate-pulse h-32 bg-surface-100 dark:bg-gray-800" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="card p-4 animate-pulse h-20 bg-surface-100 dark:bg-gray-800" />)}
        </div>
      </div>
    );
  }

  if (!consultant) {
    return (
      <div className="card p-10 text-center">
        <p className="text-surface-400">Consultant not found.</p>
        <button onClick={() => router.push('/dashboard/career-sessions')} className="btn btn-secondary btn-sm mt-4">← Back</button>
      </div>
    );
  }

  const activeSlots = slots.filter(s => {
    if (!s.id) return false;
    const remaining = s.max_bookings - s.bookings.length;
    return remaining > 0;
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/dashboard/career-sessions')} className="text-surface-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15,18 9,12 15,6"/></svg>
        </button>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Book a Session</h1>
          <p className="text-sm text-surface-400 mt-0.5">with {consultant.name}</p>
        </div>
      </div>

      {/* Consultant summary */}
      <div className="card p-5 flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-xl flex-shrink-0">
          {consultant.name.charAt(0)}
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">{consultant.name}</h2>
          <p className="text-sm text-surface-400">{consultant.specialization ?? 'Career Counsellor'}</p>
          {consultant.bio && <p className="text-sm text-surface-500 dark:text-gray-400 mt-1 line-clamp-2">{consultant.bio}</p>}
          <div className="flex items-center gap-3 mt-2">
            {consultant.avg_rating && (
              <span className="text-sm text-amber-500 font-medium">★ {consultant.avg_rating.toFixed(1)}</span>
            )}
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {consultant.session_fee ? `₹${consultant.session_fee.toLocaleString()} / session` : 'Free'}
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Slot selection */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Select Available Slot</h3>
          {activeSlots.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="text-surface-400 text-sm">No available slots at this time. Check back later.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeSlots.map(slot => {
                const isSelected = selectedSlot === slot.id;
                const label = slot.day_of_week != null
                  ? `${DAYS[slot.day_of_week]}s`
                  : new Date(slot.date!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                const spotsLeft = slot.max_bookings - slot.bookings.length;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => { setSelectedSlot(slot.id); if (!mode && slot.mode !== 'both') setMode(slot.mode); }}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${isSelected ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40' : 'border-surface-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-700'}`}
                  >
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{label}</p>
                    <p className="text-xs text-surface-400 mt-0.5">{slot.start_time} – {slot.end_time}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs bg-surface-100 dark:bg-gray-700 px-1.5 py-0.5 rounded capitalize">{slot.mode}</span>
                      <span className="text-xs text-surface-400">{spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Specific date if weekly slot */}
        {selectedSlotObj?.day_of_week != null && (
          <div>
            <label className="label">Session Date</label>
            <p className="text-xs text-surface-400 mb-1">Select the specific {DAYS[selectedSlotObj.day_of_week]} you want to book</p>
            <input
              required
              type="date"
              className="input"
              value={sessionDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={e => setSessionDate(e.target.value)}
            />
          </div>
        )}

        {/* Mode */}
        <div>
          <label className="label">Session Mode</label>
          <div className="flex gap-3">
            {(selectedSlotObj?.mode === 'both' ? ['online', 'offline'] : [selectedSlotObj?.mode ?? '']).filter(Boolean).map(m => (
              <label key={m} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value={m} checked={mode === m} onChange={() => setMode(m)} />
                <span className="text-sm capitalize">{m}</span>
              </label>
            ))}
            {!selectedSlotObj && consultant.available_modes.map(m => (
              <label key={m} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value={m} checked={mode === m} onChange={() => setMode(m)} />
                <span className="text-sm capitalize">{m}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="label">Notes (optional)</label>
          <textarea
            className="input resize-none h-24"
            placeholder="Describe what you'd like to discuss in the session…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        {/* Fee notice */}
        {consultant.session_fee && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Session fee: <strong>₹{consultant.session_fee.toLocaleString()}</strong> — payment will be collected after confirmation.
            </p>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={submitting || activeSlots.length === 0} className="btn btn-primary">
            {submitting ? 'Booking…' : 'Confirm Booking'}
          </button>
          <button type="button" onClick={() => router.push('/dashboard/career-sessions')} className="btn btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default function BookSessionPage() {
  return (
    <Suspense fallback={<div className="card p-10 text-center animate-pulse">Loading…</div>}>
      <BookPageInner />
    </Suspense>
  );
}
