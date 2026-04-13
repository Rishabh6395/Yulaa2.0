'use client';

import { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/ui/Modal';

// ─── Constants ────────────────────────────────────────────────────────────────

const FALLBACK_EVENT_TYPES = [
  { name: 'Academic', code: 'academic' },
  { name: 'Cultural', code: 'cultural' },
  { name: 'Sports', code: 'sports' },
  { name: 'Annual Day', code: 'annual_day' },
  { name: 'Trip', code: 'trip' },
  { name: 'Workshop', code: 'workshop' },
  { name: 'Other', code: 'other' },
];

const EVENT_STATUS = ['upcoming', 'ongoing', 'completed', 'cancelled'];
const TASK_STATUS  = ['pending', 'in_progress', 'completed'];

const TYPE_CFG: Record<string, { icon: string; bg: string; text: string }> = {
  academic:   { icon: '📚', bg: 'bg-blue-100',    text: 'text-blue-700' },
  cultural:   { icon: '🎭', bg: 'bg-purple-100',  text: 'text-purple-700' },
  sports:     { icon: '🏅', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  annual_day: { icon: '🎓', bg: 'bg-amber-100',   text: 'text-amber-700' },
  trip:       { icon: '🚌', bg: 'bg-cyan-100',    text: 'text-cyan-700' },
  workshop:   { icon: '🔧', bg: 'bg-orange-100',  text: 'text-orange-700' },
  other:      { icon: '📌', bg: 'bg-surface-100', text: 'text-surface-600' },
};

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  upcoming:  { label: 'Upcoming',  cls: 'badge-primary' },
  ongoing:   { label: 'Ongoing',   cls: 'badge-success' },
  completed: { label: 'Completed', cls: 'badge-neutral' },
  cancelled: { label: 'Cancelled', cls: 'badge-danger' },
};

const TASK_STATUS_CFG: Record<string, { label: string; cls: string }> = {
  pending:     { label: 'Pending',     cls: 'badge-neutral' },
  in_progress: { label: 'In Progress', cls: 'badge-primary' },
  completed:   { label: 'Completed',   cls: 'badge-success' },
};

const EMPTY_FORM = { title: '', eventType: '', startDate: '', endDate: '', venue: '', description: '', academicYear: '' };
const EMPTY_TASK = { title: '', assignedTo: '', role: '', dueDate: '' };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EventsPage() {
  const [events,      setEvents]      = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [activeEvent, setActiveEvent] = useState<any | null>(null);

  // New Event form state
  const [showForm,    setShowForm]    = useState(false);
  const [eventTypes,  setEventTypes]  = useState<{ name: string; code: string }[]>(FALLBACK_EVENT_TYPES);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [formError,   setFormError]   = useState('');

  // Add Task form state
  const [showTask,    setShowTask]    = useState(false);
  const [teachers,    setTeachers]    = useState<any[]>([]);
  const [taskForm,    setTaskForm]    = useState(EMPTY_TASK);
  const [taskSaving,  setTaskSaving]  = useState(false);

  const [msg,  setMsg]  = useState<{ type: string; text: string } | null>(null);
  const [role, setRole] = useState('');

  const isAdmin = ['school_admin', 'super_admin', 'principal'].includes(role);

  const tok = () => localStorage.getItem('token') ?? '';
  const authH = () => ({ Authorization: `Bearer ${tok()}`, 'Content-Type': 'application/json' });

  // ── Fetch events list ──────────────────────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/events', { headers: { Authorization: `Bearer ${tok()}` } });
      const d   = await res.json();
      setEvents(d.events || []);
    } finally { setLoading(false); }
  }, []);

  const openEvent = useCallback(async (id: string) => {
    const res = await fetch(`/api/events?eventId=${id}`, { headers: { Authorization: `Bearer ${tok()}` } });
    const d   = await res.json();
    setActiveEvent(d.event || null);
  }, []);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setRole(user.primaryRole || '');
    fetchEvents();
  }, [fetchEvents]);

  // ── Open "New Event" — fetch masters immediately on click ──────────────────
  const openNewEventForm = async () => {
    setMsg(null);
    setFormError('');
    setForm(EMPTY_FORM);
    setEventTypes(FALLBACK_EVENT_TYPES);   // show fallbacks instantly
    setShowForm(true);
    setFormLoading(true);

    try {
      const token    = tok();
      const stored   = localStorage.getItem('user');
      const schoolId = stored ? JSON.parse(stored).schoolId : null;
      const qs       = schoolId ? `?schoolId=${schoolId}` : '';
      const headers  = { Authorization: `Bearer ${token}` };

      const res  = await fetch(`/api/masters/event-types${qs}`, { headers });
      const data = res.ok ? await res.json() : null;

      const items: any[] = data?.eventTypeMasters ?? [];
      if (items.length > 0) {
        const sorted = items
          .filter((et: any) => et.isActive !== false)
          .sort((a: any, b: any) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
        setEventTypes(sorted.map((et: any) => ({ name: et.name, code: et.code })));
        setForm(f => ({ ...f, eventType: sorted[0]?.code ?? '' }));
      } else {
        setForm(f => ({ ...f, eventType: FALLBACK_EVENT_TYPES[0].code }));
      }
    } catch {
      setForm(f => ({ ...f, eventType: FALLBACK_EVENT_TYPES[0].code }));
    } finally {
      setFormLoading(false);
    }
  };

  // ── Open "Add Task" — fetch teachers immediately on click ──────────────────
  const openAddTaskForm = async () => {
    setTaskForm(EMPTY_TASK);
    setTeachers([]);
    setShowTask(true);

    try {
      const res  = await fetch('/api/teachers', { headers: { Authorization: `Bearer ${tok()}` } });
      const data = res.ok ? await res.json() : null;
      if (data?.teachers) setTeachers(data.teachers);
    } catch { /* no teachers shown */ }
  };

  // ── Submit new event ───────────────────────────────────────────────────────
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setFormError('');
    try {
      const res = await fetch('/api/events', { method: 'POST', headers: authH(), body: JSON.stringify({ ...form }) });
      const d   = await res.json();
      if (!res.ok) { setFormError(d.error || 'Failed to create event'); return; }
      setShowForm(false);
      setMsg({ type: 'success', text: 'Event created!' });
      fetchEvents();
    } finally { setSaving(false); }
  };

  // ── Submit add task ────────────────────────────────────────────────────────
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvent) return;
    setTaskSaving(true);
    try {
      const res = await fetch('/api/events', {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ action: 'add_task', eventId: activeEvent.id, ...taskForm }),
      });
      if (res.ok) {
        setShowTask(false);
        openEvent(activeEvent.id);
      }
    } finally { setTaskSaving(false); }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    await fetch('/api/events', { method: 'PATCH', headers: authH(), body: JSON.stringify({ action: 'update_task', taskId, status }) });
    if (activeEvent) openEvent(activeEvent.id);
  };

  const updateEventStatus = async (eventId: string, status: string) => {
    await fetch('/api/events', { method: 'PATCH', headers: authH(), body: JSON.stringify({ action: 'update_event', eventId, status }) });
    fetchEvents();
    if (activeEvent?.id === eventId) setActiveEvent((p: any) => p ? { ...p, status } : null);
  };

  const deleteEvent = async (eventId: string) => {
    if (!confirm('Delete this event?')) return;
    await fetch('/api/events', { method: 'DELETE', headers: authH(), body: JSON.stringify({ eventId }) });
    if (activeEvent?.id === eventId) setActiveEvent(null);
    fetchEvents();
  };

  const deleteTask = async (taskId: string) => {
    await fetch('/api/events', { method: 'DELETE', headers: authH(), body: JSON.stringify({ taskId }) });
    if (activeEvent) openEvent(activeEvent.id);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">Events Management</h1>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">Plan and manage all school activities</p>
        </div>
        {isAdmin && (
          <button onClick={openNewEventForm} className="btn-primary flex items-center gap-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Event
          </button>
        )}
      </div>

      {msg && (
        <div className={`px-4 py-2 rounded-xl text-sm font-medium ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'}`}>
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Events list */}
        <div className="lg:col-span-1 space-y-3">
          {loading ? (
            [1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-surface-50 dark:bg-gray-800/40 animate-pulse" />)
          ) : events.length === 0 ? (
            <div className="text-center py-16 text-surface-400 dark:text-gray-500">
              <div className="text-4xl mb-3">📅</div>
              <p className="text-sm">No events yet.</p>
            </div>
          ) : events.map(ev => {
            const cfg  = TYPE_CFG[ev.eventType] || TYPE_CFG.other;
            const sCfg = STATUS_CFG[ev.status]   || STATUS_CFG.upcoming;
            return (
              <div key={ev.id} onClick={() => openEvent(ev.id)}
                className={`card p-4 cursor-pointer transition-all hover:shadow-md ${activeEvent?.id === ev.id ? 'ring-2 ring-brand-400' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${cfg.bg}`}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm truncate">{ev.title}</p>
                      <span className={sCfg.cls}>{sCfg.label}</span>
                    </div>
                    <p className="text-xs text-surface-400 dark:text-gray-500 mt-0.5">
                      {ev.startDate ? new Date(ev.startDate).toLocaleDateString('en-IN') : ''}
                      {ev.venue ? ` · ${ev.venue}` : ''}
                    </p>
                    <p className="text-xs text-surface-400 dark:text-gray-500 mt-1">
                      {ev._count?.tasks ?? 0} tasks · {ev._count?.participants ?? 0} participants
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Event detail */}
        <div className="lg:col-span-2">
          {!activeEvent ? (
            <div className="card p-12 text-center text-surface-400 dark:text-gray-500">
              <div className="text-5xl mb-4">🎪</div>
              <p className="text-sm">Select an event to view details</p>
            </div>
          ) : (
            <div className="card p-6 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-2xl">{(TYPE_CFG[activeEvent.eventType] || TYPE_CFG.other).icon}</span>
                    <h2 className="text-xl font-display font-bold">{activeEvent.title}</h2>
                    <span className={(STATUS_CFG[activeEvent.status] || STATUS_CFG.upcoming).cls}>
                      {(STATUS_CFG[activeEvent.status] || STATUS_CFG.upcoming).label}
                    </span>
                  </div>
                  {activeEvent.description && (
                    <p className="text-sm text-surface-500 dark:text-gray-400">{activeEvent.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-surface-400 dark:text-gray-500 flex-wrap">
                    {activeEvent.startDate && <span>📅 {new Date(activeEvent.startDate).toLocaleDateString('en-IN')}</span>}
                    {activeEvent.endDate && activeEvent.endDate !== activeEvent.startDate && (
                      <span>→ {new Date(activeEvent.endDate).toLocaleDateString('en-IN')}</span>
                    )}
                    {activeEvent.venue && <span>📍 {activeEvent.venue}</span>}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <select value={activeEvent.status} onChange={e => updateEventStatus(activeEvent.id, e.target.value)} className="input-field text-xs py-1 px-2">
                      {EVENT_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button onClick={() => deleteEvent(activeEvent.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                        <path d="M10 11v6"/><path d="M14 11v6"/>
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Tasks */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">Tasks ({activeEvent.tasks?.length ?? 0})</h3>
                  {isAdmin && (
                    <button onClick={openAddTaskForm} className="btn-secondary text-xs py-1 px-3">+ Add Task</button>
                  )}
                </div>
                {activeEvent.tasks?.length === 0 ? (
                  <p className="text-xs text-surface-400 dark:text-gray-500 py-4 text-center">No tasks assigned.</p>
                ) : (
                  <div className="space-y-2">
                    {activeEvent.tasks?.map((t: any) => (
                      <div key={t.id} className="flex items-center gap-3 p-3 bg-surface-50 dark:bg-gray-800/40 rounded-xl">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{t.title}</p>
                          <p className="text-xs text-surface-400 dark:text-gray-500">
                            {t.teacher ? `${t.teacher.user.firstName} ${t.teacher.user.lastName}` : 'Unassigned'}
                            {t.role ? ` · ${t.role}` : ''}
                            {t.dueDate ? ` · Due ${new Date(t.dueDate).toLocaleDateString('en-IN')}` : ''}
                          </p>
                        </div>
                        <select value={t.status} onChange={e => updateTaskStatus(t.id, e.target.value)} className="input-field text-xs py-1 px-2 w-32">
                          {TASK_STATUS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                        </select>
                        {isAdmin && (
                          <button onClick={() => deleteTask(t.id)} className="w-6 h-6 flex items-center justify-center rounded text-surface-300 hover:text-red-500 transition-colors">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Participants */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">Participants ({activeEvent.participants?.length ?? 0})</h3>
                </div>
                {activeEvent.participants?.length === 0 ? (
                  <p className="text-xs text-surface-400 dark:text-gray-500 py-4 text-center">No participants registered.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-surface-400 dark:text-gray-500 text-left border-b border-surface-100 dark:border-gray-700">
                          <th className="pb-2 font-medium">Student</th>
                          <th className="pb-2 font-medium">Roll</th>
                          <th className="pb-2 font-medium">Role</th>
                          <th className="pb-2 font-medium">Status</th>
                          <th className="pb-2 font-medium">Attended</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-50 dark:divide-gray-800">
                        {activeEvent.participants?.map((p: any) => (
                          <tr key={p.id} className="py-1.5">
                            <td className="py-2">{p.student ? `${p.student.firstName} ${p.student.lastName}` : '—'}</td>
                            <td className="py-2 text-surface-400 dark:text-gray-500">{p.student?.admissionNo}</td>
                            <td className="py-2">{p.role || '—'}</td>
                            <td className="py-2 capitalize">{p.status}</td>
                            <td className="py-2">
                              {isAdmin ? (
                                <input type="checkbox" checked={p.attended}
                                  onChange={async e => {
                                    await fetch('/api/events', { method: 'PATCH', headers: authH(), body: JSON.stringify({ action: 'mark_attendance', participantId: p.id, attended: e.target.checked }) });
                                    openEvent(activeEvent.id);
                                  }}
                                  className="w-4 h-4 rounded accent-brand-500"
                                />
                              ) : (
                                <span>{p.attended ? '✓' : '—'}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Event Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Create New Event">
        <form onSubmit={handleCreateEvent} className="space-y-4">
          {formLoading && (
            <p className="text-xs text-surface-400 dark:text-gray-500">Loading form options...</p>
          )}
          {formError && (
            <div className="px-3 py-2 rounded-lg text-sm text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400">{formError}</div>
          )}
          <div>
            <label className="label">Event Title *</label>
            <input className="input-field" required value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Annual Sports Day" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Event Type *</label>
              <select className="input-field" required value={form.eventType}
                onChange={e => setForm(f => ({ ...f, eventType: e.target.value }))}>
                <option value="">Select type</option>
                {eventTypes.map(t => <option key={t.code} value={t.code}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Academic Year</label>
              <input className="input-field" value={form.academicYear}
                onChange={e => setForm(f => ({ ...f, academicYear: e.target.value }))} placeholder="2025-2026" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date *</label>
              <input type="date" className="input-field" required value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" className="input-field" value={form.endDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Venue</label>
            <input className="input-field" value={form.venue}
              onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} placeholder="e.g. School Grounds" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input-field" rows={3} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Event details..." />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Creating...' : 'Create Event'}</button>
          </div>
        </form>
      </Modal>

      {/* Add Task Modal */}
      <Modal open={showTask} onClose={() => setShowTask(false)} title="Add Task">
        <form onSubmit={handleAddTask} className="space-y-4">
          <div>
            <label className="label">Task Title *</label>
            <input className="input-field" required value={taskForm.title}
              onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Manage discipline" />
          </div>
          <div>
            <label className="label">Assign To</label>
            <select className="input-field" value={taskForm.assignedTo}
              onChange={e => setTaskForm(f => ({ ...f, assignedTo: e.target.value }))}>
              <option value="">Select teacher</option>
              {teachers.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Role</label>
              <input className="input-field" value={taskForm.role}
                onChange={e => setTaskForm(f => ({ ...f, role: e.target.value }))} placeholder="e.g. Coordinator" />
            </div>
            <div>
              <label className="label">Due Date</label>
              <input type="date" className="input-field" value={taskForm.dueDate}
                onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowTask(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={taskSaving} className="btn-primary flex-1">{taskSaving ? 'Adding...' : 'Add Task'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
