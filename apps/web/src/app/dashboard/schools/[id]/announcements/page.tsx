'use client';

import { useState } from 'react';

export default function AnnouncementsConfigPage({ params }: { params: { id: string } }) {
  const [allowTeacherPost, setAllowTeacherPost] = useState(true);
  const [requireApproval, setRequireApproval] = useState(false);
  const [targetAudiences, setTargetAudiences] = useState<string[]>(['parents', 'teachers', 'students']);
  const [channels, setChannels] = useState<string[]>(['in_app', 'push']);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const AUDIENCES = [
    { id: 'parents', label: 'Parents' },
    { id: 'teachers', label: 'Teachers' },
    { id: 'students', label: 'Students' },
    { id: 'all_staff', label: 'All Staff' },
  ];

  const CHANNELS = [
    { id: 'in_app', label: 'In-App Notification' },
    { id: 'push', label: 'Push Notification' },
    { id: 'sms', label: 'SMS' },
    { id: 'email', label: 'Email' },
  ];

  function toggleAudience(id: string) {
    setTargetAudiences(n => n.includes(id) ? n.filter(x => x !== id) : [...n, id]);
  }
  function toggleChannel(id: string) {
    setChannels(n => n.includes(id) ? n.filter(x => x !== id) : [...n, id]);
  }

  async function save() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Announcements Configuration</h1>
        <p className="text-sm text-surface-400 mt-0.5">Control who can post, delivery channels and target audiences.</p>
      </div>

      <div className="card p-6 space-y-5">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Posting Permissions</h2>

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200">Allow teachers to post announcements</div>
            <div className="text-xs text-surface-400">Teachers can create announcements for their class</div>
          </div>
          <div onClick={() => setAllowTeacherPost(v => !v)} className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${allowTeacherPost ? 'bg-brand-500' : 'bg-surface-300 dark:bg-gray-600'} relative`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${allowTeacherPost ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200">Require admin approval</div>
            <div className="text-xs text-surface-400">Teacher announcements need school admin approval before sending</div>
          </div>
          <div onClick={() => setRequireApproval(v => !v)} className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${requireApproval ? 'bg-brand-500' : 'bg-surface-300 dark:bg-gray-600'} relative`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${requireApproval ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </label>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Default Target Audiences</h2>
        <div className="flex flex-wrap gap-2">
          {AUDIENCES.map(a => (
            <button
              key={a.id}
              onClick={() => toggleAudience(a.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${targetAudiences.includes(a.id) ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300' : 'border-surface-200 dark:border-gray-700 text-surface-400'}`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Delivery Channels</h2>
        <div className="space-y-3">
          {CHANNELS.map(c => (
            <label key={c.id} className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded accent-brand-500" checked={channels.includes(c.id)} onChange={() => toggleChannel(c.id)} />
              <span className="text-sm text-gray-700 dark:text-gray-300">{c.label}</span>
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
