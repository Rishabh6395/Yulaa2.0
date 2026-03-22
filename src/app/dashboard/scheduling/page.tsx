'use client';

import { useState } from 'react';
import { useApi } from '@/hooks/useApi';

export default function SchedulingPage() {
  const [selectedClass, setSelectedClass] = useState('');
  const { data: classData } = useApi<{ classes: any[] }>('/api/classes');
  const classes = classData?.classes || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Scheduling</h1>
        <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">Manage class schedules by class, section, and subject</p>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Class</label>
            <select className="input-field" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
              <option value="">Select class</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.grade} - {c.section}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!selectedClass ? (
        <div className="card p-12 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-400">
              <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
              <circle cx="8" cy="15" r="1" fill="currentColor"/>
              <circle cx="12" cy="15" r="1" fill="currentColor"/>
              <circle cx="16" cy="15" r="1" fill="currentColor"/>
            </svg>
          </div>
          <p className="text-gray-900 dark:text-gray-100 font-semibold">Select a class to view schedule</p>
          <p className="text-sm text-surface-400">Choose a class and section from above to manage the timetable.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-surface-100 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Weekly Schedule</h3>
            <p className="text-xs text-surface-400 mt-0.5">{classes.find(c => c.id === selectedClass)?.grade} - {classes.find(c => c.id === selectedClass)?.section}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table text-xs min-w-[700px]">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Monday</th>
                  <th>Tuesday</th>
                  <th>Wednesday</th>
                  <th>Thursday</th>
                  <th>Friday</th>
                  <th>Saturday</th>
                </tr>
              </thead>
              <tbody>
                {['1', '2', '3', '4', 'Lunch', '5', '6', '7'].map(period => (
                  <tr key={period}>
                    <td className="font-semibold text-gray-900 dark:text-gray-100">{period === 'Lunch' ? '🍽 Lunch' : `Period ${period}`}</td>
                    {['mon','tue','wed','thu','fri','sat'].map(day => (
                      <td key={day}>
                        {period === 'Lunch' ? (
                          <span className="text-surface-300">—</span>
                        ) : (
                          <input
                            className="w-full text-xs border border-surface-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-400 dark:bg-gray-900 dark:border-gray-700"
                            placeholder="Subject / Teacher"
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-surface-100 dark:border-gray-800 flex justify-end">
            <button className="btn-primary text-sm">Save Schedule</button>
          </div>
        </div>
      )}
    </div>
  );
}
