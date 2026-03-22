'use client';

import { useState } from 'react';

const MODES = [
  { id: 'class', label: 'Class-wise', icon: '🏫', desc: 'Teacher marks attendance per class period' },
  { id: 'daily', label: 'Daily Roll-call', icon: '📋', desc: 'Single daily attendance per student' },
  { id: 'card', label: 'ID Card Scan', icon: '💳', desc: 'Students tap RFID/barcode card to mark presence' },
  { id: 'face', label: 'Face Recognition', icon: '🤖', desc: 'Automated attendance via facial recognition camera' },
];

const NOTIF_OPTIONS = [
  { id: 'absent_sms', label: 'SMS on Absence' },
  { id: 'absent_push', label: 'Push notification on Absence' },
  { id: 'late_notify', label: 'Notify on Late Arrival' },
  { id: 'daily_summary', label: 'Daily summary to parents' },
];

export default function AttendanceConfigPage({ params }: { params: { id: string } }) {
  const [mode, setMode] = useState('class');
  const [graceMinutes, setGraceMinutes] = useState('15');
  const [notifs, setNotifs] = useState<string[]>(['absent_push']);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggleNotif(id: string) {
    setNotifs(n => n.includes(id) ? n.filter(x => x !== id) : [...n, id]);
  }

  async function save() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600)); // placeholder – wire to API when ready
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Attendance Configuration</h1>
        <p className="text-sm text-surface-400 mt-0.5">Choose how attendance is captured for this school.</p>
      </div>

      {/* Attendance Mode */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Capture Mode</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${mode === m.id ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30' : 'border-surface-200 dark:border-gray-700 hover:border-brand-300'}`}
            >
              <div className="text-2xl mb-2">{m.icon}</div>
              <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">{m.label}</div>
              <div className="text-xs text-surface-400 mt-0.5">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Grace Period */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Late Arrival Grace Period</h2>
        <div className="flex items-center gap-3">
          <input
            type="number"
            className="input w-28"
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
        <button onClick={save} disabled={saving} className="btn btn-primary">
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
        {saved && <span className="text-sm text-emerald-600 font-medium">Saved!</span>}
      </div>
    </div>
  );
}
