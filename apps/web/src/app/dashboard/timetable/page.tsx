'use client';

import { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/ui/Modal';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function todayStr() { return new Date().toISOString().split('T')[0]; }

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Slot type colours ────────────────────────────────────────────────────────
const SLOT_STYLE = {
  assigned: {
    card:    'border-brand-200 dark:border-brand-800 bg-brand-50/60 dark:bg-brand-950/20',
    badge:   'bg-brand-100 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400',
    dot:     'bg-brand-400',
    label:   'Assigned',
    icon:    '📘',
  },
  substitute: {
    card:    'border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20',
    badge:   'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400',
    dot:     'bg-amber-400',
    label:   'Substitute',
    icon:    '🔄',
  },
  reassigned_away: {
    card:    'border-surface-200 dark:border-gray-700 bg-surface-50/60 dark:bg-gray-800/20 opacity-60',
    badge:   'bg-surface-100 dark:bg-gray-700 text-surface-500 dark:text-gray-400',
    dot:     'bg-surface-300',
    label:   'Reassigned Away',
    icon:    '↗️',
  },
};

export default function TimetablePage() {
  const [date,        setDate]        = useState(todayStr());
  const [slots,       setSlots]       = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [role,        setRole]        = useState('');
  const [msg,         setMsg]         = useState<{ type: string; text: string } | null>(null);
  const [dayReassignments, setDayReassignments] = useState<any[]>([]);

  // Log modal
  const [activeSlot,  setActiveSlot]  = useState<any | null>(null);
  const [logForm,     setLogForm]     = useState({ topic: '', notes: '', homeworkId: '' });
  const [showLog,     setShowLog]     = useState(false);
  const [saving,      setSaving]      = useState(false);

  // Reassign modal
  const [showReassign,      setShowReassign]      = useState(false);
  const [reassignSlot,      setReassignSlot]      = useState<any | null>(null);
  const [teachers,          setTeachers]          = useState<any[]>([]);
  const [reassignForm,      setReassignForm]      = useState({ substituteTeacherId: '', startDate: todayStr(), endDate: '', reason: '' });
  const [reassigning,       setReassigning]       = useState(false);


  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const authH   = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const isTeacher = role === 'teacher';

  const fetchSlots = useCallback(async (d: string) => {
    setLoading(true);
    try {
      const [slotsRes, raRes] = await Promise.all([
        fetch(`/api/timetable/teacher?date=${d}`,   { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/timetable/reassign?date=${d}`,  { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const slotsData = await slotsRes.json();
      const raData    = await raRes.json();
      setSlots(slotsData.slots || []);
      setDayReassignments(raData.reassignments || []);
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
    setRole(user.primaryRole || '');
    fetchSlots(date);
    // Fetch school teachers for substitute selector — /api/teachers is scoped to caller's school
    fetch('/api/teachers', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setTeachers(d.teachers || []))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchSlots(date); }, [date, fetchSlots]);

  // ── Topic log ───────────────────────────────────────────────────────────────
  const openLog = (slot: any) => {
    const existingLog = slot.logs?.[0];
    setActiveSlot(slot);
    setLogForm({ topic: existingLog?.topic || '', notes: existingLog?.notes || '', homeworkId: existingLog?.homeworkId || '' });
    setShowLog(true);
  };

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSlot) return;
    setSaving(true); setMsg(null);
    try {
      const res = await fetch('/api/timetable/log', {
        method: 'POST', headers: authH,
        body: JSON.stringify({ slotId: activeSlot.id, date, ...logForm }),
      });
      const d = await res.json();
      if (!res.ok) { setMsg({ type: 'error', text: d.error || 'Failed to save' }); return; }
      setMsg({ type: 'success', text: 'Topic logged!' });
      setShowLog(false);
      fetchSlots(date);
    } finally { setSaving(false); }
  };

  // ── Reassign ────────────────────────────────────────────────────────────────
  const openReassign = (slot: any) => {
    setReassignSlot(slot);
    setReassignForm({ substituteTeacherId: '', startDate: date, endDate: date, reason: '' });
    setShowReassign(true);
  };

  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignSlot) return;
    setReassigning(true); setMsg(null);
    try {
      const res = await fetch('/api/timetable/reassign', {
        method: 'POST', headers: authH,
        body: JSON.stringify({
          slotId:              reassignSlot.id,
          substituteTeacherId: reassignForm.substituteTeacherId,
          startDate:           reassignForm.startDate,
          endDate:             reassignForm.endDate,
          reason:              reassignForm.reason,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setMsg({ type: 'error', text: d.error || 'Failed to reassign' }); setReassigning(false); return; }
      setMsg({ type: 'success', text: 'Class reassigned successfully!' });
      setShowReassign(false);
      fetchSlots(date);
    } finally { setReassigning(false); }
  };

  const cancelReassignment = async (id: string) => {
    await fetch(`/api/timetable/reassign?id=${id}`, { method: 'DELETE', headers: authH });
    fetchSlots(date); // refreshes both slots + dayReassignments
  };

  const dayName = DAYS[new Date(date + 'T00:00:00').getDay()];
  const isToday = date === todayStr();

  // Counts for legend
  const assignedCount  = slots.filter(s => s.slotType === 'assigned').length;
  const substituteCount = slots.filter(s => s.slotType === 'substitute').length;
  const reassignedCount = slots.filter(s => s.slotType === 'reassigned_away').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">My Timetable</h1>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">Day-wise schedule with topic logging</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => { const d = new Date(date + 'T00:00:00'); d.setDate(d.getDate() - 1); setDate(d.toISOString().split('T')[0]); }}
            className="btn-secondary px-3 py-2">‹ Prev</button>
          <input type="date" className="input-field text-sm" value={date} onChange={e => setDate(e.target.value)} />
          <button onClick={() => { const d = new Date(date + 'T00:00:00'); d.setDate(d.getDate() + 1); setDate(d.toISOString().split('T')[0]); }}
            className="btn-secondary px-3 py-2">Next ›</button>
        </div>
      </div>

      {/* Day banner */}
      <div className="card p-4 flex items-center gap-4 flex-wrap">
        <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-950/40 flex items-center justify-center">
          <span className="text-xl">📅</span>
        </div>
        <div className="flex-1">
          <p className="font-display font-bold text-lg">{dayName}</p>
          <p className="text-sm text-surface-400">
            {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            {isToday && <span className="ml-2 text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/30 px-2 py-0.5 rounded-full">Today</span>}
          </p>
        </div>
        {/* Legend */}
        {slots.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap text-xs">
            {assignedCount   > 0 && <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-brand-400"/><span className="text-surface-500">Assigned ({assignedCount})</span></span>}
            {substituteCount > 0 && <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"/><span className="text-surface-500">Substitute ({substituteCount})</span></span>}
            {reassignedCount > 0 && <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-surface-300"/><span className="text-surface-500">Handed off ({reassignedCount})</span></span>}
          </div>
        )}
      </div>

      {msg && (
        <div className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'}`}>
          {msg.text}
          <button onClick={() => setMsg(null)} className="ml-auto text-lg leading-none opacity-60 hover:opacity-100">×</button>
        </div>
      )}

      {/* Periods */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-2xl bg-surface-50 dark:bg-gray-800/40 animate-pulse" />)}
        </div>
      ) : slots.length === 0 ? (
        <div className="card p-12 text-center text-surface-400">
          <div className="text-4xl mb-3">☀️</div>
          <p className="font-semibold mb-1">No classes scheduled</p>
          <p className="text-sm">You have no periods on {dayName}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {slots.map((slot: any) => {
            const log      = slot.logs?.[0];
            const hasLog   = !!log;
            const type     = slot.slotType ?? 'assigned';
            const style    = SLOT_STYLE[type as keyof typeof SLOT_STYLE] ?? SLOT_STYLE.assigned;
            const className = slot.timetable?.class?.name || `${slot.timetable?.class?.grade}-${slot.timetable?.class?.section}`;

            return (
              <div key={slot.id + type} className={`card p-4 border-2 ${style.card}`}>
                <div className="flex items-start gap-4">
                  {/* Period badge */}
                  <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center text-xs font-bold flex-shrink-0 ${style.badge}`}>
                    <span>{style.icon}</span>
                    <span>P{slot.periodNo}</span>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-sm">{slot.subject}</span>
                      {className && (
                        <span className="text-xs bg-surface-100 dark:bg-gray-700/60 text-surface-500 px-2 py-0.5 rounded-md">{className}</span>
                      )}
                      {slot.startTime && slot.endTime && (
                        <span className="text-xs text-surface-400">{slot.startTime} – {slot.endTime}</span>
                      )}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>{style.label}</span>
                    </div>

                    {/* Reassigned-away notice */}
                    {type === 'reassigned_away' && slot.reassignedTo && (
                      <div className="flex items-center gap-3 mb-1">
                        <p className="text-xs text-surface-400 italic">
                          Handed off until {fmtDate(slot.reassignedTo.endDate)}
                        </p>
                        <button
                          onClick={() => cancelReassignment(slot.reassignedTo.reassignmentId)}
                          className="text-xs text-red-500 dark:text-red-400 hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {/* Substitute notice */}
                    {type === 'substitute' && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 italic mb-1">
                        Covering until {fmtDate(slot.endDate)}{slot.reason ? ` · ${slot.reason}` : ''}
                      </p>
                    )}

                    {hasLog ? (
                      <div className="space-y-0.5">
                        <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Topic:</span> {log.topic}</p>
                        {log.notes && <p className="text-xs text-surface-400">{log.notes}</p>}
                      </div>
                    ) : (
                      <p className="text-xs text-surface-400 italic">No topic logged yet</p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    {isTeacher && type !== 'reassigned_away' && (
                      <button onClick={() => openLog(slot)}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                          hasLog
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
                            : 'bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 hover:bg-brand-100'
                        }`}>
                        {hasLog ? '✏️ Edit Log' : '+ Log Topic'}
                      </button>
                    )}
                    {/* Reassign button — only for originally assigned slots */}
                    {isTeacher && type === 'assigned' && (
                      <button onClick={() => openReassign(slot)}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors">
                        ↗ Reassign
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reassignments active on this date */}
      {dayReassignments.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Reassignments on this day</p>
          {dayReassignments.map((r: any) => {
            const isOriginal = r.originalTeacherName && r.substituteTeacherName;
            return (
              <div key={r.id} className="card p-4 border-2 border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center text-xs font-bold flex-shrink-0 bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                    <span>↗️</span>
                    <span>P{r.periodNo}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-sm">{r.subject}</span>
                      {r.className && (
                        <span className="text-xs bg-surface-100 dark:bg-gray-700/60 text-surface-500 px-2 py-0.5 rounded-md">{r.className}</span>
                      )}
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">Reassigned</span>
                    </div>
                    <p className="text-xs text-surface-400">
                      {r.originalTeacherName} → <span className="font-medium text-amber-600 dark:text-amber-400">{r.substituteTeacherName}</span>
                    </p>
                    <p className="text-xs text-surface-400 mt-0.5">
                      {fmtDate(r.startDate)} – {fmtDate(r.endDate)}{r.reason ? ` · ${r.reason}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => cancelReassignment(r.id)}
                    className="text-xs text-red-500 dark:text-red-400 hover:underline shrink-0 pt-1"
                  >
                    Cancel
                  </button>
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

      {/* Reassign Class Modal */}
      <Modal open={showReassign} onClose={() => setShowReassign(false)}
        title={`Reassign Class — ${reassignSlot?.subject} (P${reassignSlot?.periodNo})`}>
        <form onSubmit={handleReassign} className="space-y-4">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
            The selected substitute teacher will see this class on their timetable for the specified date range.
            You will still see it as <strong>Reassigned Away</strong> until the end date.
          </div>
          <div>
            <label className="label">Substitute Teacher *</label>
            <select className="input-field" required value={reassignForm.substituteTeacherId}
              onChange={e => setReassignForm(f => ({...f, substituteTeacherId: e.target.value}))}>
              <option value="">— Select a teacher —</option>
              {teachers.map((t: any) => (
                <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">From Date *</label>
              <input type="date" className="input-field" required value={reassignForm.startDate}
                onChange={e => setReassignForm(f => ({...f, startDate: e.target.value}))} />
            </div>
            <div>
              <label className="label">Until Date *</label>
              <input type="date" className="input-field" required value={reassignForm.endDate}
                min={reassignForm.startDate}
                onChange={e => setReassignForm(f => ({...f, endDate: e.target.value}))} />
            </div>
          </div>
          <div>
            <label className="label">Reason (optional)</label>
            <input className="input-field" placeholder="e.g. On leave / sick day"
              value={reassignForm.reason}
              onChange={e => setReassignForm(f => ({...f, reason: e.target.value}))} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowReassign(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={reassigning} className="btn-primary flex-1">{reassigning ? 'Reassigning...' : 'Confirm Reassignment'}</button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
