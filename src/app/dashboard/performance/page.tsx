'use client';

import { useState, useEffect, useCallback } from 'react';

const SUBJECTS = ['English', 'Hindi', 'Science', 'Social Studies', 'Mathematics', 'Sanskrit', 'Drawing', 'IT'];
const GRADES = ['A+', 'A', 'B+', 'B', 'C', 'D', 'F'];

const gradeColor: Record<string, string> = {
  'A+': 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
  'A':  'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
  'B+': 'text-blue-600 bg-blue-50 dark:bg-blue-950/40',
  'B':  'text-blue-600 bg-blue-50 dark:bg-blue-950/40',
  'C':  'text-amber-600 bg-amber-50 dark:bg-amber-950/40',
  'D':  'text-orange-600 bg-orange-50 dark:bg-orange-950/40',
  'F':  'text-red-600 bg-red-50 dark:bg-red-950/40',
};

function ScoreBar({ score, max = 100 }: { score: number; max?: number }) {
  const pct = Math.round((score / max) * 100);
  const color = pct >= 80 ? 'bg-emerald-400' : pct >= 60 ? 'bg-blue-400' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-surface-100 dark:bg-gray-800 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }}/>
      </div>
      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-10 text-right">{score}/{max}</span>
    </div>
  );
}

// Mock performance data — in production this would come from an API
function mockPerformance(studentId: string) {
  const seed = studentId.charCodeAt(0) || 70;
  return SUBJECTS.map(subject => {
    const score = Math.min(100, Math.max(30, (seed + subject.length * 7) % 100));
    const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B+' : score >= 60 ? 'B' : score >= 50 ? 'C' : score >= 40 ? 'D' : 'F';
    return { subject, score, max: 100, grade };
  });
}

export default function PerformancePage() {
  const [role,        setRole]        = useState<string | null>(null);
  const [activeChild, setActiveChild] = useState<any>(null);
  const [term,        setTerm]        = useState('Term 1');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setRole(user.primaryRole);
        if (user.primaryRole === 'parent') {
          const stored = localStorage.getItem('activeChild');
          if (stored) setActiveChild(JSON.parse(stored));
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    const handler = (e: Event) => setActiveChild((e as CustomEvent).detail);
    window.addEventListener('activeChildChanged', handler);
    return () => window.removeEventListener('activeChildChanged', handler);
  }, []);

  if (role === 'parent' && !activeChild) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-3">
        <p className="text-gray-900 dark:text-gray-100 font-semibold">No child selected</p>
        <p className="text-sm text-surface-400">Select a child from the top bar to view performance.</p>
      </div>
    );
  }

  const childName = activeChild ? `${activeChild.first_name} ${activeChild.last_name}` : 'Student';
  const perf = mockPerformance(activeChild?.id || 'default');
  const avg  = Math.round(perf.reduce((s, p) => s + p.score, 0) / perf.length);
  const avgGrade = avg >= 90 ? 'A+' : avg >= 80 ? 'A' : avg >= 70 ? 'B+' : avg >= 60 ? 'B' : avg >= 50 ? 'C' : avg >= 40 ? 'D' : 'F';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">
            {role === 'parent' ? `${childName}'s Performance` : 'Performance'}
          </h1>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">Subject-wise academic performance</p>
        </div>
        <select className="input-field max-w-[160px]" value={term} onChange={e => setTerm(e.target.value)}>
          <option>Term 1</option>
          <option>Term 2</option>
          <option>Final Exam</option>
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-5">
          <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Overall Score</p>
          <p className="text-3xl font-display font-bold text-gray-900 dark:text-gray-100 mt-1">{avg}%</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Grade</p>
          <p className={`text-3xl font-display font-bold mt-1 ${gradeColor[avgGrade]?.split(' ')[0]}`}>{avgGrade}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Best Subject</p>
          <p className="text-sm font-display font-bold text-emerald-600 mt-2 truncate">
            {perf.reduce((a, b) => a.score > b.score ? a : b).subject}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Needs Work</p>
          <p className="text-sm font-display font-bold text-red-500 dark:text-red-400 mt-2 truncate">
            {perf.reduce((a, b) => a.score < b.score ? a : b).subject}
          </p>
        </div>
      </div>

      {/* Subject breakdown */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-5">{term} — Subject-wise Scores</h3>
        <div className="space-y-4">
          {perf.map(p => (
            <div key={p.subject}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{p.subject}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${gradeColor[p.grade]}`}>{p.grade}</span>
              </div>
              <ScoreBar score={p.score} max={p.max} />
            </div>
          ))}
        </div>
      </div>

      {/* Term comparison (placeholder) */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Term Progress</h3>
        <div className="overflow-x-auto">
          <table className="data-table text-xs">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Term 1</th>
                <th>Term 2</th>
                <th>Final</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {perf.map(p => {
                const t1 = Math.max(30, p.score - 8);
                const t2 = Math.max(30, p.score - 3);
                const trending = t2 < p.score;
                return (
                  <tr key={p.subject}>
                    <td className="font-medium text-gray-900 dark:text-gray-100">{p.subject}</td>
                    <td>{t1}%</td>
                    <td>{t2}%</td>
                    <td className="font-semibold">{p.score}%</td>
                    <td>
                      <span className={`flex items-center gap-1 font-medium ${trending ? 'text-emerald-600' : 'text-red-500'}`}>
                        {trending ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18,15 12,9 6,15"/></svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6,9 12,15 18,9"/></svg>
                        )}
                        {trending ? 'Up' : 'Down'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
