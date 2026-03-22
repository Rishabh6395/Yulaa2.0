'use client';

import { useState } from 'react';

const REPORT_TEMPLATES = [
  { id: 'attendance_monthly', label: 'Monthly Attendance Report', category: 'Attendance', format: 'Excel' },
  { id: 'attendance_daily', label: 'Daily Attendance Sheet', category: 'Attendance', format: 'Excel/PDF' },
  { id: 'fee_collection', label: 'Fee Collection Summary', category: 'Fees', format: 'Excel' },
  { id: 'fee_pending', label: 'Pending Fees Report', category: 'Fees', format: 'Excel' },
  { id: 'student_list', label: 'Student Master List', category: 'Students', format: 'Excel' },
  { id: 'class_strength', label: 'Class Strength Report', category: 'Students', format: 'Excel/PDF' },
  { id: 'teacher_list', label: 'Teacher Directory', category: 'Staff', format: 'Excel' },
  { id: 'homework_completion', label: 'Homework Completion Rate', category: 'Academic', format: 'Excel' },
  { id: 'leave_summary', label: 'Leave Summary', category: 'Leave', format: 'Excel' },
  { id: 'admission_status', label: 'Admission Status Report', category: 'Admissions', format: 'Excel' },
];

const CATEGORIES = ['All', ...Array.from(new Set(REPORT_TEMPLATES.map(r => r.category)))];

export default function ReportsPage({ params }: { params: { id: string } }) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [generating, setGenerating] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filtered = REPORT_TEMPLATES.filter(r => activeCategory === 'All' || r.category === activeCategory);

  async function generateReport(id: string) {
    setGenerating(id);
    await new Promise(r => setTimeout(r, 1200)); // placeholder
    setGenerating(null);
    // In real impl: trigger download
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Reports</h1>
        <p className="text-sm text-surface-400 mt-0.5">Generate and download school reports in Excel or PDF format.</p>
      </div>

      {/* Date Range */}
      <div className="card p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 font-medium">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Date Range
        </div>
        <input className="input w-36" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <span className="text-surface-400 text-sm">to</span>
        <input className="input w-36" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setActiveCategory(c)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${activeCategory === c ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300' : 'border-surface-200 dark:border-gray-700 text-surface-400 hover:border-brand-300'}`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Report List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filtered.map(r => (
          <div key={r.id} className="card p-4 flex items-center justify-between gap-3">
            <div>
              <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{r.label}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs bg-surface-100 dark:bg-gray-700 text-surface-400 px-2 py-0.5 rounded">{r.category}</span>
                <span className="text-xs text-surface-400">{r.format}</span>
              </div>
            </div>
            <button
              onClick={() => generateReport(r.id)}
              disabled={generating === r.id}
              className="btn btn-secondary text-sm flex items-center gap-1.5 shrink-0"
            >
              {generating === r.id ? (
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              )}
              {generating === r.id ? 'Generating...' : 'Download'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
