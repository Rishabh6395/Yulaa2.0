'use client';

import { useState, useEffect, useCallback } from 'react';

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreToGrade(pct: number) {
  return pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : pct >= 40 ? 'D' : 'F';
}

const GRADE_CLS: Record<string, string> = {
  'A+': 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800',
  'A':  'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800',
  'B+': 'text-blue-600   bg-blue-50   dark:bg-blue-950/50   border-blue-200   dark:border-blue-800',
  'B':  'text-blue-600   bg-blue-50   dark:bg-blue-950/50   border-blue-200   dark:border-blue-800',
  'C':  'text-amber-600  bg-amber-50  dark:bg-amber-950/50  border-amber-200  dark:border-amber-800',
  'D':  'text-orange-600 bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-800',
  'F':  'text-red-600    bg-red-50    dark:bg-red-950/50    border-red-200    dark:border-red-800',
};

const RISK_CLS = {
  low:    { bg: 'bg-emerald-100 dark:bg-emerald-950/50', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500', label: 'On Track' },
  medium: { bg: 'bg-amber-100  dark:bg-amber-950/50',   text: 'text-amber-700   dark:text-amber-400',   dot: 'bg-amber-500',   label: 'Needs Attention' },
  high:   { bg: 'bg-red-100    dark:bg-red-950/50',     text: 'text-red-700     dark:text-red-400',     dot: 'bg-red-500',     label: 'At Risk' },
};

function GradeBadge({ grade }: { grade: string }) {
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${GRADE_CLS[grade] ?? GRADE_CLS['F']}`}>{grade}</span>;
}

function ScoreBar({ pct, label }: { pct: number; label?: string }) {
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-blue-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-surface-100 dark:bg-gray-800 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }}/>
      </div>
      <span className="text-xs font-semibold w-9 text-right text-gray-600 dark:text-gray-400">{label ?? `${pct}%`}</span>
    </div>
  );
}

function StatCard({ title, value, sub, color = 'brand' }: { title: string; value: string | number; sub?: string; color?: string }) {
  const colors: Record<string, string> = {
    brand:   'bg-brand-50   dark:bg-brand-950/40   text-brand-600   dark:text-brand-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
    amber:   'bg-amber-50   dark:bg-amber-950/40   text-amber-600   dark:text-amber-400',
    red:     'bg-red-50     dark:bg-red-950/40     text-red-600     dark:text-red-400',
    blue:    'bg-blue-50    dark:bg-blue-950/40    text-blue-600    dark:text-blue-400',
  };
  return (
    <div className={`rounded-2xl border border-surface-100 dark:border-gray-800 p-5 ${colors[color] ?? colors.brand}`}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{title}</p>
      <p className="text-2xl font-display font-bold mt-1">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}

function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 bg-surface-100 dark:bg-gray-800 rounded-xl animate-pulse"/>
      ))}
    </div>
  );
}

function usePerf(params: Record<string, string | undefined>, token: string) {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const fetch_ = useCallback(() => {
    if (!token) return;
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) { if (v) qs.set(k, v); }
    setLoading(true); setError('');
    fetch(`/api/performance?${qs}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, JSON.stringify(params)]);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, loading, error, reload: fetch_ };
}

// ── Super Admin View ──────────────────────────────────────────────────────────

function SuperAdminView({ token }: { token: string }) {
  const [schoolId, setSchoolId] = useState<string>('');
  const { data, loading, error } = usePerf({ view: 'super_admin', ...(schoolId ? { school_id: schoolId } : {}) }, token);

  if (schoolId && data?.view === 'admin') {
    return <AdminView token={token} forcedSchoolId={schoolId} onBack={() => setSchoolId('')} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Performance — All Schools</h1>
        <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">Platform-wide academic overview</p>
      </div>

      {loading && <Skeleton rows={5}/>}
      {error   && <div className="card p-6 text-red-500 text-sm">{error}</div>}

      {data?.schools && (
        <div className="space-y-3">
          {data.schools.map((sch: any) => (
            <div key={sch.id} className="card p-5 hover:shadow-md transition-all cursor-pointer" onClick={() => setSchoolId(sch.id)}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{sch.name}</p>
                  <p className="text-xs text-surface-400 dark:text-gray-500 mt-0.5">
                    {sch.totalStudents} students · {sch.totalTeachers} teachers · {sch.totalExams} exams
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  {sch.resultCount > 0 ? (
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{sch.avgScore}%</p>
                      <p className="text-[10px] text-surface-400">avg score</p>
                    </div>
                  ) : (
                    <p className="text-xs text-surface-400">No results yet</p>
                  )}
                  <GradeBadge grade={scoreToGrade(sch.avgScore)} />
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-surface-400"><polyline points="9,18 15,12 9,6"/></svg>
                </div>
              </div>
              {sch.resultCount > 0 && (
                <div className="mt-3">
                  <ScoreBar pct={sch.avgScore} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Admin / Principal View ────────────────────────────────────────────────────

function AdminView({ token, forcedSchoolId, onBack }: { token: string; forcedSchoolId?: string; onBack?: () => void }) {
  const [examId,   setExamId]   = useState('');
  const [classId,  setClassId]  = useState('');
  const [tab,      setTab]      = useState<'overview' | 'top' | 'risk' | 'subjects'>('overview');

  const params: Record<string, string | undefined> = {
    view: 'admin',
    ...(examId   ? { exam_id: examId }     : {}),
    ...(classId  ? { class_id: classId }   : {}),
    ...(forcedSchoolId ? { school_id: forcedSchoolId } : {}),
  };
  const { data, loading, error } = usePerf(params, token);

  useEffect(() => {
    if (data?.exams?.[0]?.id && !examId) setExamId(data.exams[0].id);
  }, [data, examId]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 flex-wrap">
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-brand-500 hover:underline">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15,18 9,12 15,6"/></svg>
            All Schools
          </button>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Performance Analytics</h1>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">School-wide academic overview</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={examId} onChange={e => setExamId(e.target.value)}
            className="input-field max-w-[180px] text-sm">
            <option value="">Select Exam</option>
            {data?.exams?.map((e: any) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
          <select value={classId} onChange={e => setClassId(e.target.value)}
            className="input-field max-w-[140px] text-sm">
            <option value="">All Classes</option>
            {data?.classes?.map((c: any) => <option key={c.id} value={c.id}>{c.grade}{c.section}</option>)}
          </select>
        </div>
      </div>

      {loading && <Skeleton rows={5}/>}
      {error   && <div className="card p-6 text-sm text-red-500">{error}</div>}

      {data && !loading && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard title="Classes"       value={data.classes?.length ?? 0}       color="brand"   />
            <StatCard title="Results"       value={data.totalResults ?? 0}          color="blue"    />
            <StatCard title="Top Performers" value={data.topPerformers?.length ?? 0} color="emerald" />
            <StatCard title="At Risk"       value={data.atRisk?.length ?? 0}        color="red"     sub="score < 50%" />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-surface-100 dark:border-gray-800">
            {(['overview','subjects','top','risk'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 text-xs font-semibold capitalize transition-colors border-b-2 ${tab === t ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-surface-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                {t === 'overview' ? 'Class Overview' : t === 'top' ? 'Top Performers' : t === 'risk' ? 'At Risk' : 'Subject Analysis'}
              </button>
            ))}
          </div>

          {/* Class overview */}
          {tab === 'overview' && (
            <div className="card overflow-hidden">
              <div className="p-4 border-b border-surface-100 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Class-wise Performance</h3>
              </div>
              <div className="divide-y divide-surface-100 dark:divide-gray-800">
                {data.classStats?.map((c: any) => (
                  <div key={c.id} className="px-5 py-3 flex items-center gap-4">
                    <div className="w-20 shrink-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Class {c.grade}{c.section}</p>
                      <p className="text-[10px] text-surface-400">{c.students} students</p>
                    </div>
                    <div className="flex-1">
                      {c.avg !== null ? <ScoreBar pct={c.avg}/> : <p className="text-xs text-surface-400 italic">No results entered</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 w-24 justify-end">
                      {c.avg !== null && (
                        <>
                          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{c.avg}%</span>
                          <GradeBadge grade={scoreToGrade(c.avg)}/>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {!data.classStats?.length && <p className="p-6 text-center text-sm text-surface-400">No class data available.</p>}
              </div>
            </div>
          )}

          {/* Subject analysis */}
          {tab === 'subjects' && (
            <div className="card p-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Subject-wise School Average</h3>
              {data.subjectAvgs?.length === 0 && <p className="text-sm text-surface-400">No results entered yet.</p>}
              {data.subjectAvgs?.map((s: any) => (
                <div key={s.subject}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{s.subject}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-surface-400">{s.count} students</span>
                      <GradeBadge grade={scoreToGrade(s.avg)}/>
                    </div>
                  </div>
                  <ScoreBar pct={s.avg}/>
                </div>
              ))}
              {data.subjectAvgs?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-surface-100 dark:border-gray-800">
                  <p className="text-xs text-surface-400 dark:text-gray-500">
                    <span className="text-red-500 font-semibold">Weakest: </span>{data.subjectAvgs[0]?.subject} ({data.subjectAvgs[0]?.avg}%) ·{' '}
                    <span className="text-emerald-600 font-semibold">Strongest: </span>{data.subjectAvgs.at(-1)?.subject} ({data.subjectAvgs.at(-1)?.avg}%)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Top performers */}
          {tab === 'top' && (
            <div className="card overflow-hidden">
              <div className="p-4 border-b border-surface-100 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Top Performers</h3>
              </div>
              <div className="divide-y divide-surface-100 dark:divide-gray-800">
                {data.topPerformers?.map((s: any, i: number) => (
                  <div key={s.id} className="px-5 py-3 flex items-center gap-3">
                    <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold shrink-0 ${i < 3 ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400' : 'bg-surface-100 dark:bg-gray-800 text-surface-500'}`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{s.firstName} {s.lastName}</p>
                      <p className="text-[10px] text-surface-400">#{s.admissionNo}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{s.avg}%</span>
                      <GradeBadge grade={s.grade}/>
                    </div>
                  </div>
                ))}
                {!data.topPerformers?.length && <p className="p-6 text-center text-sm text-surface-400">No results yet.</p>}
              </div>
            </div>
          )}

          {/* At risk */}
          {tab === 'risk' && (
            <div className="space-y-3">
              {data.atRisk?.length === 0 && (
                <div className="card p-8 text-center">
                  <p className="text-emerald-600 font-semibold text-sm">No students below 50% — great!</p>
                </div>
              )}
              {data.atRisk?.map((s: any) => (
                <div key={s.id} className="card p-4 border-l-4 border-l-red-400 dark:border-l-red-500">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center text-red-600 dark:text-red-400 text-sm font-bold shrink-0">
                      {s.firstName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{s.firstName} {s.lastName}</p>
                      <p className="text-xs text-surface-400">#{s.admissionNo}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-red-500">{s.avg}%</p>
                      <GradeBadge grade={s.grade}/>
                    </div>
                  </div>
                  <div className="mt-2">
                    <ScoreBar pct={s.avg}/>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Teacher View ──────────────────────────────────────────────────────────────

function TeacherView({ token }: { token: string }) {
  const [examId,  setExamId]  = useState('');
  const [classId, setClassId] = useState('');
  const [search,  setSearch]  = useState('');
  const [tab,     setTab]     = useState<'students' | 'insights'>('students');

  const params: Record<string, string | undefined> = {
    view: 'teacher',
    ...(examId  ? { exam_id: examId }   : {}),
    ...(classId ? { class_id: classId } : {}),
  };
  const { data, loading, error } = usePerf(params, token);

  useEffect(() => {
    if (data?.exam?.id && !examId) setExamId(data.exam.id);
  }, [data, examId]);

  const students: any[] = (data?.students ?? []).filter((s: any) =>
    !search || `${s.firstName} ${s.lastName} ${s.admissionNo}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Class Performance</h1>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">
            {data?.classInfo ? `Class ${data.classInfo.grade}${data.classInfo.section}` : 'Select a class below'} · {data?.classStats?.total ?? 0} students
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={examId} onChange={e => setExamId(e.target.value)} className="input-field max-w-[180px] text-sm">
            <option value="">Select Exam</option>
            {data?.exams?.map((e: any) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
          {data?.exam?.classId === undefined && (
            <select value={classId} onChange={e => setClassId(e.target.value)} className="input-field max-w-[140px] text-sm">
              <option value="">Select Class</option>
              {data?.exam?.entries?.map((e: any) => e.classId).filter((v: any, i: number, a: any[]) => a.indexOf(v) === i).map((cid: string) => (
                <option key={cid} value={cid}>{cid}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {loading && <Skeleton rows={6}/>}
      {error   && <div className="card p-6 text-sm text-red-500">{error}</div>}

      {data && !loading && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard title="Class Average"   value={`${data.classStats?.avg ?? 0}%`}         color="brand"   />
            <StatCard title="With Results"    value={data.classStats?.withResults ?? 0}        color="blue"    />
            <StatCard title="At Risk"         value={data.classStats?.atRisk ?? 0}             color="red"     sub="risk score high" />
            <StatCard title="Top Performers"  value={data.classStats?.topCount ?? 0}           color="emerald" sub="avg ≥ 80%" />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-surface-100 dark:border-gray-800">
            {(['students','insights'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 text-xs font-semibold capitalize transition-colors border-b-2 ${tab === t ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-surface-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                {t === 'students' ? 'All Students' : 'AI Insights'}
              </button>
            ))}
          </div>

          {tab === 'students' && (
            <>
              {/* Search */}
              <div className="relative">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search student…" className="input-field pl-9 text-sm"/>
              </div>

              {/* Student table */}
              {students.length === 0 ? (
                <div className="card p-10 text-center text-sm text-surface-400">
                  {data.subjects?.length === 0 ? 'No exam timetable entries. Add subjects in the Exam module first.' : 'No students found.'}
                </div>
              ) : (
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-surface-100 dark:border-gray-800 bg-surface-50 dark:bg-gray-900">
                          <th className="text-left px-4 py-3 font-semibold text-surface-500 dark:text-gray-400">Student</th>
                          {data.subjects?.map((s: string) => (
                            <th key={s} className="text-center px-3 py-3 font-semibold text-surface-500 dark:text-gray-400 whitespace-nowrap">{s.length > 7 ? s.slice(0, 6) + '…' : s}</th>
                          ))}
                          <th className="text-center px-3 py-3 font-semibold text-surface-500 dark:text-gray-400">Avg</th>
                          <th className="text-center px-3 py-3 font-semibold text-surface-500 dark:text-gray-400">Att%</th>
                          <th className="text-center px-3 py-3 font-semibold text-surface-500 dark:text-gray-400">HW%</th>
                          <th className="text-center px-3 py-3 font-semibold text-surface-500 dark:text-gray-400">Risk</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-100 dark:divide-gray-800">
                        {students.map((s: any) => {
                          const rc = RISK_CLS[s.riskLevel as keyof typeof RISK_CLS];
                          return (
                            <tr key={s.id} className="hover:bg-surface-50 dark:hover:bg-gray-800/50 transition-colors">
                              <td className="px-4 py-3">
                                <p className="font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">{s.firstName} {s.lastName}</p>
                                <p className="text-[10px] text-surface-400">#{s.admissionNo}</p>
                              </td>
                              {data.subjects?.map((sub: string) => {
                                const sc = s.subjectScores[sub];
                                return (
                                  <td key={sub} className="px-3 py-3 text-center">
                                    {sc ? (
                                      <span className={`font-semibold ${sc.pct >= 80 ? 'text-emerald-600' : sc.pct >= 60 ? 'text-blue-600' : sc.pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                                        {sc.marks}<span className="text-surface-400 font-normal">/{sc.max}</span>
                                      </span>
                                    ) : (
                                      <span className="text-surface-300 dark:text-gray-600">—</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="px-3 py-3 text-center">
                                <span className="font-bold text-gray-900 dark:text-gray-100">{s.avgPct}%</span>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span className={s.attPct < 75 ? 'text-red-500 font-semibold' : 'text-gray-700 dark:text-gray-300'}>{s.attPct}%</span>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span className={s.hwPct < 60 ? 'text-amber-600 font-semibold' : 'text-gray-700 dark:text-gray-300'}>{s.hwPct}%</span>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rc.bg} ${rc.text}`}>
                                  {rc.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'insights' && (
            <div className="space-y-5">
              {/* Subject analysis */}
              {data.subjectAvgs?.length > 0 && (
                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Subject Analysis</h3>
                  <div className="space-y-3">
                    {data.subjectAvgs?.map((s: any) => (
                      <div key={s.subject}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{s.subject}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-surface-400">{s.count} students</span>
                            <GradeBadge grade={scoreToGrade(s.avg)}/>
                          </div>
                        </div>
                        <ScoreBar pct={s.avg}/>
                      </div>
                    ))}
                  </div>
                  {data.subjectAvgs.length > 0 && (
                    <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                      <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                        ⚡ AI Insight: Class is weakest in <strong>{data.subjectAvgs[0]?.subject}</strong> ({data.subjectAvgs[0]?.avg}%) — consider extra practice sessions.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* At-risk students */}
              {data.atRisk?.length > 0 && (
                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Students at Risk ({data.atRisk.length})
                  </h3>
                  <div className="space-y-3">
                    {data.atRisk?.map((s: any) => (
                      <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900">
                        <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center text-red-600 text-xs font-bold shrink-0">
                          {s.firstName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{s.firstName} {s.lastName}</p>
                          <div className="flex gap-3 mt-0.5">
                            <span className="text-[10px] text-surface-400">Marks: <span className={s.avgPct < 50 ? 'text-red-500 font-semibold' : ''}>{s.avgPct}%</span></span>
                            <span className="text-[10px] text-surface-400">Att: <span className={s.attPct < 75 ? 'text-red-500 font-semibold' : ''}>{s.attPct}%</span></span>
                            <span className="text-[10px] text-surface-400">HW: <span className={s.hwPct < 60 ? 'text-amber-600 font-semibold' : ''}>{s.hwPct}%</span></span>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-red-600 dark:text-red-400 shrink-0">Risk: {s.riskScore}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top performers */}
              {data.topPerformers?.length > 0 && (
                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Top Performers</h3>
                  <div className="space-y-2">
                    {data.topPerformers?.map((s: any, i: number) => (
                      <div key={s.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-50 dark:hover:bg-gray-800/50">
                        <span className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold ${i < 3 ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700' : 'bg-surface-100 dark:bg-gray-800 text-surface-500'}`}>{i+1}</span>
                        <p className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">{s.firstName} {s.lastName}</p>
                        <span className="text-sm font-bold text-emerald-600">{s.avgPct}%</span>
                        <GradeBadge grade={s.grade}/>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!data.subjectAvgs?.length && !data.atRisk?.length && (
                <div className="card p-10 text-center text-sm text-surface-400">
                  Enter exam results first to see AI insights.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Parent View ───────────────────────────────────────────────────────────────

function ParentView({ token, studentId, childName }: { token: string; studentId: string; childName: string }) {
  const [examIdx, setExamIdx] = useState(0);
  const { data, loading, error } = usePerf({ view: 'parent', student_id: studentId }, token);

  const exams: any[] = data?.byExam ?? [];
  const exam = exams[examIdx];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">{childName}&apos;s Performance</h1>
        <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">
          {data?.student?.class ? `Class ${data.student.class.grade}${data.student.class.section}` : ''} · Admission #{data?.student?.admissionNo ?? ''}
        </p>
      </div>

      {loading && <Skeleton rows={5}/>}
      {error   && <div className="card p-6 text-sm text-red-500">{error}</div>}

      {data && !loading && (
        <>
          {/* Top stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard title="Latest Score"     value={exams[0]?.avg ? `${exams[0].avg}%` : 'N/A'}   color="brand"   />
            <StatCard title="Attendance"       value={`${data.attendance?.pct ?? 0}%`}               color={data.attendance?.pct < 75 ? 'red' : 'emerald'} sub={`${data.attendance?.present}/${data.attendance?.total} days`}/>
            <StatCard title="Homework"         value={`${data.homework?.pct ?? 0}%`}                 color={data.homework?.pct < 60 ? 'amber' : 'emerald'} sub="completion rate"/>
            <div className={`rounded-2xl border border-surface-100 dark:border-gray-800 p-5 ${RISK_CLS[data.riskLevel as keyof typeof RISK_CLS]?.bg}`}>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-70">Status</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`w-2.5 h-2.5 rounded-full ${RISK_CLS[data.riskLevel as keyof typeof RISK_CLS]?.dot}`}/>
                <p className={`text-sm font-bold ${RISK_CLS[data.riskLevel as keyof typeof RISK_CLS]?.text}`}>
                  {RISK_CLS[data.riskLevel as keyof typeof RISK_CLS]?.label}
                </p>
              </div>
            </div>
          </div>

          {/* AI remark */}
          {data.aiRemark && (
            <div className="card p-5 border-l-4 border-l-brand-400 dark:border-l-brand-500">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/50 flex items-center justify-center shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-600 dark:text-brand-400">
                    <path d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wider mb-1">AI Performance Summary</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{data.aiRemark}</p>
                </div>
              </div>
            </div>
          )}

          {/* Exam selector + subject scores */}
          {exams.length > 0 ? (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Subject-wise Scores</h3>
                <div className="flex items-center gap-1">
                  {exams.map((_: any, i: number) => (
                    <button key={i} onClick={() => setExamIdx(i)}
                      className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${i === examIdx ? 'bg-brand-500 text-white' : 'text-surface-500 hover:bg-surface-100 dark:hover:bg-gray-800'}`}>
                      {exams[i].examType}
                    </button>
                  ))}
                </div>
              </div>

              {exam && (
                <>
                  <div className="flex items-center gap-3 mb-5">
                    <div>
                      <p className="text-xs text-surface-400">{exam.examTitle}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">{exam.avg}%</p>
                        <GradeBadge grade={exam.grade}/>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {exam.subjects.map((s: any) => (
                      <div key={s.subject}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{s.subject}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-surface-400">{s.marks}/{s.max}</span>
                            <GradeBadge grade={s.grade}/>
                          </div>
                        </div>
                        <ScoreBar pct={s.pct}/>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="card p-10 text-center text-sm text-surface-400">No exam results available yet.</div>
          )}

          {/* Subject summary across all exams */}
          {data.subjectSummary?.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Overall Subject Performance</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.subjectSummary.map((s: any) => (
                  <div key={s.subject} className="p-3 rounded-xl bg-surface-50 dark:bg-gray-800/50">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{s.subject}</span>
                      <GradeBadge grade={scoreToGrade(s.avg)}/>
                    </div>
                    <ScoreBar pct={s.avg}/>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-4 text-xs">
                <span className="text-emerald-600 font-medium">Best: {data.subjectSummary[0]?.subject}</span>
                <span className="text-red-500 font-medium">Needs work: {data.subjectSummary.at(-1)?.subject}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PerformancePage() {
  const [role,        setRole]        = useState<string | null>(null);
  const [token,       setToken]       = useState('');
  const [activeChild, setActiveChild] = useState<any>(null);

  useEffect(() => {
    setToken(localStorage.getItem('token') ?? '');
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

  if (!token) return null;

  if (role === 'super_admin') return <SuperAdminView token={token} />;
  if (role === 'school_admin' || role === 'principal' || role === 'hod')
    return <AdminView token={token} />;
  if (role === 'teacher') return <TeacherView token={token} />;

  if (role === 'parent') {
    if (!activeChild) return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-3">
        <p className="text-gray-900 dark:text-gray-100 font-semibold">No child selected</p>
        <p className="text-sm text-surface-400">Select a child from the top bar to view performance.</p>
      </div>
    );
    return <ParentView token={token} studentId={activeChild.id} childName={`${activeChild.first_name} ${activeChild.last_name}`} />;
  }

  return (
    <div className="card p-12 text-center space-y-3">
      <p className="text-sm text-surface-400">Performance data is not available for your role.</p>
    </div>
  );
}
