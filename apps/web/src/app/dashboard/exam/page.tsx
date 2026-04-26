'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Modal from '@/components/ui/Modal';
import { useApi } from '@/hooks/useApi';
import { useFormConfig } from '@/hooks/useFormConfig';

const EXAM_TYPES    = ['unit_test', 'mid_term', 'final', 'pre_board', 'internal', 'other'];
const EXAM_STATUS   = ['scheduled', 'ongoing', 'completed', 'cancelled'];
const GRADING_TYPES = ['marks', 'grade', 'both'];

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  scheduled: { label: 'Scheduled', cls: 'badge-primary' },
  ongoing:   { label: 'Ongoing',   cls: 'badge-success' },
  completed: { label: 'Completed', cls: 'badge-neutral' },
  cancelled: { label: 'Cancelled', cls: 'badge-danger' },
};

const EMPTY_EXAM  = { title: '', examType: 'unit_test', academicYear: '', classId: '', startDate: '', endDate: '', gradingType: 'marks' };
const EMPTY_ENTRY = { classId: '', subject: '', date: '', startTime: '', endTime: '', maxMarks: '100', venue: '' };

function className(c: any) {
  if (!c) return '';
  return c.name?.trim() ? c.name : `${c.grade} - Section ${c.section}`;
}

export default function ExamPage() {
  const [exams,       setExams]       = useState<any[]>([]);
  const [activeExam,  setActiveExam]  = useState<any | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [showEntry,   setShowEntry]   = useState(false);
  const [showResult,  setShowResult]  = useState(false);
  const [showBulk,    setShowBulk]    = useState(false);
  const [activeSlot,  setActiveSlot]  = useState<any | null>(null);
  const [form,        setForm]        = useState(EMPTY_EXAM);
  const [entryForm,   setEntryForm]   = useState(EMPTY_ENTRY);
  const [resultForm,  setResultForm]  = useState({ studentId: '', subject: '', marksObtained: '', maxMarks: '100', grade: '' });
  const [saving,      setSaving]      = useState(false);
  const [msg,         setMsg]         = useState<{ type: string; text: string } | null>(null);
  const [role,        setRole]        = useState('');
  const [tab,         setTab]         = useState<'timetable' | 'results'>('timetable');

  // Bulk upload state
  const [bulkClassId,  setBulkClassId]  = useState('');
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult,   setBulkResult]   = useState('');
  const bulkFileRef = useRef<HTMLInputElement>(null);

  const fc = useFormConfig('create_exam_form');
  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const { data: classData }   = useApi<{ classes: any[] }>('/api/classes');
  const { data: studentData } = useApi<{ students: any[] }>(activeExam ? `/api/students?classId=${activeExam.classId || ''}` : null);
  const classes  = classData?.classes  || [];
  const students = studentData?.students || [];

  const isAdmin   = ['school_admin', 'super_admin', 'principal'].includes(role);
  const isTeacher = role === 'teacher';

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/exam', { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      setExams(d.exams || []);
    } finally { setLoading(false); }
  }, [token]);

  const openExam = useCallback(async (id: string) => {
    const res = await fetch(`/api/exam?examId=${id}`, { headers: { Authorization: `Bearer ${token}` } });
    const d = await res.json();
    setActiveExam(d.exam || null);
  }, [token]);

  useEffect(() => {
    const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
    setRole(user.primaryRole || '');
    fetchExams();
  }, [fetchExams]);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMsg(null);
    try {
      const res = await fetch('/api/exam', { method: 'POST', headers, body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) { setMsg({ type: 'error', text: d.error || 'Failed' }); return; }
      setMsg({ type: 'success', text: 'Exam created!' });
      setShowForm(false); setForm(EMPTY_EXAM);
      fetchExams();
    } finally { setSaving(false); }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeExam) return;
    setSaving(true); setMsg(null);
    try {
      const res = await fetch('/api/exam', {
        method: 'POST', headers,
        body: JSON.stringify({ action: 'add_timetable_entry', examId: activeExam.id, ...entryForm }),
      });
      const d = await res.json();
      if (!res.ok) { setMsg({ type: 'error', text: d.error || 'Failed' }); return; }
      setMsg({ type: 'success', text: 'Entry added!' });
      setShowEntry(false); setEntryForm(EMPTY_ENTRY);
      openExam(activeExam.id);
    } finally { setSaving(false); }
  };

  const handleEnterResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeExam) return;
    setSaving(true); setMsg(null);
    try {
      const res = await fetch('/api/exam', {
        method: 'POST', headers,
        body: JSON.stringify({ action: 'enter_result', examId: activeExam.id, ...resultForm }),
      });
      const d = await res.json();
      if (!res.ok) { setMsg({ type: 'error', text: d.error || 'Failed' }); return; }
      setMsg({ type: 'success', text: 'Result saved!' });
      setShowResult(false); setResultForm({ studentId: '', subject: '', marksObtained: '', maxMarks: '100', grade: '' });
      openExam(activeExam.id);
    } finally { setSaving(false); }
  };

  const approveAll = async () => {
    if (!activeExam) return;
    await fetch('/api/exam', { method: 'POST', headers, body: JSON.stringify({ action: 'approve_results', examId: activeExam.id }) });
    openExam(activeExam.id);
    setMsg({ type: 'success', text: 'All results approved!' });
  };

  const deleteExam = async (id: string) => {
    if (!confirm('Delete this exam?')) return;
    await fetch('/api/exam', { method: 'DELETE', headers, body: JSON.stringify({ examId: id }) });
    if (activeExam?.id === id) setActiveExam(null);
    fetchExams();
  };

  // Download a pre-filled CSV template
  function downloadTemplate() {
    const rows = [
      'subject,date,start_time,end_time,max_marks,venue',
      'Mathematics,2025-06-01,09:00,11:00,100,Hall A',
      'English,2025-06-02,09:00,11:00,80,Hall B',
      'Science,2025-06-03,09:00,11:00,100,Hall A',
      'Social Studies,2025-06-04,09:00,11:00,80,Hall C',
      'Hindi,2025-06-05,09:00,11:00,80,Hall B',
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'exam-schedule-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Bulk upload handler — parses CSV and posts each row as a timetable entry
  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeExam) return;
    setBulkUploading(true); setBulkResult('');
    try {
      const text  = await file.text();
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) { setBulkResult('File has no data rows.'); return; }

      const headerLine = lines[0].toLowerCase();
      const isExam     = headerLine.includes('subject');
      let saved = 0; const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
        // Expected columns: subject, date, start_time, end_time, max_marks, venue
        const [subject, date, startTime, endTime, maxMarks, venue] = cols;
        if (!subject || !date) { errors.push(`Row ${i + 1}: subject and date required`); continue; }
        const classId = bulkClassId || activeExam.classId || '';
        if (!classId) { errors.push(`Row ${i + 1}: no class selected`); continue; }

        const res = await fetch('/api/exam', {
          method: 'POST', headers,
          body: JSON.stringify({
            action: 'add_timetable_entry',
            examId:    activeExam.id,
            classId,
            subject,
            date,
            startTime: startTime || '',
            endTime:   endTime   || '',
            maxMarks:  maxMarks  ? Number(maxMarks) : 100,
            venue:     venue     || '',
          }),
        });
        if (res.ok) saved++;
        else {
          const d = await res.json();
          errors.push(`Row ${i + 1} (${subject}): ${d.error || 'failed'}`);
        }
      }

      setBulkResult(
        `${saved} subject(s) uploaded.` +
        (errors.length ? ` ${errors.length} error(s): ${errors.join('; ')}` : '')
      );
      if (saved > 0) openExam(activeExam.id);
    } catch (err: any) {
      setBulkResult(`Error: ${err.message}`);
    } finally {
      setBulkUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">Exam Management</h1>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">Schedule exams, enter marks, approve results</p>
        </div>
        {isAdmin && (
          <button onClick={() => { setMsg(null); setShowForm(true); }} className="btn-primary flex items-center gap-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Exam
          </button>
        )}
      </div>

      {msg && (
        <div className={`px-4 py-2 rounded-xl text-sm font-medium ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'}`}>
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Exam list */}
        <div className="lg:col-span-1 space-y-3">
          {loading ? (
            [1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-surface-50 dark:bg-gray-800/40 animate-pulse" />)
          ) : exams.length === 0 ? (
            <div className="text-center py-12 text-surface-400 dark:text-gray-500">
              <div className="text-4xl mb-3">📝</div>
              <p className="text-sm">No exams scheduled yet.</p>
            </div>
          ) : exams.map(ex => {
            const sCfg = STATUS_CFG[ex.status] || STATUS_CFG.scheduled;
            return (
              <div key={ex.id}
                onClick={() => { openExam(ex.id); setTab('timetable'); }}
                className={`card p-4 cursor-pointer transition-all hover:shadow-md ${activeExam?.id === ex.id ? 'ring-2 ring-brand-400' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{ex.title}</p>
                    <p className="text-xs text-surface-400 dark:text-gray-500 mt-0.5 capitalize">{ex.examType?.replace('_', ' ')}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={sCfg.cls}>{sCfg.label}</span>
                      <span className="text-xs text-surface-400 dark:text-gray-500">
                        {ex._count?.entries ?? 0} subjects
                      </span>
                    </div>
                  </div>
                  {isAdmin && (
                    <button onClick={e => { e.stopPropagation(); deleteExam(ex.id); }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-surface-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all flex-shrink-0">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Exam detail */}
        <div className="lg:col-span-2">
          {!activeExam ? (
            <div className="card p-12 text-center text-surface-400 dark:text-gray-500">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-sm">Select an exam to view details</p>
            </div>
          ) : (
            <div className="card p-6 space-y-5">
              {/* Exam header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="text-xl font-display font-bold">{activeExam.title}</h2>
                    <span className={(STATUS_CFG[activeExam.status] || STATUS_CFG.scheduled).cls}>
                      {(STATUS_CFG[activeExam.status] || STATUS_CFG.scheduled).label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-surface-400 dark:text-gray-500 flex-wrap">
                    <span className="capitalize">{activeExam.examType?.replace('_', ' ')}</span>
                    {activeExam.startDate && <span>📅 {new Date(activeExam.startDate).toLocaleDateString('en-IN')}</span>}
                    {activeExam.classId && (
                      <span>Class: {className(classes.find(c => c.id === activeExam.classId)) || activeExam.classId}</span>
                    )}
                    <span>Grading: {activeExam.gradingType}</span>
                  </div>
                </div>
                {isAdmin && (
                  <select
                    value={activeExam.status}
                    onChange={async e => {
                      await fetch('/api/exam', { method: 'PATCH', headers, body: JSON.stringify({ examId: activeExam.id, status: e.target.value }) });
                      openExam(activeExam.id);
                    }}
                    className="input-field text-xs py-1 px-2"
                  >
                    {EXAM_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}
              </div>

              {/* Tabs */}
              <div className="flex gap-1 bg-surface-50 dark:bg-gray-800/40 rounded-xl p-1">
                {(['timetable', 'results'] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors capitalize ${
                      tab === t ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100' : 'text-surface-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}>
                    {t}
                  </button>
                ))}
              </div>

              {/* Timetable tab */}
              {tab === 'timetable' && (
                <div>
                  <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm">Exam Schedule ({activeExam.entries?.length ?? 0} subjects)</h3>
                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        {/* Bulk upload */}
                        <input
                          ref={bulkFileRef}
                          type="file"
                          accept=".csv"
                          className="hidden"
                          onChange={handleBulkUpload}
                        />
                        <button
                          onClick={() => { setBulkResult(''); setShowBulk(true); }}
                          className="btn-secondary text-xs py-1 px-3 flex items-center gap-1.5"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/><rect x="3" y="17" width="18" height="4" rx="1"/></svg>
                          Bulk Upload
                        </button>
                        <button onClick={() => { setEntryForm({ ...EMPTY_ENTRY, classId: activeExam.classId || '' }); setShowEntry(true); }} className="btn-secondary text-xs py-1 px-3">
                          + Add Subject
                        </button>
                      </div>
                    )}
                  </div>
                  {activeExam.entries?.length === 0 ? (
                    <div className="text-center py-8 text-surface-400 dark:text-gray-500">
                      <p className="text-xs mb-2">No subjects scheduled yet.</p>
                      {isAdmin && (
                        <p className="text-xs">Use <strong>+ Add Subject</strong> or <strong>Bulk Upload</strong> (CSV) to add the exam schedule.</p>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-surface-400 dark:text-gray-500 text-left border-b border-surface-100 dark:border-gray-700">
                            <th className="pb-2 font-medium">Subject</th>
                            <th className="pb-2 font-medium">Class</th>
                            <th className="pb-2 font-medium">Date</th>
                            <th className="pb-2 font-medium">Time</th>
                            <th className="pb-2 font-medium">Marks</th>
                            <th className="pb-2 font-medium">Venue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-50 dark:divide-gray-800">
                          {activeExam.entries?.map((e: any) => (
                            <tr key={e.id}>
                              <td className="py-2 font-medium">{e.subject}</td>
                              <td className="py-2">{className(classes.find((c: any) => c.id === e.classId)) || '—'}</td>
                              <td className="py-2">{e.date ? new Date(e.date).toLocaleDateString('en-IN') : '—'}</td>
                              <td className="py-2">{e.startTime} {e.endTime ? `– ${e.endTime}` : ''}</td>
                              <td className="py-2">{e.maxMarks}</td>
                              <td className="py-2">{e.venue || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Results tab */}
              {tab === 'results' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm">Results ({activeExam.results?.length ?? 0})</h3>
                    <div className="flex items-center gap-2">
                      {isAdmin && activeExam.results?.some((r: any) => !r.approved) && (
                        <button onClick={approveAll} className="btn-secondary text-xs py-1 px-3 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">✓ Approve All</button>
                      )}
                      {(isAdmin || isTeacher) && (
                        <button onClick={() => setShowResult(true)} className="btn-secondary text-xs py-1 px-3">+ Enter Result</button>
                      )}
                    </div>
                  </div>
                  {activeExam.results?.length === 0 ? (
                    <p className="text-xs text-surface-400 dark:text-gray-500 text-center py-6">No results entered yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-surface-400 dark:text-gray-500 text-left border-b border-surface-100 dark:border-gray-700">
                            <th className="pb-2 font-medium">Student</th>
                            <th className="pb-2 font-medium">Subject</th>
                            <th className="pb-2 font-medium">Marks</th>
                            <th className="pb-2 font-medium">Grade</th>
                            <th className="pb-2 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-50 dark:divide-gray-800">
                          {activeExam.results?.map((r: any) => (
                            <tr key={r.id}>
                              <td className="py-2">
                                <div>{r.student ? `${r.student.firstName} ${r.student.lastName}` : '—'}</div>
                                <div className="text-surface-400 dark:text-gray-500">{r.student?.admissionNo}</div>
                              </td>
                              <td className="py-2">{r.subject}</td>
                              <td className="py-2">{Number(r.marksObtained)}/{r.maxMarks}</td>
                              <td className="py-2">{r.grade || '—'}</td>
                              <td className="py-2">
                                {r.approved
                                  ? <span className="badge-success">Approved</span>
                                  : <span className="badge-neutral">Pending</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Create Exam Modal ──────────────────────────────────────────────────── */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Create New Exam">
        <form onSubmit={handleCreateExam} className="space-y-4">
          {fc.visible('name') && (
            <div>
              <label className="label">{fc.label('name')} *</label>
              <input className="input-field" required readOnly={!fc.editable('name')} value={form.title}
                onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="e.g. Mid-Term Examination 2025" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            {fc.visible('examType') && (
              <div>
                <label className="label">{fc.label('examType')} *</label>
                <select className="input-field" disabled={!fc.editable('examType')} value={form.examType}
                  onChange={e => setForm(f => ({...f, examType: e.target.value}))}>
                  {EXAM_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="label">Grading Type</label>
              <select className="input-field" value={form.gradingType} onChange={e => setForm(f => ({...f, gradingType: e.target.value}))}>
                {GRADING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {fc.visible('classId') && (
              <div>
                <label className="label">{fc.label('classId')}{fc.required('classId') ? ' *' : ' (optional)'}</label>
                <select className="input-field" disabled={!fc.editable('classId')} value={form.classId}
                  onChange={e => setForm(f => ({...f, classId: e.target.value}))}>
                  <option value="">All classes</option>
                  {classes.map((c: any) => (
                    <option key={c.id} value={c.id}>{className(c)}</option>
                  ))}
                </select>
                {form.classId && (() => {
                  const sel = classes.find((c: any) => c.id === form.classId);
                  return sel ? (
                    <p className="text-xs text-surface-400 mt-1">
                      Grade <strong>{sel.grade}</strong> — Section <strong>{sel.section}</strong>
                    </p>
                  ) : null;
                })()}
              </div>
            )}
            <div>
              <label className="label">Academic Year</label>
              <input className="input-field" value={form.academicYear}
                onChange={e => setForm(f => ({...f, academicYear: e.target.value}))} placeholder="2025-2026" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {fc.visible('examDate') && (
              <div>
                <label className="label">{fc.label('examDate')}{fc.required('examDate') && <span className="text-red-500 ml-0.5">*</span>}</label>
                <input type="date" className="input-field" readOnly={!fc.editable('examDate')} value={form.startDate}
                  onChange={e => setForm(f => ({...f, startDate: e.target.value}))} />
              </div>
            )}
            <div>
              <label className="label">End Date</label>
              <input type="date" className="input-field" value={form.endDate}
                onChange={e => setForm(f => ({...f, endDate: e.target.value}))} />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Creating...' : 'Create Exam'}</button>
          </div>
        </form>
      </Modal>

      {/* ── Add Subject to Schedule Modal ─────────────────────────────────────── */}
      <Modal open={showEntry} onClose={() => setShowEntry(false)} title="Add Subject to Schedule">
        <form onSubmit={handleAddEntry} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Class *</label>
              <select className="input-field" required value={entryForm.classId}
                onChange={e => setEntryForm(f => ({...f, classId: e.target.value}))}>
                <option value="">Select class</option>
                {classes.map((c: any) => (
                  <option key={c.id} value={c.id}>{className(c)}</option>
                ))}
              </select>
              {entryForm.classId && (() => {
                const sel = classes.find((c: any) => c.id === entryForm.classId);
                return sel ? (
                  <p className="text-xs text-surface-400 mt-1">
                    Grade <strong>{sel.grade}</strong> — Section <strong>{sel.section}</strong>
                  </p>
                ) : null;
              })()}
            </div>
            <div>
              <label className="label">Subject *</label>
              <input className="input-field" required value={entryForm.subject}
                onChange={e => setEntryForm(f => ({...f, subject: e.target.value}))} placeholder="e.g. Mathematics" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Date *</label>
              <input type="date" className="input-field" required value={entryForm.date}
                onChange={e => setEntryForm(f => ({...f, date: e.target.value}))} />
            </div>
            <div>
              <label className="label">Start Time</label>
              <input type="time" className="input-field" value={entryForm.startTime}
                onChange={e => setEntryForm(f => ({...f, startTime: e.target.value}))} />
            </div>
            <div>
              <label className="label">End Time</label>
              <input type="time" className="input-field" value={entryForm.endTime}
                onChange={e => setEntryForm(f => ({...f, endTime: e.target.value}))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Max Marks</label>
              <input type="number" className="input-field" value={entryForm.maxMarks}
                onChange={e => setEntryForm(f => ({...f, maxMarks: e.target.value}))} min="1" />
            </div>
            <div>
              <label className="label">Venue</label>
              <input className="input-field" value={entryForm.venue}
                onChange={e => setEntryForm(f => ({...f, venue: e.target.value}))} placeholder="e.g. Hall A" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowEntry(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Adding...' : 'Add Subject'}</button>
          </div>
        </form>
      </Modal>

      {/* ── Bulk Upload Modal ──────────────────────────────────────────────────── */}
      <Modal open={showBulk} onClose={() => setShowBulk(false)} title="Bulk Upload Exam Schedule">
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-400 space-y-1">
            <p className="font-semibold">CSV format (header row required):</p>
            <p className="font-mono">subject, date (YYYY-MM-DD), start_time (HH:MM), end_time (HH:MM), max_marks, venue</p>
            <p className="mt-1 text-blue-600 dark:text-blue-300">Example:</p>
            <p className="font-mono">Mathematics,2025-04-15,09:00,11:00,100,Hall A</p>
            <p className="font-mono">English,2025-04-16,09:00,11:00,80,Hall B</p>
          </div>

          <button
            type="button"
            onClick={downloadTemplate}
            className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7,10 12,15 17,10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download Template (.csv)
          </button>

          {/* Class selector — only show if exam is for all classes */}
          {!activeExam?.classId && (
            <div>
              <label className="label">Class *</label>
              <select className="input-field" value={bulkClassId} onChange={e => setBulkClassId(e.target.value)}>
                <option value="">Select class</option>
                {classes.map((c: any) => (
                  <option key={c.id} value={c.id}>{className(c)}</option>
                ))}
              </select>
              {bulkClassId && (() => {
                const sel = classes.find((c: any) => c.id === bulkClassId);
                return sel ? (
                  <p className="text-xs text-surface-400 mt-1">
                    Grade <strong>{sel.grade}</strong> — Section <strong>{sel.section}</strong>
                  </p>
                ) : null;
              })()}
            </div>
          )}
          {activeExam?.classId && (
            <p className="text-xs text-surface-400">
              Class: <strong className="text-gray-700 dark:text-gray-300">
                {className(classes.find((c: any) => c.id === activeExam.classId)) || activeExam.classId}
              </strong>
            </p>
          )}

          <input
            ref={bulkFileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleBulkUpload}
          />
          <button
            onClick={() => bulkFileRef.current?.click()}
            disabled={bulkUploading || (!activeExam?.classId && !bulkClassId)}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {bulkUploading ? (
              <>
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                Uploading…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Select CSV File & Upload
              </>
            )}
          </button>

          {bulkResult && (
            <div className={`px-3 py-2 rounded-xl text-xs font-medium ${bulkResult.includes('error') ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'}`}>
              {bulkResult}
            </div>
          )}

          <button type="button" onClick={() => setShowBulk(false)} className="btn-secondary w-full">Close</button>
        </div>
      </Modal>

      {/* ── Enter Result Modal ─────────────────────────────────────────────────── */}
      <Modal open={showResult} onClose={() => setShowResult(false)} title="Enter Exam Result">
        <form onSubmit={handleEnterResult} className="space-y-4">
          <div>
            <label className="label">Student *</label>
            <select className="input-field" required value={resultForm.studentId}
              onChange={e => setResultForm(f => ({...f, studentId: e.target.value}))}>
              <option value="">Select student</option>
              {students.map((s: any) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.admissionNo})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Subject *</label>
            {activeExam?.entries?.length > 0 ? (
              <select className="input-field" required value={resultForm.subject}
                onChange={e => setResultForm(f => ({...f, subject: e.target.value}))}>
                <option value="">Select subject</option>
                {[...new Set<string>(activeExam.entries.map((e: any) => e.subject))].map((s: string) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            ) : (
              <input className="input-field" required value={resultForm.subject}
                onChange={e => setResultForm(f => ({...f, subject: e.target.value}))} placeholder="e.g. Mathematics" />
            )}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Marks *</label>
              <input type="number" step="0.01" className="input-field" required value={resultForm.marksObtained}
                onChange={e => setResultForm(f => ({...f, marksObtained: e.target.value}))} placeholder="0" />
            </div>
            <div>
              <label className="label">Max Marks</label>
              <input type="number" className="input-field" value={resultForm.maxMarks}
                onChange={e => setResultForm(f => ({...f, maxMarks: e.target.value}))} />
            </div>
            <div>
              <label className="label">Grade</label>
              <input className="input-field" value={resultForm.grade}
                onChange={e => setResultForm(f => ({...f, grade: e.target.value}))} placeholder="A+" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowResult(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save Result'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
