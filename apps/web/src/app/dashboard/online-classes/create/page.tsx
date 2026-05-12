'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type TimetableSlot = {
  id: string;
  subject: string;
  startTime: string;
  endTime: string;
  dayOfWeek: number;
  class?: { name: string; grade: string; section: string };
  classId: string;
  slotType?: string;
};

type Class = {
  id: string;
  name: string;
  grade: string;
  section: string;
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function CreateOnlineClassPage() {
  const router = useRouter();
  const [slots,    setSlots]    = useState<TimetableSlot[]>([]);
  const [classes,  setClasses]  = useState<Class[]>([]);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [form, setForm] = useState({
    slot_id: '',
    class_id: '',
    title: '',
    subject: '',
    platform: 'meet',
    meeting_link: '',
    meeting_id: '',
    meeting_password: '',
    scheduled_at: new Date().toISOString().slice(0, 16),
    duration_minutes: '45',
  });

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    // Load today's timetable slots so teacher can link to a slot
    Promise.all([
      fetch(`/api/timetable/teacher?date=${today}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()),
      fetch('/api/classes', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()),
    ]).then(([td, cd]) => {
      setSlots(td.slots ?? []);
      setClasses(cd.classes ?? []);
    }).catch(() => {});
  }, []);

  const selectSlot = (slot: TimetableSlot) => {
    const today = new Date().toISOString().slice(0, 10);
    const scheduled = `${today}T${slot.startTime}`;
    setForm(f => ({
      ...f,
      slot_id: slot.id,
      class_id: slot.classId ?? '',
      subject: slot.subject,
      title: slot.subject,
      scheduled_at: scheduled,
      duration_minutes: '45',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');

    const res = await fetch('/api/online-classes', {
      method: 'POST', headers,
      body: JSON.stringify({
        ...form,
        duration_minutes: Number(form.duration_minutes),
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        slot_id: form.slot_id || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Failed to create class'); setSaving(false); return; }
    router.push('/dashboard/online-classes');
  };

  const PLATFORMS = [
    { id: 'meet',  label: 'Google Meet' },
    { id: 'teams', label: 'Microsoft Teams' },
    { id: 'zoom',  label: 'Zoom' },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/dashboard/online-classes')} className="text-surface-400 hover:text-gray-700 dark:hover:text-gray-300">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15,18 9,12 15,6"/></svg>
        </button>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Create Online Class</h1>
          <p className="text-sm text-surface-400">Link to a timetable slot or create a standalone class</p>
        </div>
      </div>

      {slots.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Today's Timetable Slots (click to prefill)</p>
          <div className="flex flex-wrap gap-2">
            {slots.filter(s => s.slotType !== 'reassigned_away').map((s: any) => (
              <button
                key={s.id}
                type="button"
                onClick={() => selectSlot(s)}
                className={`px-3 py-2 rounded-lg border text-sm text-left transition-all ${form.slot_id === s.id ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40' : 'border-surface-200 dark:border-gray-700 hover:border-brand-300'}`}
              >
                <p className="font-medium">{s.subject}</p>
                <p className="text-xs text-surface-400">{s.startTime} · {s.timetable?.class?.name ?? ''}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Class Title</label>
            <input required className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Mathematics - Chapter 5" />
          </div>
          <div>
            <label className="label">Subject</label>
            <input className="input" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
          </div>
          <div>
            <label className="label">For Class</label>
            <select required className="input" value={form.class_id} onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))}>
              <option value="">Select class…</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.grade}-{c.section} ({c.name})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Platform</label>
            <div className="flex gap-3 flex-wrap">
              {PLATFORMS.map(p => (
                <label key={p.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${form.platform === p.id ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40' : 'border-surface-200 dark:border-gray-700'}`}>
                  <input type="radio" className="hidden" value={p.id} checked={form.platform === p.id} onChange={() => setForm(f => ({ ...f, platform: p.id }))} />
                  <span className="text-sm font-medium">{p.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Duration (minutes)</label>
            <input type="number" min="10" max="180" className="input" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <label className="label">Scheduled Date & Time</label>
            <input required type="datetime-local" className="input" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <label className="label">Meeting Link</label>
            <input type="url" className="input" placeholder="https://meet.google.com/..." value={form.meeting_link} onChange={e => setForm(f => ({ ...f, meeting_link: e.target.value }))} />
          </div>
          <div>
            <label className="label">Meeting ID (optional)</label>
            <input className="input" value={form.meeting_id} onChange={e => setForm(f => ({ ...f, meeting_id: e.target.value }))} />
          </div>
          <div>
            <label className="label">Password / Passcode (optional)</label>
            <input className="input" value={form.meeting_password} onChange={e => setForm(f => ({ ...f, meeting_password: e.target.value }))} />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Creating…' : 'Create Class'}</button>
          <button type="button" onClick={() => router.push('/dashboard/online-classes')} className="btn btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  );
}
