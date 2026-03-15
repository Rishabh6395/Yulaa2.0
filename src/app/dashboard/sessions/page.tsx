'use client';

import { useState, useEffect, useCallback } from 'react';

const SESSION_TYPES = [
  { value: '',           label: 'All Types' },
  { value: 'webinar',    label: 'Webinar' },
  { value: 'workshop',   label: 'Workshop' },
  { value: 'one_on_one', label: '1-on-1' },
  { value: 'group',      label: 'Group Session' },
  { value: 'resource',   label: 'Resource' },
];

const TYPE_CFG: Record<string, { bg: string; text: string; label: string }> = {
  webinar:    { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Webinar' },
  workshop:   { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Workshop' },
  one_on_one: { bg: 'bg-teal-100',   text: 'text-teal-700',   label: '1-on-1' },
  group:      { bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'Group' },
  resource:   { bg: 'bg-emerald-100',text: 'text-emerald-700',label: 'Resource' },
};

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  scheduled:  { label: 'Scheduled',  cls: 'badge-info' },
  completed:  { label: 'Completed',  cls: 'badge-success' },
  cancelled:  { label: 'Cancelled',  cls: 'badge-danger' },
  draft:      { label: 'Draft',      cls: 'badge-neutral' },
};

const GRADE_OPTIONS = [
  'Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6',
  'Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12',
];

const EMPTY_FORM = {
  title: '', description: '', session_type: 'webinar',
  target_grades: [] as string[], session_date: '', duration_minutes: 60,
  max_participants: '', meeting_link: '',
};

function TypeBadge({ type }: { type: string }) {
  const cfg = TYPE_CFG[type] || { bg: 'bg-surface-100', text: 'text-surface-600', label: type };
  return <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] || { label: status, cls: 'badge-neutral' };
  return <span className={cfg.cls}>{cfg.label}</span>;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editSession, setEditSession] = useState<any>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [role, setRole] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try { setRole(JSON.parse(userData).primaryRole); } catch {}
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (typeFilter) params.set('status', typeFilter);
    const res = await fetch(`/api/consultant/sessions?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setSessions(data.sessions || []);
    setLoading(false);
  }, [typeFilter, token]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const openAddForm = () => { setEditSession(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEditForm = (s: any) => {
    setEditSession(s);
    setForm({
      title: s.title, description: s.description || '',
      session_type: s.session_type, target_grades: s.target_grades || [],
      session_date: s.session_date ? s.session_date.substring(0, 16) : '',
      duration_minutes: s.duration_minutes, max_participants: s.max_participants || '',
      meeting_link: s.meeting_link || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const method = editSession ? 'PATCH' : 'POST';
    const body = editSession
      ? { id: editSession.id, ...form, session_date: form.session_date || null }
      : { ...form, session_date: form.session_date || null };

    const res = await fetch('/api/consultant/sessions', {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (res.ok) {
      setMessage({ type: 'success', text: editSession ? 'Session updated.' : 'Session scheduled successfully.' });
      setShowForm(false);
      setEditSession(null);
      fetchSessions();
    } else {
      setMessage({ type: 'error', text: data.error || 'Something went wrong.' });
    }
    setSaving(false);
    setTimeout(() => setMessage(null), 4000);
  };

  const markComplete = async (id: string) => {
    const res = await fetch('/api/consultant/sessions', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'completed' }),
    });
    if (res.ok) fetchSessions();
  };

  const cancelSession = async (id: string) => {
    if (!confirm('Cancel this session?')) return;
    const res = await fetch('/api/consultant/sessions', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'cancelled' }),
    });
    if (res.ok) fetchSessions();
  };

  const isConsultant = role === 'consultant';

  const scheduled  = sessions.filter(s => s.status === 'scheduled').length;
  const completed  = sessions.filter(s => s.status === 'completed').length;
  const upcoming   = sessions.filter(s => s.status === 'scheduled' && s.session_date && new Date(s.session_date) >= new Date());

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Career Sessions</h1>
          <p className="text-sm text-surface-400 mt-0.5">
            {isConsultant ? 'Schedule and manage your career guidance sessions' : 'Career counselling sessions for students'}
          </p>
        </div>
        {isConsultant && (
          <button onClick={openAddForm} className="btn-primary flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Session
          </button>
        )}
      </div>

      {/* Flash message */}
      {message && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium animate-fade-in ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Upcoming</p>
          <p className="text-2xl font-display font-bold text-brand-600 mt-1">{upcoming.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Scheduled</p>
          <p className="text-2xl font-display font-bold text-blue-600 mt-1">{scheduled}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Completed</p>
          <p className="text-2xl font-display font-bold text-emerald-600 mt-1">{completed}</p>
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: '',          label: 'All' },
          { value: 'scheduled', label: 'Scheduled' },
          { value: 'completed', label: 'Completed' },
          { value: 'cancelled', label: 'Cancelled' },
        ].map(f => (
          <button key={f.value} onClick={() => setTypeFilter(f.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              typeFilter === f.value ? 'bg-brand-500 text-white' : 'bg-white text-surface-500 border border-surface-200 hover:bg-surface-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Sessions list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="card p-5 h-32 animate-pulse bg-surface-100"/>)}
        </div>
      ) : sessions.length === 0 ? (
        <div className="card p-12 text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-surface-300 mb-4">
            <rect x="2" y="7" width="20" height="14" rx="2"/>
            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
          </svg>
          <p className="text-gray-900 font-semibold">No sessions found</p>
          <p className="text-sm text-surface-400 mt-1">
            {isConsultant ? 'Schedule your first career guidance session.' : 'No career sessions scheduled yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(s => {
            const sessionDate = s.session_date ? new Date(s.session_date) : null;
            const isPast = sessionDate && sessionDate < new Date();
            const isUpcoming = sessionDate && !isPast;

            return (
              <div key={s.id} className="card p-5 hover:shadow-card-hover transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Left: date block */}
                  <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${
                    isUpcoming ? 'bg-brand-50 text-brand-700' : 'bg-surface-100 text-surface-500'
                  }`}>
                    {sessionDate ? (
                      <>
                        <span className="text-lg font-display font-bold leading-none">{sessionDate.getDate()}</span>
                        <span className="text-[10px] font-semibold uppercase">{sessionDate.toLocaleString('en-IN', { month: 'short' })}</span>
                      </>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                      </svg>
                    )}
                  </div>

                  {/* Middle: info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <TypeBadge type={s.session_type} />
                      <StatusBadge status={s.status} />
                      {!isConsultant && s.consultant_name && (
                        <span className="text-xs text-surface-400">by {s.consultant_name}</span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{s.title}</p>
                    {s.description && (
                      <p className="text-xs text-surface-400 mt-1 line-clamp-2">{s.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-surface-400">
                      {sessionDate && (
                        <span className="flex items-center gap-1">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
                          </svg>
                          {sessionDate.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          {s.duration_minutes && ` · ${s.duration_minutes} min`}
                        </span>
                      )}
                      {s.target_grades?.length > 0 && (
                        <span className="flex items-center gap-1">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                          </svg>
                          {s.target_grades.join(', ')}
                        </span>
                      )}
                      {s.max_participants && (
                        <span className="flex items-center gap-1">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                          </svg>
                          Max {s.max_participants}
                        </span>
                      )}
                    </div>
                    {s.meeting_link && s.status === 'scheduled' && (
                      <a href={s.meeting_link} target="_blank" rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-brand-500 font-medium hover:underline">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        </svg>
                        Join Link
                      </a>
                    )}
                  </div>

                  {/* Right: actions (consultant only) */}
                  {isConsultant && s.status === 'scheduled' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => openEditForm(s)}
                        className="text-xs text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg font-medium transition-colors">
                        Edit
                      </button>
                      <button onClick={() => markComplete(s.id)}
                        className="text-xs text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg font-medium transition-colors">
                        Complete
                      </button>
                      <button onClick={() => cancelSession(s.id)}
                        className="text-xs text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg font-medium transition-colors">
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 sticky top-0 bg-white z-10">
              <h2 className="text-base font-display font-bold text-gray-900">
                {editSession ? 'Edit Session' : 'Schedule New Session'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-surface-500 mb-1.5">Session Title *</label>
                <input className="input-field" placeholder="e.g. Choosing the Right Stream After Grade 10"
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-semibold text-surface-500 mb-1.5">Session Type *</label>
                <select className="input-field" value={form.session_type} onChange={e => setForm(f => ({ ...f, session_type: e.target.value }))} required>
                  {SESSION_TYPES.filter(t => t.value).map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Date + Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-500 mb-1.5">Date & Time</label>
                  <input className="input-field" type="datetime-local"
                    value={form.session_date} onChange={e => setForm(f => ({ ...f, session_date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-500 mb-1.5">Duration (min)</label>
                  <input className="input-field" type="number" min="15" step="15" placeholder="60"
                    value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: parseInt(e.target.value) }))} />
                </div>
              </div>

              {/* Max participants + Meeting link */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-500 mb-1.5">Max Participants</label>
                  <input className="input-field" type="number" min="1" placeholder="Unlimited"
                    value={form.max_participants} onChange={e => setForm(f => ({ ...f, max_participants: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-500 mb-1.5">Meeting Link</label>
                  <input className="input-field" type="url" placeholder="https://..."
                    value={form.meeting_link} onChange={e => setForm(f => ({ ...f, meeting_link: e.target.value }))} />
                </div>
              </div>

              {/* Target grades */}
              <div>
                <label className="block text-xs font-semibold text-surface-500 mb-2">Target Grades</label>
                <div className="flex flex-wrap gap-2">
                  {GRADE_OPTIONS.map(g => (
                    <button key={g} type="button"
                      onClick={() => setForm(f => ({
                        ...f,
                        target_grades: f.target_grades.includes(g)
                          ? f.target_grades.filter(x => x !== g)
                          : [...f.target_grades, g],
                      }))}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        form.target_grades.includes(g)
                          ? 'bg-brand-500 text-white'
                          : 'bg-surface-100 text-surface-500 hover:bg-surface-200'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-surface-500 mb-1.5">Description</label>
                <textarea className="input-field resize-none" rows={3}
                  placeholder="What will students learn in this session?"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              {message && (
                <p className={`text-xs font-medium ${message.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
                  {message.text}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 rounded-xl border border-surface-200 text-sm font-medium text-surface-500 hover:bg-surface-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary">
                  {saving ? 'Saving...' : editSession ? 'Update Session' : 'Schedule Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
