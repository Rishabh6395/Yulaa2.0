'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApi } from '@/hooks/useApi';

const SUBJECTS = ['English', 'Hindi', 'Science', 'Social Studies', 'Mathematics', 'Sanskrit', 'Drawing', 'IT'];
const TERMS    = ['Term 1', 'Term 2', 'Final Exam'];

const gradeColor: Record<string, string> = {
  'A+': 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
  'A':  'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
  'B+': 'text-blue-600   bg-blue-50   dark:bg-blue-950/40',
  'B':  'text-blue-600   bg-blue-50   dark:bg-blue-950/40',
  'C':  'text-amber-600  bg-amber-50  dark:bg-amber-950/40',
  'D':  'text-orange-600 bg-orange-50 dark:bg-orange-950/40',
  'F':  'text-red-600    bg-red-50    dark:bg-red-950/40',
};

function scoreToGrade(score: number) {
  return score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B+' : score >= 60 ? 'B' : score >= 50 ? 'C' : score >= 40 ? 'D' : 'F';
}

function ScoreBar({ score, max = 100 }: { score: number; max?: number }) {
  const pct   = Math.round((score / max) * 100);
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

// Deterministic mock per student + subject (same result every render)
function mockScore(studentId: string, subject: string) {
  let h = 0;
  for (const c of studentId + subject) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return Math.min(100, Math.max(35, (h % 65) + 35));
}

// ── Parent view ────────────────────────────────────────────────────────────────
function ParentView({ childName, childId }: { childName: string; childId: string }) {
  const [term, setTerm] = useState('Term 1');
  const perf  = SUBJECTS.map(s => { const score = mockScore(childId, s); return { subject: s, score, grade: scoreToGrade(score) }; });
  const avg   = Math.round(perf.reduce((a, p) => a + p.score, 0) / perf.length);
  const grade = scoreToGrade(avg);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">{childName}&apos;s Performance</h1>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">Subject-wise academic performance</p>
        </div>
        <select className="input-field max-w-[160px]" value={term} onChange={e => setTerm(e.target.value)}>
          {TERMS.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-5"><p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Overall Score</p><p className="text-3xl font-display font-bold text-gray-900 dark:text-gray-100 mt-1">{avg}%</p></div>
        <div className="card p-5"><p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Grade</p><p className={`text-3xl font-display font-bold mt-1 ${gradeColor[grade]?.split(' ')[0]}`}>{grade}</p></div>
        <div className="card p-5"><p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Best Subject</p><p className="text-sm font-bold text-emerald-600 mt-2 truncate">{perf.reduce((a, b) => a.score > b.score ? a : b).subject}</p></div>
        <div className="card p-5"><p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Needs Work</p><p className="text-sm font-bold text-red-500 dark:text-red-400 mt-2 truncate">{perf.reduce((a, b) => a.score < b.score ? a : b).subject}</p></div>
      </div>
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-5">{term} — Subject-wise Scores</h3>
        <div className="space-y-4">
          {perf.map(p => (
            <div key={p.subject}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{p.subject}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${gradeColor[p.grade]}`}>{p.grade}</span>
              </div>
              <ScoreBar score={p.score}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Teacher view ───────────────────────────────────────────────────────────────
function TeacherView({ userId }: { userId: string }) {
  const [term,      setTerm]      = useState('Term 1');
  const [subject,   setSubject]   = useState('');
  const [students,  setStudents]  = useState<any[]>([]);
  const [loadingStu, setLoadingStu] = useState(false);

  const { data: classData } = useApi<{ classes: any[] }>('/api/classes');
  const classes = classData?.classes || [];

  // Find the class where this user is the class teacher
  const myClass = classes.find((c: any) => c.class_teacher_user_id === userId);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  const fetchStudents = useCallback(async (classId: string) => {
    setLoadingStu(true);
    const res  = await fetch(`/api/students?class_id=${classId}&limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setStudents(data.students || []);
    setLoadingStu(false);
  }, [token]);

  useEffect(() => {
    if (myClass?.id) fetchStudents(myClass.id);
  }, [myClass?.id, fetchStudents]);

  const displaySubjects = subject ? [subject] : SUBJECTS;

  // For each student, compute scores for displayed subjects
  const tableData = students.map(s => {
    const scores = displaySubjects.map(sub => ({ sub, score: mockScore(s.id, sub) }));
    const avg    = Math.round(scores.reduce((a, x) => a + x.score, 0) / scores.length);
    return { ...s, scores, avg, grade: scoreToGrade(avg) };
  });

  if (!myClass) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Performance</h1>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">Class performance overview</p>
        </div>
        <div className="card p-12 text-center">
          <p className="text-surface-400">You are not assigned as class teacher to any class.</p>
          <p className="text-sm text-surface-400 mt-1">Ask your school admin to assign you as class teacher.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Performance</h1>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">
            Class {myClass.grade} – {myClass.section} · {students.length} students
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select className="input-field max-w-[140px] text-sm" value={subject} onChange={e => setSubject(e.target.value)}>
            <option value="">All Subjects</option>
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="input-field max-w-[130px] text-sm" value={term} onChange={e => setTerm(e.target.value)}>
            {TERMS.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Class summary */}
      {tableData.length > 0 && (() => {
        const classAvg = Math.round(tableData.reduce((a, s) => a + s.avg, 0) / tableData.length);
        const aPlus    = tableData.filter(s => s.avg >= 90).length;
        const failing  = tableData.filter(s => s.avg < 50).length;
        return (
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-5"><p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Class Average</p><p className="text-3xl font-display font-bold text-gray-900 dark:text-gray-100 mt-1">{classAvg}%</p></div>
            <div className="card p-5"><p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">A+ Students</p><p className="text-3xl font-display font-bold text-emerald-600 mt-1">{aPlus}</p></div>
            <div className="card p-5"><p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Need Attention</p><p className="text-3xl font-display font-bold text-red-500 dark:text-red-400 mt-1">{failing}</p></div>
          </div>
        );
      })()}

      {/* Student table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-surface-100 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {term} · {subject || 'All Subjects'} · Student Performance
          </h3>
        </div>
        {loadingStu ? (
          <div className="p-6 space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-10 bg-surface-100 dark:bg-gray-800 rounded-xl animate-pulse"/>)}
          </div>
        ) : tableData.length === 0 ? (
          <div className="p-12 text-center text-surface-400">No students in this class.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table text-xs">
              <thead>
                <tr>
                  <th>Student</th>
                  {displaySubjects.length === 1 ? (
                    <th>{displaySubjects[0]}</th>
                  ) : (
                    <>
                      {displaySubjects.map(s => <th key={s}>{s.substring(0, 4)}</th>)}
                    </>
                  )}
                  <th>Avg</th>
                  <th>Grade</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map(s => (
                  <tr key={s.id}>
                    <td className="font-medium text-gray-900 dark:text-gray-100">
                      {s.first_name} {s.last_name}
                      {s.admission_no && <span className="text-surface-400 ml-1 font-normal">#{s.admission_no}</span>}
                    </td>
                    {s.scores.map((sc: any) => (
                      <td key={sc.sub}>
                        <span className={`font-semibold ${sc.score >= 80 ? 'text-emerald-600' : sc.score >= 60 ? 'text-blue-600' : sc.score >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                          {sc.score}
                        </span>
                      </td>
                    ))}
                    <td className="font-semibold">{s.avg}%</td>
                    <td><span className={`text-xs font-bold px-1.5 py-0.5 rounded ${gradeColor[s.grade]}`}>{s.grade}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function PerformancePage() {
  const [role,        setRole]        = useState<string | null>(null);
  const [userId,      setUserId]      = useState('');
  const [activeChild, setActiveChild] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setRole(user.primaryRole);
        setUserId(user.id || '');
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

  if (role === 'teacher') return <TeacherView userId={userId} />;

  if (role === 'parent') {
    if (!activeChild) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-3">
          <p className="text-gray-900 dark:text-gray-100 font-semibold">No child selected</p>
          <p className="text-sm text-surface-400">Select a child from the top bar to view performance.</p>
        </div>
      );
    }
    return <ParentView childName={`${activeChild.first_name} ${activeChild.last_name}`} childId={activeChild.id} />;
  }

  // Admin / principal: show school-wide overview (redirect to reports)
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Performance</h1>
        <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">Academic performance overview</p>
      </div>
      <div className="card p-12 text-center space-y-3">
        <p className="text-gray-600 dark:text-gray-400">For school-wide performance analytics, use the Reports module.</p>
        <a href="/dashboard/reports" className="btn-primary inline-flex items-center gap-2 text-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
          Go to Reports
        </a>
      </div>
    </div>
  );
}
