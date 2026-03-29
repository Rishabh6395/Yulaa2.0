'use client';

import { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/ui/Modal';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export default function TimetablePage() {
  const [date,       setDate]       = useState(todayStr());
  const [slots,      setSlots]      = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [activeSlot, setActiveSlot] = useState<any | null>(null);
  const [logForm,    setLogForm]    = useState({ topic: '', notes: '', homeworkId: '' });
  const [showLog,    setShowLog]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [msg,        setMsg]        = useState<{ type: string; text: string } | null>(null);
  const [role,       setRole]       = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const isTeacher = role === 'teacher';

  const fetchSlots = useCallback(async (d: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/timetable/teacher?date=${d}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setSlots(data.slots || []);
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
    setRole(user.primaryRole || '');
    fetchSlots(date);
  }, [fetchSlots, date]);

  const openLog = (slot: any) => {
    const existingLog = slot.logs?.[0];
    setActiveSlot(slot);
    setLogForm({
      topic:      existingLog?.topic || '',
      notes:      existingLog?.notes || '',
      homeworkId: existingLog?.homeworkId || '',
    });
    setShowLog(true);
  };

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSlot) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/timetable/log', {
        method: 'POST', headers,
        body: JSON.stringify({ slotId: activeSlot.id, date, ...logForm }),
      });
      const d = await res.json();
      if (!res.ok) { setMsg({ type: 'error', text: d.error || 'Failed to save' }); return; }
      setMsg({ type: 'success', text: 'Topic logged successfully!' });
      setShowLog(false);
      fetchSlots(date);
    } finally { setSaving(false); }
  };

  const dayName = DAYS[new Date(date).getDay()];
  const isToday = date === todayStr();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">My Timetable</h1>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">Day-wise schedule with topic logging</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const d = new Date(date);
              d.setDate(d.getDate() - 1);
              setDate(d.toISOString().split('T')[0]);
            }}
            className="btn-secondary px-3 py-2"
          >
            ‹ Prev
          </button>
          <input type="date" className="input-field text-sm" value={date} onChange={e => setDate(e.target.value)} />
          <button
            onClick={() => {
              const d = new Date(date);
              d.setDate(d.getDate() + 1);
              setDate(d.toISOString().split('T')[0]);
            }}
            className="btn-secondary px-3 py-2"
          >
            Next ›
          </button>
        </div>
      </div>

      {/* Day banner */}
      <div className="card p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-950/40 flex items-center justify-center">
          <span className="text-xl">📅</span>
        </div>
        <div>
          <p className="font-display font-bold text-lg">{dayName}</p>
          <p className="text-sm text-surface-400 dark:text-gray-500">
            {new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            {isToday && <span className="ml-2 text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/30 px-2 py-0.5 rounded-full">Today</span>}
          </p>
        </div>
      </div>

      {msg && (
        <div className={`px-4 py-2 rounded-xl text-sm font-medium ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'}`}>
          {msg.text}
        </div>
      )}

      {/* Periods */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-2xl bg-surface-50 dark:bg-gray-800/40 animate-pulse" />)}
        </div>
      ) : slots.length === 0 ? (
        <div className="card p-12 text-center text-surface-400 dark:text-gray-500">
          <div className="text-4xl mb-3">☀️</div>
          <p className="font-semibold mb-1">No classes scheduled</p>
          <p className="text-sm">You have no periods on {dayName}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {slots.map((slot: any) => {
            const log = slot.logs?.[0];
            const hasLog = !!log;
            return (
              <div key={slot.id} className="card p-4">
                <div className="flex items-start gap-4">
                  {/* Period number */}
                  <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/30 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-sm flex-shrink-0">
                    P{slot.periodNo}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-sm">{slot.subject}</span>
                      {slot.timetable?.class?.name && (
                        <span className="text-xs bg-surface-100 dark:bg-gray-700/60 text-surface-500 dark:text-gray-400 px-2 py-0.5 rounded-md">
                          {slot.timetable.class.name}
                        </span>
                      )}
                      {slot.startTime && slot.endTime && (
                        <span className="text-xs text-surface-400 dark:text-gray-500">{slot.startTime} – {slot.endTime}</span>
                      )}
                    </div>

                    {hasLog ? (
                      <div className="space-y-1">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <span className="font-medium">Topic:</span> {log.topic}
                        </p>
                        {log.notes && <p className="text-xs text-surface-400 dark:text-gray-500">{log.notes}</p>}
                      </div>
                    ) : (
                      <p className="text-xs text-surface-400 dark:text-gray-500 italic">No topic logged yet</p>
                    )}
                  </div>

                  {/* Log button */}
                  {isTeacher && (
                    <button
                      onClick={() => openLog(slot)}
                      className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                        hasLog
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
                          : 'bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 hover:bg-brand-100'
                      }`}
                    >
                      {hasLog ? '✏️ Edit Log' : '+ Log Topic'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Log Topic Modal */}
      <Modal open={showLog} onClose={() => setShowLog(false)} title={`Log Topic — ${activeSlot?.subject} (P${activeSlot?.periodNo})`}>
        <form onSubmit={handleSaveLog} className="space-y-4">
          <div>
            <label className="label">Topic Covered *</label>
            <input className="input-field" required value={logForm.topic}
              onChange={e => setLogForm(f => ({...f, topic: e.target.value}))}
              placeholder="e.g. Chapter 3: Laws of Motion" />
          </div>
          <div>
            <label className="label">Notes / Observations</label>
            <textarea className="input-field" rows={3} value={logForm.notes}
              onChange={e => setLogForm(f => ({...f, notes: e.target.value}))}
              placeholder="Any class notes, student queries, etc." />
          </div>
          <div>
            <label className="label">Homework ID (optional)</label>
            <input className="input-field" value={logForm.homeworkId}
              onChange={e => setLogForm(f => ({...f, homeworkId: e.target.value}))}
              placeholder="Link to homework entry if any" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowLog(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save Log'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
