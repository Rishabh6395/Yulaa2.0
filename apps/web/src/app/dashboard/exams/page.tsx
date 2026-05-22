'use client';

import { useEffect, useState, useRef } from 'react';
import { useFormConfig } from '@/hooks/useFormConfig';

type ClassItem = { id: string; name: string; grade: string; section: string };
type Student   = { id: string; admission_no: string; first_name: string; last_name: string };
type Subject   = string;

type Exam = {
  id: string; title: string; examType: string; academicYear: string; status: string;
  startDate: string; endDate: string;
  class?: { name: string; grade: string; section: string } | null;
  _count?: { results: number; entries: number };
};

type ExamResult = {
  student: { id: string; admissionNo: string; firstName: string; lastName: string };
  subject: string; marksObtained: number; maxMarks: number; grade: string | null; remarks: string | null;
};

const STATUS_CFG: Record<string, string> = {
  scheduled:   'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  ongoing:     'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  completed:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  cancelled:   'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function activeAY() {
  const y = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  return `${y}-${y + 1}`;
}

export default function ExamsPage() {
  const fc = useFormConfig('create_exam_schedule_form');

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
  const auth    = { Authorization: `Bearer ${token}` };
  const authJ   = { ...auth, 'Content-Type': 'application/json' };

  const user    = typeof window !== 'undefined' ? (() => { try { return JSON.parse(localStorage.getItem('user') ?? '{}'); } catch { return {}; } })() : {};
  const role    = user.primaryRole ?? '';
  const isAdmin = ['school_admin', 'principal', 'hod', 'super_admin'].includes(role);

  const [exams,      setExams]      = useState<Exam[]>([]);
  const [classes,    setClasses]    = useState<ClassItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [classFilter, setClassFilter] = useState('');
  const [tab,        setTab]        = useState<'list' | 'create' | 'results'>('list');
  const [selExam,    setSelExam]    = useState<Exam | null>(null);
  const [msg,        setMsg]        = useState<{ ok: boolean; text: string } | null>(null);

  // Create exam form
  const [createForm, setCreateForm] = useState({
    title: '', exam_type: '', class_id: '', start_date: '', end_date: '',
  });
  const [creating, setCreating] = useState(false);

  // Enter results form
  const [resExamId,   setResExamId]   = useState('');
  const [resClassId,  setResClassId]  = useState('');
  const [resSubject,  setResSubject]  = useState('');
  const [resStudents, setResStudents] = useState<Student[]>([]);
  const [resSubjects, setResSubjects] = useState<Subject[]>([]);
  const [resRows,     setResRows]     = useState<Record<string, { marks: string; maxMarks: string; grade: string; remarks: string }>>({});
  const [selStudents, setSelStudents] = useState<Set<string>>(new Set());
  const [savingRes,   setSavingRes]   = useState(false);
  const [uploadingXlsx, setUploadingXlsx] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    const qs = classFilter ? `?class_id=${classFilter}` : '';
    fetch(`/api/exams${qs}`, { headers: auth })
      .then(r => r.json())
      .then(d => setExams(d.exams ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch('/api/classes', { headers: auth }).then(r => r.json()).then(d => setClasses(d.classes ?? []));
    load();
  }, []);

  useEffect(() => { load(); }, [classFilter]);

  // Load students when result class changes
  useEffect(() => {
    if (!resClassId) { setResStudents([]); return; }
    fetch(`/api/students?class_id=${resClassId}&status=active`, { headers: auth })
      .then(r => r.json())
      .then(d => {
        const studs = d.students ?? [];
        setResStudents(studs);
        const rows: typeof resRows = {};
        studs.forEach((s: Student) => { rows[s.id] = { marks: '', maxMarks: '100', grade: '', remarks: '' }; });
        setResRows(rows);
        setSelStudents(new Set(studs.map((s: Student) => s.id)));
      });
  }, [resClassId]);

  // Load subjects when class changes
  useEffect(() => {
    if (!resClassId) { setResSubjects([]); return; }
    fetch(`/api/masters/streams?classId=${resClassId}`, { headers: auth })
      .then(r => r.json())
      .then(d => setResSubjects((d.streamMasters || []).map((m: any) => m.name)));
  }, [resClassId]);

  const createExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true); setMsg(null);
    try {
      const res = await fetch('/api/exams', { method: 'POST', headers: authJ, body: JSON.stringify(createForm) });
      const d = await res.json();
      if (!res.ok) { setMsg({ ok: false, text: d.error ?? 'Failed to create exam' }); return; }
      setMsg({ ok: true, text: 'Exam created!' });
      setCreateForm({ title: '', exam_type: '', class_id: '', start_date: '', end_date: '' });
      load(); setTab('list');
    } finally { setCreating(false); }
  };

  const saveResults = async () => {
    if (!resExamId || !resSubject) { setMsg({ ok: false, text: 'Select an exam and subject first' }); return; }
    setSavingRes(true); setMsg(null);
    const results = [...selStudents].map(sid => ({
      student_id:     sid,
      subject:        resSubject,
      marks_obtained: Number(resRows[sid]?.marks ?? 0),
      max_marks:      Number(resRows[sid]?.maxMarks ?? 100),
      grade:          resRows[sid]?.grade || null,
      remarks:        resRows[sid]?.remarks || null,
    }));
    try {
      const res = await fetch('/api/exams', {
        method: 'POST', headers: authJ,
        body: JSON.stringify({ action: 'bulk_results', examId: resExamId, results }),
      });
      const d = await res.json();
      if (!res.ok) { setMsg({ ok: false, text: d.error ?? 'Failed' }); return; }
      setMsg({ ok: true, text: `Results saved for ${d.created} students${d.failed ? ` (${d.failed} failed)` : ''}` });
    } finally { setSavingRes(false); }
  };

  const handleXlsxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !resExamId) { setMsg({ ok: false, text: 'Select an exam first' }); return; }
    setUploadingXlsx(true); setMsg(null);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(await file.arrayBuffer());
      const ws = wb.worksheets[0];
      const results: any[] = [];
      ws.eachRow((row, i) => {
        if (i === 1) return; // skip header
        const [, studentId, subject, marksObtained, maxMarks, grade, remarks] = row.values as any[];
        if (studentId && subject) {
          results.push({ student_id: String(studentId), subject: String(subject),
            marks_obtained: marksObtained ?? 0, max_marks: maxMarks ?? 100,
            grade: grade ?? null, remarks: remarks ?? null });
        }
      });
      const res = await fetch('/api/exams', {
        method: 'POST', headers: authJ,
        body: JSON.stringify({ action: 'bulk_results', examId: resExamId, results }),
      });
      const d = await res.json();
      if (!res.ok) { setMsg({ ok: false, text: d.error ?? 'Upload failed' }); return; }
      setMsg({ ok: true, text: `Imported ${d.created} results${d.failed ? ` (${d.failed} failed)` : ''}` });
    } finally { setUploadingXlsx(false); e.target.value = ''; }
  };

  const deleteExam = async (id: string) => {
    if (!confirm('Delete this exam and all its results?')) return;
    await fetch(`/api/exams?id=${id}`, { method: 'DELETE', headers: auth });
    load();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Exams</h1>
          <p className="text-sm text-surface-400 mt-0.5">Create exams, enter results, and upload marks via Excel.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['list', 'create', 'results'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium border transition-all capitalize ${tab === t ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300' : 'border-surface-200 dark:border-gray-700 text-surface-400 hover:border-brand-300'}`}>
              {t === 'results' ? 'Enter Results' : t === 'create' ? '+ Create Exam' : 'All Exams'}
            </button>
          ))}
        </div>
      </div>

      {msg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm border ${msg.ok ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'}`}>
          {msg.text}
          <button onClick={() => setMsg(null)} className="ml-auto opacity-60 hover:opacity-100">×</button>
        </div>
      )}

      {/* ── Exam List ── */}
      {tab === 'list' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <select className="input w-52" value={classFilter} onChange={e => setClassFilter(e.target.value)}>
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name || `${c.grade}-${c.section}`}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 card animate-pulse bg-surface-50 dark:bg-gray-800"/>)}</div>
          ) : exams.length === 0 ? (
            <div className="card p-12 text-center text-surface-400 text-sm">
              No exams found.
              {isAdmin && <button onClick={() => setTab('create')} className="block mx-auto mt-2 text-brand-600 dark:text-brand-400 hover:underline">Create one →</button>}
            </div>
          ) : (
            <div className="space-y-3">
              {exams.map(ex => (
                <div key={ex.id} className="card p-5 flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{ex.title}</h3>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_CFG[ex.status] ?? ''}`}>{ex.status}</span>
                    </div>
                    <p className="text-xs text-surface-400">
                      {ex.examType}
                      {ex.class && ` · ${ex.class.grade}-${ex.class.section}`}
                      {` · ${fmtDate(ex.startDate)} – ${fmtDate(ex.endDate)}`}
                      {` · ${ex.academicYear}`}
                    </p>
                    {ex._count && (
                      <p className="text-xs text-surface-400">{ex._count.results} results · {ex._count.entries} timetable entries</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <button onClick={() => { setResExamId(ex.id); setResClassId(ex.class ? classes.find(c => c.name === ex.class?.name)?.id ?? '' : ''); setTab('results'); }}
                      className="btn btn-secondary btn-sm">Enter Results</button>
                    {isAdmin && (
                      <button onClick={() => deleteExam(ex.id)} className="btn btn-sm text-xs text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/30">Delete</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Create Exam ── */}
      {tab === 'create' && (
        <div className="card p-6 max-w-xl space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Create New Exam</h2>
          <form onSubmit={createExam} className="space-y-4">
            {fc.visible('title') && <div>
              <label className="label">{fc.label('title')} *</label>
              <input className="input-field" required={fc.required('title')} value={createForm.title}
                onChange={e => setCreateForm(f => ({...f, title: e.target.value}))}
                placeholder="e.g. Unit Test 1 — Math" />
            </div>}
            <div className="grid grid-cols-2 gap-3">
              {fc.visible('examType') && <div>
                <label className="label">{fc.label('examType')} *</label>
                <input className="input-field" required={fc.required('examType')} value={createForm.exam_type}
                  onChange={e => setCreateForm(f => ({...f, exam_type: e.target.value}))}
                  placeholder="e.g. Unit Test, Mid-Term" list="exam-types" />
                <datalist id="exam-types">
                  {['Unit Test', 'Mid-Term', 'Final', 'Pre-Board', 'Internal Assessment'].map(t => <option key={t} value={t} />)}
                </datalist>
              </div>}
              {fc.visible('classId') && <div>
                <label className="label">{fc.label('classId')} (optional)</label>
                <select className="input-field" required={fc.required('classId')} value={createForm.class_id}
                  onChange={e => setCreateForm(f => ({...f, class_id: e.target.value}))}>
                  <option value="">All Classes</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name || `${c.grade}-${c.section}`}</option>)}
                </select>
              </div>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {fc.visible('startDate') && <div>
                <label className="label">{fc.label('startDate')} *</label>
                <input type="date" className="input-field" required={fc.required('startDate')} value={createForm.start_date}
                  onChange={e => setCreateForm(f => ({...f, start_date: e.target.value}))} />
              </div>}
              {fc.visible('endDate') && <div>
                <label className="label">{fc.label('endDate')} *</label>
                <input type="date" className="input-field" required={fc.required('endDate')} value={createForm.end_date}
                  min={createForm.start_date}
                  onChange={e => setCreateForm(f => ({...f, end_date: e.target.value}))} />
              </div>}
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setTab('list')} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={creating} className="btn-primary flex-1">{creating ? 'Creating...' : 'Create Exam'}</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Enter Results ── */}
      {tab === 'results' && (
        <div className="space-y-5">
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Enter Exam Results</h2>

            {/* Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="label">Exam *</label>
                <select className="input-field" value={resExamId} onChange={e => setResExamId(e.target.value)}>
                  <option value="">— Select Exam —</option>
                  {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.title}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Class *</label>
                <select className="input-field" value={resClassId} onChange={e => { setResClassId(e.target.value); setResSubject(''); }}>
                  <option value="">— Select Class —</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name || `${c.grade}-${c.section}`}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Subject *</label>
                <select className="input-field" value={resSubject} onChange={e => setResSubject(e.target.value)}>
                  <option value="">— Select Subject —</option>
                  {resSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Excel upload */}
            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800 rounded-xl">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500 shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
              <p className="text-xs text-blue-700 dark:text-blue-400 flex-1">
                Upload Excel: columns → <strong>row# · student_id · subject · marks_obtained · max_marks · grade · remarks</strong>
              </p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleXlsxUpload} />
              <button onClick={() => fileRef.current?.click()} disabled={!resExamId || uploadingXlsx}
                className="btn btn-secondary btn-sm shrink-0 text-xs">
                {uploadingXlsx ? 'Uploading...' : '↑ Upload Excel'}
              </button>
            </div>
          </div>

          {/* Student marks table */}
          {resStudents.length > 0 && resSubject && (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-surface-100 dark:border-gray-800">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {resStudents.length} students · {resSubject}
                </p>
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelStudents(new Set(resStudents.map(s => s.id)))}
                    className="text-xs text-brand-600 dark:text-brand-400 hover:underline">Select All</button>
                  <button onClick={() => setSelStudents(new Set())}
                    className="text-xs text-surface-400 hover:underline">Deselect All</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-100 dark:border-gray-800 bg-surface-50 dark:bg-gray-800/40">
                      <th className="py-2.5 px-4 text-left w-8"><input type="checkbox"
                        checked={selStudents.size === resStudents.length}
                        onChange={e => setSelStudents(e.target.checked ? new Set(resStudents.map(s => s.id)) : new Set())} /></th>
                      <th className="py-2.5 px-4 text-left text-xs font-semibold text-surface-400 uppercase tracking-wide">Student</th>
                      <th className="py-2.5 px-4 text-left text-xs font-semibold text-surface-400 uppercase tracking-wide w-28">Marks</th>
                      <th className="py-2.5 px-4 text-left text-xs font-semibold text-surface-400 uppercase tracking-wide w-24">Max</th>
                      <th className="py-2.5 px-4 text-left text-xs font-semibold text-surface-400 uppercase tracking-wide w-20">Grade</th>
                      <th className="py-2.5 px-4 text-left text-xs font-semibold text-surface-400 uppercase tracking-wide">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resStudents.map(s => {
                      const row   = resRows[s.id] ?? { marks: '', maxMarks: '100', grade: '', remarks: '' };
                      const isSel = selStudents.has(s.id);
                      return (
                        <tr key={s.id} className={`border-b border-surface-100 dark:border-gray-800 transition-colors ${isSel ? '' : 'opacity-40'}`}>
                          <td className="py-2 px-4">
                            <input type="checkbox" checked={isSel}
                              onChange={e => setSelStudents(prev => { const n = new Set(prev); e.target.checked ? n.add(s.id) : n.delete(s.id); return n; })} />
                          </td>
                          <td className="py-2 px-4">
                            <p className="font-medium text-gray-800 dark:text-gray-200">{s.first_name} {s.last_name}</p>
                            {s.admission_no && <p className="text-[11px] text-surface-400">Adm: {s.admission_no}</p>}
                          </td>
                          <td className="py-2 px-4">
                            <input type="number" className="input w-full text-xs py-1.5" value={row.marks} min="0"
                              disabled={!isSel}
                              onChange={e => setResRows(r => ({...r, [s.id]: {...r[s.id], marks: e.target.value}}))} />
                          </td>
                          <td className="py-2 px-4">
                            <input type="number" className="input w-full text-xs py-1.5" value={row.maxMarks} min="1"
                              disabled={!isSel}
                              onChange={e => setResRows(r => ({...r, [s.id]: {...r[s.id], maxMarks: e.target.value}}))} />
                          </td>
                          <td className="py-2 px-4">
                            <input className="input w-full text-xs py-1.5" value={row.grade} placeholder="A+"
                              disabled={!isSel}
                              onChange={e => setResRows(r => ({...r, [s.id]: {...r[s.id], grade: e.target.value}}))} />
                          </td>
                          <td className="py-2 px-4">
                            <input className="input w-full text-xs py-1.5" value={row.remarks} placeholder="Optional"
                              disabled={!isSel}
                              onChange={e => setResRows(r => ({...r, [s.id]: {...r[s.id], remarks: e.target.value}}))} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-t border-surface-100 dark:border-gray-800">
                <p className="text-xs text-surface-400">{selStudents.size} of {resStudents.length} students selected</p>
                <button onClick={saveResults} disabled={savingRes || !resExamId || !resSubject || selStudents.size === 0}
                  className="btn btn-primary btn-sm">
                  {savingRes ? 'Saving...' : `Save Results (${selStudents.size})`}
                </button>
              </div>
            </div>
          )}

          {resClassId && resSubject && resStudents.length === 0 && (
            <div className="card p-8 text-center text-surface-400 text-sm">No students found for this class.</div>
          )}
        </div>
      )}
    </div>
  );
}
