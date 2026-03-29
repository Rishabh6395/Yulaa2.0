'use client';

import { useState } from 'react';

const GRADE_SCALES = [
  { id: 'percentage', label: 'Percentage (0–100)' },
  { id: 'letter', label: 'Letter Grade (A+, A, B, C, D, F)' },
  { id: 'cgpa', label: 'CGPA (10-point scale)' },
  { id: 'marks', label: 'Marks out of fixed total' },
];

const GRADE_BOUNDARIES_DEFAULT = [
  { label: 'A+', min: 90, max: 100, color: '#22c55e' },
  { label: 'A', min: 80, max: 89, color: '#84cc16' },
  { label: 'B', min: 70, max: 79, color: '#eab308' },
  { label: 'C', min: 60, max: 69, color: '#f97316' },
  { label: 'D', min: 50, max: 59, color: '#ef4444' },
  { label: 'F', min: 0, max: 49, color: '#dc2626' },
];

export default function PerformanceConfigPage({ params }: { params: { id: string } }) {
  const [gradeScale, setGradeScale] = useState('percentage');
  const [terms, setTerms] = useState(['Term 1', 'Term 2', 'Final']);
  const [newTerm, setNewTerm] = useState('');
  const [publishToParents, setPublishToParents] = useState(true);
  const [showRank, setShowRank] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function addTerm() {
    if (!newTerm.trim()) return;
    setTerms(t => [...t, newTerm.trim()]);
    setNewTerm('');
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
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Performance Configuration</h1>
        <p className="text-sm text-surface-400 mt-0.5">Grade scales, terms and report card settings.</p>
      </div>

      {/* Grading Scale */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Grading Scale</h2>
        <div className="space-y-2">
          {GRADE_SCALES.map(gs => (
            <label key={gs.id} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-surface-50 dark:hover:bg-gray-700/30">
              <input type="radio" className="accent-brand-500" name="gradeScale" value={gs.id} checked={gradeScale === gs.id} onChange={() => setGradeScale(gs.id)} />
              <span className="text-sm text-gray-700 dark:text-gray-300">{gs.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Grade Boundaries */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Grade Boundaries</h2>
        <div className="space-y-2">
          {GRADE_BOUNDARIES_DEFAULT.map(g => (
            <div key={g.label} className="flex items-center gap-3 text-sm">
              <span className="w-8 h-7 flex items-center justify-center rounded-md font-bold text-white text-xs" style={{ background: g.color }}>
                {g.label}
              </span>
              <span className="text-surface-400">{g.min}% – {g.max}%</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-surface-400">Grade boundary editing coming soon.</p>
      </div>

      {/* Terms */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Academic Terms / Exams</h2>
        <div className="flex flex-wrap gap-2">
          {terms.map(t => (
            <span key={t} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-surface-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              {t}
              <button onClick={() => setTerms(ts => ts.filter(x => x !== t))} className="text-surface-400 hover:text-red-500">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="input flex-1" placeholder="Add term..." value={newTerm} onChange={e => setNewTerm(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTerm()} />
          <button onClick={addTerm} className="btn btn-secondary">Add</button>
        </div>
      </div>

      {/* Report Card Settings */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Report Card Settings</h2>

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200">Publish results to parents automatically</div>
            <div className="text-xs text-surface-400">Parents see results in their app after admin publishes</div>
          </div>
          <div onClick={() => setPublishToParents(v => !v)} className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${publishToParents ? 'bg-brand-500' : 'bg-surface-300 dark:bg-gray-600'} relative`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${publishToParents ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200">Show class rank to parents</div>
            <div className="text-xs text-surface-400">Display student rank in class on report card</div>
          </div>
          <div onClick={() => setShowRank(v => !v)} className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${showRank ? 'bg-brand-500' : 'bg-surface-300 dark:bg-gray-600'} relative`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${showRank ? 'translate-x-5' : 'translate-x-0.5'}`} />
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
