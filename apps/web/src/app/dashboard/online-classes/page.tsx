'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type OnlineClass = {
  id: string;
  title: string;
  subject: string | null;
  platform: string;
  meetingLink: string | null;
  meetingId: string | null;
  meetingPassword: string | null;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  isRecorded: boolean;
  recordingUrl: string | null;
  class?: { name: string; grade: string; section: string };
  teacher?: { user: { firstName: string; lastName: string } };
  attendances?: { id: string; status: string }[];
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  live:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  ended:     'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  cancelled: 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400',
};

function getTimeLabel(scheduledAt: string, status: string): { label: string; urgent: boolean } {
  if (status === 'live')      return { label: 'In Progress', urgent: true };
  if (status === 'ended')     return { label: 'Ended', urgent: false };
  if (status === 'cancelled') return { label: 'Cancelled', urgent: false };

  const diff = new Date(scheduledAt).getTime() - Date.now();
  if (diff < 0) return { label: 'Starting now', urgent: true };

  const mins = Math.floor(diff / 60000);
  if (mins < 60)  return { label: `In ${mins} min`, urgent: mins <= 15 };
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return { label: `In ${hrs}h ${mins % 60}m`, urgent: false };
  const days = Math.floor(hrs / 24);
  return { label: `In ${days}d`, urgent: false };
}

function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'default') Notification.requestPermission();
}

function scheduleClassNotifications(classes: OnlineClass[], notifiedRef: React.MutableRefObject<Set<string>>) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const now = Date.now();
  classes.forEach(c => {
    if (c.status === 'ended' || c.status === 'cancelled') return;
    const classTime = new Date(c.scheduledAt).getTime();
    const reminderTime = classTime - 15 * 60 * 1000;
    const delay = reminderTime - now;
    const reminderKey = `reminder_${c.id}`;

    if (delay > 0 && !notifiedRef.current.has(reminderKey)) {
      notifiedRef.current.add(reminderKey);
      setTimeout(() => {
        const n = new Notification(`⏰ Class in 15 min — ${c.title}`, {
          body: `${c.subject ? c.subject + ' · ' : ''}${new Date(c.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}${c.meetingLink ? '\nClick to open meeting link.' : ''}`,
          icon: '/favicon.ico',
          tag: reminderKey,
        });
        if (c.meetingLink) n.onclick = () => window.open(c.meetingLink!, '_blank');
      }, delay);
    }
  });
}

export default function OnlineClassesPage() {
  const router = useRouter();
  const [classes,  setClasses]  = useState<OnlineClass[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [view,     setView]     = useState<'today' | 'upcoming' | 'past'>('today');
  const [userRole, setUserRole] = useState('');
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | 'unsupported'>('default');
  const notifiedRef = useRef<Set<string>>(new Set());

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  const getRole = () => {
    if (typeof window === 'undefined' || !token) return '';
    try { return JSON.parse(atob(token.split('.')[1])).primaryRole || ''; } catch { return ''; }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPerm(Notification.permission);
    } else {
      setNotifPerm('unsupported');
    }
  }, []);

  const load = () => {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const params = view === 'today' ? `?date=${today}` : view === 'upcoming' ? '?upcoming=true' : '';
    fetch(`/api/online-classes${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const list: OnlineClass[] = d.classes ?? [];
        setClasses(list);
        setLoading(false);
        scheduleClassNotifications(list, notifiedRef);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { setUserRole(getRole()); load(); }, [view]);

  const handleEnableNotifications = async () => {
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
    if (perm === 'granted') scheduleClassNotifications(classes, notifiedRef);
  };

  const isTeacherOrAdmin = ['teacher', 'school_admin', 'principal', 'hod'].includes(userRole);

  const updateStatus = async (id: string, status: string) => {
    await fetch('/api/online-classes', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    load();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Online Classes</h1>
          <p className="text-sm text-surface-400 mt-0.5">
            {isTeacherOrAdmin ? 'Manage and host live classes for your students.' : 'Join live classes and access recordings.'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {notifPerm === 'default' && (
            <button
              onClick={handleEnableNotifications}
              className="btn btn-secondary btn-sm text-xs flex items-center gap-1"
            >
              🔔 Enable reminders
            </button>
          )}
          {isTeacherOrAdmin && (
            <button onClick={() => router.push('/dashboard/online-classes/create')} className="btn btn-primary">
              + Create Class
            </button>
          )}
        </div>
      </div>

      {notifPerm === 'granted' && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 -mt-2">
          🔔 Browser reminders active — you'll be notified 15 min before each class.
        </p>
      )}

      <div className="flex gap-2">
        {(['today', 'upcoming', 'past'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1.5 text-sm rounded-full font-medium capitalize transition-colors ${view === v ? 'bg-brand-500 text-white' : 'bg-surface-100 dark:bg-gray-800 text-surface-500'}`}
          >
            {v === 'today' ? "Today's" : v}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="card p-4 animate-pulse h-24 bg-surface-100 dark:bg-gray-800" />)}
        </div>
      ) : classes.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-surface-400 text-sm">
            No online classes {view === 'today' ? 'scheduled for today' : view === 'upcoming' ? 'upcoming' : 'in the past'}.
          </p>
          {isTeacherOrAdmin && (
            <button onClick={() => router.push('/dashboard/online-classes/create')} className="text-brand-600 dark:text-brand-400 text-sm mt-2 hover:underline block">
              Create one now →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {classes.map(c => {
            const dt      = new Date(c.scheduledAt);
            const isLive  = c.status === 'live';
            const isPast  = dt < new Date() && c.status !== 'live';
            const timing  = getTimeLabel(c.scheduledAt, c.status);

            return (
              <div key={c.id} className={`card p-5 space-y-3 ${isLive ? 'border-2 border-emerald-400 dark:border-emerald-600' : ''}`}>
                {/* Header row */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{c.title}</h3>
                      {isLive && (
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> LIVE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-surface-400 mt-0.5">
                      {c.subject && `${c.subject} · `}
                      {c.class ? `${c.class.grade}-${c.class.section} · ` : ''}
                      {c.teacher ? `${c.teacher.user.firstName} ${c.teacher.user.lastName} · ` : ''}
                      {dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                  </div>

                  {/* Right badges */}
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {/* Prominent timing chip */}
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${timing.urgent ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400' : 'bg-surface-100 dark:bg-gray-700 text-surface-500 dark:text-gray-400'}`}>
                      🕐 {dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · {timing.label}
                    </span>
                    <span className="text-xs bg-surface-100 dark:bg-gray-700 px-2 py-0.5 rounded-full uppercase font-medium">{c.platform}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[c.status] ?? ''}`}>{c.status}</span>
                    <span className="text-xs text-surface-400">{c.durationMinutes} min</span>
                  </div>
                </div>

                {/* Meeting credentials */}
                {(c.meetingId || c.meetingPassword) && c.status !== 'cancelled' && (
                  <div className="flex items-center gap-4 flex-wrap text-xs text-surface-500 dark:text-gray-400 bg-surface-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
                    {c.meetingId && (
                      <span className="flex items-center gap-1">
                        <span className="font-medium text-gray-600 dark:text-gray-300">Meeting ID:</span>
                        <code className="font-mono bg-white dark:bg-gray-700 px-1.5 py-0.5 rounded border border-surface-200 dark:border-gray-600 select-all">{c.meetingId}</code>
                      </span>
                    )}
                    {c.meetingPassword && (
                      <span className="flex items-center gap-1">
                        <span className="font-medium text-gray-600 dark:text-gray-300">Password:</span>
                        <code className="font-mono bg-white dark:bg-gray-700 px-1.5 py-0.5 rounded border border-surface-200 dark:border-gray-600 select-all">{c.meetingPassword}</code>
                      </span>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-3 flex-wrap">
                  {c.meetingLink && c.status !== 'ended' && c.status !== 'cancelled' && (
                    <a
                      href={c.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`btn btn-sm inline-flex items-center gap-1.5 ${isLive ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      {isLive ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-white animate-pulse inline-block" />
                          Join Live Class
                        </>
                      ) : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                          </svg>
                          Open Meeting Link
                        </>
                      )}
                    </a>
                  )}
                  {c.isRecorded && c.recordingUrl && (
                    <a href={c.recordingUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm inline-flex items-center gap-1">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                      </svg>
                      Watch Recording
                    </a>
                  )}
                  {isTeacherOrAdmin && c.status === 'scheduled' && !isPast && (
                    <button onClick={() => updateStatus(c.id, 'live')} className="btn btn-primary btn-sm">
                      Start Class
                    </button>
                  )}
                  {isTeacherOrAdmin && c.status === 'live' && (
                    <>
                      <button onClick={() => updateStatus(c.id, 'ended')} className="btn btn-secondary btn-sm">End Class</button>
                      <button onClick={() => router.push(`/dashboard/online-classes/${c.id}/attendance`)} className="btn btn-secondary btn-sm">
                        Mark Attendance
                      </button>
                    </>
                  )}
                  {isTeacherOrAdmin && c.status === 'ended' && (
                    <button onClick={() => router.push(`/dashboard/online-classes/${c.id}/attendance`)} className="btn btn-secondary btn-sm text-xs">
                      View Attendance
                    </button>
                  )}
                </div>

                {isTeacherOrAdmin && c.attendances && c.status !== 'scheduled' && (
                  <p className="text-xs text-surface-400">
                    Attendance: {c.attendances.filter(a => a.status === 'present').length} / {c.attendances.length} present
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
