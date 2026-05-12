'use client';

import { useEffect, useState } from 'react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type Slot = {
  id: string;
  day_of_week: number | null;
  date: string | null;
  start_time: string;
  end_time: string;
  mode: string;
  max_bookings: number;
  is_active: boolean;
  bookings: { id: string }[];
};

export default function ConsultantAvailabilityPage() {
  const [slots,    setSlots]    = useState<Slot[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [form, setForm] = useState({
    type: 'weekly' as 'weekly' | 'specific',
    day_of_week: '1',
    date: '',
    start_time: '10:00',
    end_time: '11:00',
    mode: 'online',
    max_bookings: '1',
  });

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const load = () => {
    setLoading(true);
    fetch('/api/career-sessions/availability', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setSlots(d.slots ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const body: any = {
        start_time: form.start_time,
        end_time:   form.end_time,
        mode:        form.mode,
        max_bookings: Number(form.max_bookings),
      };
      if (form.type === 'weekly') body.day_of_week = Number(form.day_of_week);
      else body.date = form.date;

      const res = await fetch('/api/career-sessions/availability', {
        method: 'POST', headers,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create slot');
      setShowForm(false);
      load();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  const deactivate = async (id: string) => {
    await fetch('/api/career-sessions/availability', {
      method: 'PATCH', headers,
      body: JSON.stringify({ id, is_active: false }),
    });
    load();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">My Availability</h1>
          <p className="text-sm text-surface-400 mt-0.5">Set your weekly recurring slots or specific date availability.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">+ Add Slot</button>
      </div>

      {showForm && (
        <div className="card p-6 space-y-4 border-2 border-brand-200 dark:border-brand-800">
          <h2 className="font-semibold">New Availability Slot</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Slot Type</label>
              <div className="flex gap-3">
                {(['weekly', 'specific'] as const).map(t => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={form.type === t} onChange={() => setForm(f => ({ ...f, type: t }))} />
                    <span className="text-sm capitalize">{t === 'weekly' ? 'Weekly Recurring' : 'Specific Date'}</span>
                  </label>
                ))}
              </div>
            </div>

            {form.type === 'weekly' ? (
              <div>
                <label className="label">Day of Week</label>
                <select className="input" value={form.day_of_week} onChange={e => setForm(f => ({ ...f, day_of_week: e.target.value }))}>
                  {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label className="label">Date</label>
                <input required type="date" className="input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            )}

            <div>
              <label className="label">Mode</label>
              <select className="input" value={form.mode} onChange={e => setForm(f => ({ ...f, mode: e.target.value }))}>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div>
              <label className="label">Start Time</label>
              <input required type="time" className="input" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
            </div>
            <div>
              <label className="label">End Time</label>
              <input required type="time" className="input" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
            </div>
            <div>
              <label className="label">Max Bookings per Slot</label>
              <input type="number" min="1" max="10" className="input" value={form.max_bookings} onChange={e => setForm(f => ({ ...f, max_bookings: e.target.value }))} />
            </div>

            {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}
            <div className="col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : 'Add Slot'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="card p-4 animate-pulse h-20 bg-surface-100 dark:bg-gray-800" />)}
        </div>
      ) : slots.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-surface-400 text-sm">No availability slots set. Add your first slot to start accepting bookings.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {slots.map(s => (
            <div key={s.id} className="card p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                    {s.day_of_week !== null ? DAYS[s.day_of_week] : new Date(s.date!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-surface-400">{s.start_time} – {s.end_time}</p>
                </div>
                <span className="text-xs bg-surface-100 dark:bg-gray-700 px-2 py-0.5 rounded-full capitalize">{s.mode}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-surface-400">
                <span>Max {s.max_bookings} booking{s.max_bookings > 1 ? 's' : ''}</span>
                <span>{s.bookings.length} booked</span>
              </div>
              <button onClick={() => deactivate(s.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
