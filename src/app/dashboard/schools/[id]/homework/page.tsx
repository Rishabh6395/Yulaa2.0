'use client';

import { useState } from 'react';

export default function HomeworkConfigPage({ params }: { params: { id: string } }) {
  const [allowAttachments, setAllowAttachments] = useState(true);
  const [maxFileSizeMb, setMaxFileSizeMb] = useState('10');
  const [allowedTypes, setAllowedTypes] = useState<string[]>(['pdf', 'doc', 'image']);
  const [reminderHour, setReminderHour] = useState('18');
  const [notifyParents, setNotifyParents] = useState(true);
  const [notifyOnSubmit, setNotifyOnSubmit] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggleType(t: string) {
    setAllowedTypes(n => n.includes(t) ? n.filter(x => x !== t) : [...n, t]);
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
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Homework Configuration</h1>
        <p className="text-sm text-surface-400 mt-0.5">Configure homework submission and notification settings.</p>
      </div>

      <div className="card p-6 space-y-5">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Submission Settings</h2>

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200">Allow file attachments</div>
            <div className="text-xs text-surface-400">Students can upload files with homework submissions</div>
          </div>
          <div onClick={() => setAllowAttachments(v => !v)} className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${allowAttachments ? 'bg-brand-500' : 'bg-surface-300 dark:bg-gray-600'} relative`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${allowAttachments ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </label>

        {allowAttachments && (
          <>
            <div>
              <label className="label">Max file size (MB)</label>
              <input className="input w-28" type="number" value={maxFileSizeMb} min={1} max={100} onChange={e => setMaxFileSizeMb(e.target.value)} />
            </div>
            <div>
              <label className="label">Allowed file types</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {['pdf', 'doc', 'image', 'video', 'audio', 'spreadsheet'].map(t => (
                  <button
                    key={t}
                    onClick={() => toggleType(t)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${allowedTypes.includes(t) ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300' : 'border-surface-200 dark:border-gray-700 text-surface-400'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="card p-6 space-y-5">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Notifications</h2>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm text-gray-800 dark:text-gray-200">Notify parents when homework is assigned</span>
          <div onClick={() => setNotifyParents(v => !v)} className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${notifyParents ? 'bg-brand-500' : 'bg-surface-300 dark:bg-gray-600'} relative`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifyParents ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm text-gray-800 dark:text-gray-200">Notify teacher when student submits</span>
          <div onClick={() => setNotifyOnSubmit(v => !v)} className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${notifyOnSubmit ? 'bg-brand-500' : 'bg-surface-300 dark:bg-gray-600'} relative`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifyOnSubmit ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </label>

        <div>
          <label className="label">Daily reminder time</label>
          <div className="flex items-center gap-2 mt-1">
            <input className="input w-28" type="number" min={0} max={23} value={reminderHour} onChange={e => setReminderHour(e.target.value)} />
            <span className="text-sm text-surface-400">:00 (24h format)</span>
          </div>
          <p className="text-xs text-surface-400 mt-1">Pending homework reminder sent to parents at this hour</p>
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
