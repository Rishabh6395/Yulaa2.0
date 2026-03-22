'use client';

import { useState } from 'react';

interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'upcoming' | 'completed';
}

const SAMPLE_YEARS: AcademicYear[] = [
  { id: '1', name: '2024–25', startDate: '2024-06-01', endDate: '2025-03-31', status: 'active' },
  { id: '2', name: '2023–24', startDate: '2023-06-01', endDate: '2024-03-31', status: 'completed' },
];

const CLASS_PROMOTIONS = [
  { from: 'Grade 1', to: 'Grade 2' },
  { from: 'Grade 2', to: 'Grade 3' },
  { from: 'Grade 3', to: 'Grade 4' },
  { from: 'Grade 4', to: 'Grade 5' },
  { from: 'Grade 5', to: 'Grade 6' },
  { from: 'Grade 6', to: 'Grade 7' },
  { from: 'Grade 7', to: 'Grade 8' },
  { from: 'Grade 8', to: 'Grade 9' },
  { from: 'Grade 9', to: 'Grade 10' },
  { from: 'Grade 10', to: 'Grade 11' },
  { from: 'Grade 11', to: 'Grade 12' },
  { from: 'Grade 12', to: 'Alumni / Passout' },
];

const STATUS_STYLES: Record<string, string> = {
  active:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  upcoming:  'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  completed: 'bg-surface-100 text-surface-400 dark:bg-gray-700 dark:text-gray-400',
};

export default function AcademicYearCyclePage({ params }: { params: { id: string } }) {
  const [years, setYears] = useState<AcademicYear[]>(SAMPLE_YEARS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [newYear, setNewYear] = useState({ name: '', startDate: '', endDate: '' });
  const [selectedPromotions, setSelectedPromotions] = useState<string[]>(CLASS_PROMOTIONS.map(p => p.from));
  const [promoting, setPromoting] = useState(false);
  const [promoted, setPromoted] = useState(false);
  const [saving, setSaving] = useState(false);

  function addYear() {
    if (!newYear.name || !newYear.startDate || !newYear.endDate) return;
    const y: AcademicYear = { id: Date.now().toString(), ...newYear, status: 'upcoming' };
    setYears(ys => [...ys, y]);
    setNewYear({ name: '', startDate: '', endDate: '' });
    setShowAddModal(false);
  }

  function setActive(id: string) {
    setYears(ys => ys.map(y => ({ ...y, status: y.id === id ? 'active' : y.status === 'active' ? 'completed' : y.status })));
  }

  function togglePromotion(from: string) {
    setSelectedPromotions(p => p.includes(from) ? p.filter(x => x !== from) : [...p, from]);
  }

  async function runPromotion() {
    setPromoting(true);
    await new Promise(r => setTimeout(r, 1500));
    setPromoting(false); setPromoted(true);
    setShowPromoteModal(false);
    setTimeout(() => setPromoted(false), 3000);
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Academic Year Cycle</h1>
        <p className="text-sm text-surface-400 mt-0.5">Manage academic years, student promotions and year transitions.</p>
      </div>

      {/* Academic Years */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Academic Years</h2>
          <button onClick={() => setShowAddModal(true)} className="btn btn-secondary text-sm flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Year
          </button>
        </div>
        <div className="space-y-3">
          {years.map(y => (
            <div key={y.id} className="flex items-center justify-between p-4 rounded-xl border border-surface-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{y.name}</div>
                  <div className="text-xs text-surface-400 mt-0.5">
                    {new Date(y.startDate).toLocaleDateString()} – {new Date(y.endDate).toLocaleDateString()}
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-md capitalize ${STATUS_STYLES[y.status]}`}>
                  {y.status}
                </span>
              </div>
              {y.status !== 'active' && y.status !== 'completed' && (
                <button onClick={() => setActive(y.id)} className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                  Set Active
                </button>
              )}
              {y.status === 'active' && (
                <span className="text-xs text-emerald-600 font-medium">Current Year</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Student Promotion */}
      <div className="card p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Year-End Student Promotion</h2>
          <p className="text-sm text-surface-400 mt-0.5">
            Bulk-promote students from one grade to the next at the end of the academic year.
          </p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <div className="text-sm text-amber-800 dark:text-amber-300">
              <strong>Important:</strong> Promotion is irreversible per year. Ensure all results are finalised and fee balances are cleared before running promotion. Students with pending fees will be flagged but not blocked.
            </div>
          </div>
        </div>
        <button onClick={() => setShowPromoteModal(true)} className="btn btn-primary flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M21.36 15.57A10 10 0 1 1 9.26 4.76"/></svg>
          Run Year-End Promotion
        </button>
        {promoted && (
          <div className="text-sm text-emerald-600 font-medium flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20,6 9,17 4,12"/></svg>
            Promotion completed successfully!
          </div>
        )}
      </div>

      {/* Add Year Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add Academic Year</h2>
            <div className="space-y-3">
              <div>
                <label className="label">Year Name</label>
                <input className="input" placeholder="e.g. 2025–26" value={newYear.name} onChange={e => setNewYear(y => ({ ...y, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Start Date</label>
                  <input className="input" type="date" value={newYear.startDate} onChange={e => setNewYear(y => ({ ...y, startDate: e.target.value }))} />
                </div>
                <div>
                  <label className="label">End Date</label>
                  <input className="input" type="date" value={newYear.endDate} onChange={e => setNewYear(y => ({ ...y, endDate: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={addYear} className="btn btn-primary">Add Year</button>
            </div>
          </div>
        </div>
      )}

      {/* Promote Modal */}
      {showPromoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Year-End Student Promotion</h2>
              <p className="text-sm text-surface-400 mt-0.5">Select which grades should be promoted.</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-surface-400 uppercase tracking-wide">Promotion Map</span>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedPromotions(CLASS_PROMOTIONS.map(p => p.from))} className="text-xs text-brand-600 font-medium">Select All</button>
                  <button onClick={() => setSelectedPromotions([])} className="text-xs text-surface-400 font-medium">Clear</button>
                </div>
              </div>
              {CLASS_PROMOTIONS.map(p => (
                <label key={p.from} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-50 dark:hover:bg-gray-700/30 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-brand-500"
                    checked={selectedPromotions.includes(p.from)}
                    onChange={() => togglePromotion(p.from)}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{p.from}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-surface-300"><polyline points="9,18 15,12 9,6"/></svg>
                  <span className="text-sm text-surface-400">{p.to}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-surface-100 dark:border-gray-700">
              <button onClick={() => setShowPromoteModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={runPromotion} disabled={promoting || selectedPromotions.length === 0} className="btn btn-primary flex items-center gap-2">
                {promoting ? (
                  <>
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    Promoting...
                  </>
                ) : `Promote ${selectedPromotions.length} Grade${selectedPromotions.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
