'use client';

import { useState, useEffect } from 'react';

const MODES = [
  {
    id:   'class',
    label: 'Class-wise',
    icon:  '🏫',
    desc:  'Teacher marks attendance per class period with subject-wise breakdown',
    badge: 'Subject columns enabled',
    badgeCls: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400',
  },
  {
    id:   'daily',
    label: 'Daily Roll-call',
    icon:  '📋',
    desc:  'Single daily attendance per student — only School In / School Out',
    badge: 'School In / Out only',
    badgeCls: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400',
  },
  {
    id:   'card',
    label: 'ID Card Scan',
    icon:  '💳',
    desc:  'Students tap RFID/barcode card to mark presence',
    badge: 'Hardware required',
    badgeCls: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400',
  },
  {
    id:   'face',
    label: 'Face Recognition',
    icon:  '🤖',
    desc:  'Automated attendance via facial recognition camera',
    badge: 'Hardware required',
    badgeCls: 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400',
  },
];

const NOTIF_OPTIONS = [
  { id: 'absent_sms',    label: 'SMS on Absence' },
  { id: 'absent_push',   label: 'Push notification on Absence' },
  { id: 'late_notify',   label: 'Notify on Late Arrival' },
  { id: 'daily_summary', label: 'Daily summary to parents' },
];

export default function AttendanceConfigPage({ params }: { params: { id: string } }) {
  const [mode,         setMode]         = useState('class');
  const [graceMinutes, setGraceMinutes] = useState('15');
  const [notifs,       setNotifs]       = useState<string[]>(['absent_push']);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [error,        setError]        = useState('');

  // Load existing config
  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`/api/super-admin/schools/${params.id}/attendance-config`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { if (d.attendanceMode) setMode(d.attendanceMode); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.id]);

  function toggleNotif(id: string) {
    setNotifs(n => n.includes(id) ? n.filter(x => x !== id) : [...n, id]);
  }

  async function save() {
    setSaving(true); setError(''); setSaved(false);
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/super-admin/schools/${params.id}/attendance-config`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ attendanceMode: mode }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || 'Failed to save');
    }
    setSaving(false);
  }

  const selectedMode = MODES.find(m => m.id === mode);

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Attendance Configuration</h1>
        <p className="text-sm text-surface-400 mt-0.5">Choose how student attendance is captured for this school.</p>
      </div>

      {/* Attendance Mode */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Student Capture Mode</h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-xl bg-surface-100 dark:bg-gray-800 animate-pulse"/>)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${mode === m.id ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30' : 'border-surface-200 dark:border-gray-700 hover:border-brand-300'}`}
              >
                <div className="text-2xl mb-2">{m.icon}</div>
                <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">{m.label}</div>
                <div className="text-xs text-surface-400 mt-0.5 mb-2">{m.desc}</div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.badgeCls}`}>{m.badge}</span>
              </button>
            ))}
          </div>
        )}

        {/* Explain what the selected mode affects */}
        {selectedMode && (
          <div className="p-3 rounded-xl bg-surface-50 dark:bg-gray-800/50 border border-surface-100 dark:border-gray-700 text-xs text-surface-500 dark:text-gray-400 flex items-start gap-2">
            <svg width="14" height="14" className="shrink-0 mt-0.5 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>
              {mode === 'class' && 'In Class-wise mode, the student attendance table shows P / A / L / H / E status buttons per student, plus subject-wise columns. Teachers mark attendance per class period.'}
              {mode === 'daily' && 'In Daily Roll-call mode, only School In and School Out options appear in the student attendance table. One simple daily attendance record per student — no subject breakdown.'}
              {mode === 'card'  && 'ID Card Scan mode requires RFID/barcode hardware. Configure card mappings for each student separately.'}
              {mode === 'face'  && 'Face Recognition mode requires camera hardware and AI model setup. Contact support to enable.'}
            </span>
          </div>
        )}
      </div>

      {/* Grace Period */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Late Arrival Grace Period</h2>
        <div className="flex items-center gap-3">
          <input
            type="number"
            className="input-field w-28"
            value={graceMinutes}
            min={0}
            max={60}
            onChange={e => setGraceMinutes(e.target.value)}
          />
          <span className="text-sm text-surface-400">minutes after school start time</span>
        </div>
      </div>

      {/* Notifications */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Parent Notifications</h2>
        <div className="space-y-3">
          {NOTIF_OPTIONS.map(n => (
            <label key={n.id} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded accent-brand-500"
                checked={notifs.includes(n.id)}
                onChange={() => toggleNotif(n.id)}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{n.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving || loading} className="btn-primary">
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
        {saved  && <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Saved!</span>}
        {error  && <span className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</span>}
      </div>
    </div>
  );
}
