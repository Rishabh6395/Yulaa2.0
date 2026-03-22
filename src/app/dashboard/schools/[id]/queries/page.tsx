'use client';

import { useState } from 'react';

const CATEGORIES_DEFAULT = ['Academic', 'Fee', 'Transport', 'Attendance', 'Behaviour', 'General'];

export default function QueriesConfigPage({ params }: { params: { id: string } }) {
  const [categories, setCategories] = useState<string[]>(CATEGORIES_DEFAULT);
  const [newCategory, setNewCategory] = useState('');
  const [slaHours, setSlaHours] = useState('24');
  const [allowAnonymous, setAllowAnonymous] = useState(false);
  const [autoAssign, setAutoAssign] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function addCategory() {
    if (!newCategory.trim()) return;
    setCategories(c => [...c, newCategory.trim()]);
    setNewCategory('');
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
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Queries Configuration</h1>
        <p className="text-sm text-surface-400 mt-0.5">Configure query categories, SLA and assignment rules.</p>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Query Categories</h2>
        <div className="flex flex-wrap gap-2">
          {categories.map(c => (
            <span key={c} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-surface-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              {c}
              <button onClick={() => setCategories(cats => cats.filter(x => x !== c))} className="text-surface-400 hover:text-red-500">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="input flex-1" placeholder="Add category..." value={newCategory} onChange={e => setNewCategory(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCategory()} />
          <button onClick={addCategory} className="btn btn-secondary">Add</button>
        </div>
      </div>

      <div className="card p-6 space-y-5">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Response Settings</h2>

        <div>
          <label className="label">Response SLA (hours)</label>
          <div className="flex items-center gap-2 mt-1">
            <input className="input w-28" type="number" min={1} max={168} value={slaHours} onChange={e => setSlaHours(e.target.value)} />
            <span className="text-sm text-surface-400">hours to first response</span>
          </div>
          <p className="text-xs text-surface-400 mt-1">Overdue queries will be flagged after this window</p>
        </div>

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200">Auto-assign queries to admin</div>
            <div className="text-xs text-surface-400">Unassigned queries are automatically routed to school admin</div>
          </div>
          <div onClick={() => setAutoAssign(v => !v)} className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${autoAssign ? 'bg-brand-500' : 'bg-surface-300 dark:bg-gray-600'} relative`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoAssign ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200">Allow anonymous queries</div>
            <div className="text-xs text-surface-400">Parents can submit without identifying themselves</div>
          </div>
          <div onClick={() => setAllowAnonymous(v => !v)} className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${allowAnonymous ? 'bg-brand-500' : 'bg-surface-300 dark:bg-gray-600'} relative`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${allowAnonymous ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </label>
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
