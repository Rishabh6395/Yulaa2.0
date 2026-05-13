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

function ErrorBox({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-start gap-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
      <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span className="font-medium">{message}</span>
    </div>
  );
}

function BookPageInner() {
  const params       = useSearchParams();
  const router       = useRouter();
  const consultantId = params.get('consultant') ?? '';

  const [consultant,    setConsultant]    = useState<Consultant | null>(null);
  const [slots,         setSlots]         = useState<Slot[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [loadError,     setLoadError]     = useState('');
  const [selectedSlot,  setSelectedSlot]  = useState('');
  const [sessionDate,   setSessionDate]   = useState('');
  const [mode,          setMode]          = useState('');
  const [notes,         setNotes]         = useState('');
  const [submitting,    setSubmitting]    = useState(false);
  const [error,         setError]         = useState('');

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    if (!consultantId) {
      setLoadError('No consultant specified. Please go back and select a consultant.');
      setLoading(false);
      return;
    }
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
    }).catch(() => {
      setLoadError('Failed to load consultant details. Please go back and try again.');
      setLoading(false);
    });
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
    setError('');

    if (!selectedSlot)
      return setError('Please select an available time slot before booking.');
    if (!mode)
      return setError('Please select a session mode — Online or Offline.');
    if (selectedSlotObj?.day_of_week != null && !sessionDate)
      return setError(`Please choose a specific ${DAYS[selectedSlotObj.day_of_week]} date for your session.`);
    if (sessionDate && new Date(sessionDate) < new Date(new Date().toISOString().slice(0, 10)))
      return setError('The selected date is in the past. Please choose a future date for your session.');

    setSubmitting(true);
    try {
      const slot = slots.find(s => s.id === selectedSlot);
      const date = slot?.date ?? (slot?.day_of_week != null ? getNextDate(slot.day_of_week) : sessionDate);

      const res = await fetch('/api/career-sessions/bookings', {
        method: 'POST',
        headers,
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
      if (!res.ok) {
        if (res.status === 409) return setError(`Booking conflict: ${data.error}`);
        if (res.status === 404) return setError(`${data.error} Please go back and try a different consultant or slot.`);
        return setError(data.error || 'Booking failed. Please try again.');
      }
      router.push('/dashboard/career-sessions/my-bookings');
    } catch {
      setError('Could not connect to the server. Please check your internet connection and try again.');
    } finally {
      setSubmitting(false);
    }
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

  if (loadError) {
    return (
      <div className="card p-10 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center mx-auto">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <p className="text-sm font-medium text-red-600 dark:text-red-400">{loadError}</p>
        <button onClick={() => router.push('/dashboard/career-sessions')} className="btn btn-secondary btn-sm">← Back to Career Sessions</button>
      </div>
    );
  }

  if (!consultant) {
    return (
      <div className="card p-10 text-center space-y-3">
        <p className="text-surface-400">Consultant not found. They may no longer be available.</p>
        <button onClick={() => router.push('/dashboard/career-sessions')} className="btn btn-secondary btn-sm">← Back to Career Sessions</button>
      </div>
    );
  }

  const activeSlots = slots.filter(s => {
    if (!s.id) return false;
    return (s.max_bookings - s.bookings.length) > 0;
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/dashboard/career-sessions')}
          className="text-surface-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
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
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Select Available Slot <span className="text-red-500">*</span>
          </h3>
          <p className="text-xs text-surface-400 mb-3">Choose a time slot that works for you</p>
          {activeSlots.length === 0 ? (
            <div className="card p-6 text-center space-y-2">
              <p className="text-sm font-medium text-surface-500">No available slots at this time.</p>
              <p className="text-xs text-surface-400">The consultant has not added any open slots yet. Check back later or contact the school.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeSlots.map(slot => {
                const isSelected  = selectedSlot === slot.id;
                const label       = slot.day_of_week != null
                  ? `Every ${DAYS[slot.day_of_week]}`
                  : new Date(slot.date!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                const spotsLeft   = slot.max_bookings - slot.bookings.length;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => {
                      setSelectedSlot(slot.id);
                      setError('');
                      if (!mode && slot.mode !== 'both') setMode(slot.mode);
                    }}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 ring-2 ring-brand-200 dark:ring-brand-800'
                        : 'border-surface-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-700'
                    }`}
                  >
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{label}</p>
                    <p className="text-xs text-surface-400 mt-0.5">{slot.start_time} – {slot.end_time}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs bg-surface-100 dark:bg-gray-700 px-1.5 py-0.5 rounded capitalize">{slot.mode}</span>
                      <span className={`text-xs font-medium ${spotsLeft <= 2 ? 'text-amber-600 dark:text-amber-400' : 'text-surface-400'}`}>
                        {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Specific date for weekly slots */}
        {selectedSlotObj?.day_of_week != null && (
          <div>
            <label className="label">
              Session Date <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-surface-400 mb-1">
              Select the specific {DAYS[selectedSlotObj.day_of_week]} you want to book
            </p>
            <input
              type="date"
              className="input"
              value={sessionDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={e => { setSessionDate(e.target.value); setError(''); }}
            />
            {!sessionDate && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Please pick a date to continue.</p>
            )}
          </div>
        )}

        {/* Mode */}
        <div>
          <label className="label">
            Session Mode <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-4 mt-1">
            {(selectedSlotObj?.mode === 'both'
              ? ['online', 'offline']
              : [selectedSlotObj?.mode ?? '']).filter(Boolean).map(m => (
              <label key={m} className="flex items-center gap-2 cursor-pointer select-none">
                <input type="radio" value={m} checked={mode === m}
                  onChange={() => { setMode(m); setError(''); }} />
                <span className="text-sm capitalize">{m}</span>
              </label>
            ))}
            {!selectedSlotObj && consultant.available_modes.map(m => (
              <label key={m} className="flex items-center gap-2 cursor-pointer select-none">
                <input type="radio" value={m} checked={mode === m}
                  onChange={() => { setMode(m); setError(''); }} />
                <span className="text-sm capitalize">{m}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="label">Notes <span className="text-surface-400 font-normal">(optional)</span></label>
          <textarea
            className="input resize-none h-24"
            placeholder="Describe what you'd like to discuss in the session — career goals, concerns, guidance areas, etc."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        {/* Fee notice */}
        {consultant.session_fee && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-2">
            <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Session fee: <strong>₹{consultant.session_fee.toLocaleString()}</strong> — payment details will be shared after the consultant confirms your booking.
            </p>
          </div>
        )}

        {/* Error */}
        {error && <ErrorBox message={error} />}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting || activeSlots.length === 0}
            className="btn btn-primary flex items-center gap-2"
          >
            {submitting
              ? <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Booking…</>
              : 'Confirm Booking'}
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
    <Suspense fallback={<div className="card p-10 text-center animate-pulse text-surface-400">Loading consultant details…</div>}>
      <BookPageInner />
    </Suspense>
  );
}
