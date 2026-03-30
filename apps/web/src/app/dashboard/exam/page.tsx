'use client';

import { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/ui/Modal';
import { useApi } from '@/hooks/useApi';

const EXAM_TYPES  = ['unit_test', 'mid_term', 'final', 'pre_board', 'internal', 'other'];
const EXAM_STATUS = ['scheduled', 'ongoing', 'completed', 'cancelled'];
const GRADING_TYPES = ['marks', 'grade', 'both'];

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  scheduled: { label: 'Scheduled', cls: 'badge-primary' },
  ongoing:   { label: 'Ongoing',   cls: 'badge-success' },
  completed: { label: 'Completed', cls: 'badge-neutral' },
  cancelled: { label: 'Cancelled', cls: 'badge-danger' },
};

const EMPTY_EXAM = { title: '', examType: 'unit_test', academicYear: '', classId: '', startDate: '', endDate: '', gradingType: 'marks' };
const EMPTY_ENTRY = { classId: '', subject: '', date: '', startTime: '', endTime: '', maxMarks: '100', venue: '' };

export default function ExamPage() {
  const [exams,       setExams]       = useState<any[]>([]);
  const [activeExam,  setActiveExam]  = useState<any | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [showEntry,   setShowEntry]   = useState(false);
  const [showResult,  setShowResult]  = useState(false);
  const [activeSlot,  setActiveSlot]  = useState<any | null>(null);
  const [form,        setForm]        = useState(EMPTY_EXAM);
  const [entryForm,   setEntryForm]   = useState(EMPTY_ENTRY);
  const [resultForm,  setResultForm]  = useState({ studentId: '', subject: '', marksObtained: '', maxMarks: '100', grade: '' });
  const [saving,      setSaving]      = useState(false);
  const [msg,         setMsg]         = useState<{ type: string; text: string } | null>(null);
  const [role,        setRole]        = useState('');
  const [tab,         setTab]         = useState<'timetable' | 'results'>('timetable');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const { data: classData }   = useApi<{ classes:   any[] }>('/api/classes');
  const { data: studentData } = useApi<{ students:  any[] }>(activeExam ? `/api/students?classId=${activeExam.classId || ''}` : null);
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
                    {activeExam.classId && <span>Class: {classes.find(c => c.id === activeExam.classId)?.name || activeExam.classId}</span>}
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
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm">Exam Schedule ({activeExam.entries?.length ?? 0} subjects)</h3>
                    {isAdmin && (
                      <button onClick={() => setShowEntry(true)} className="btn-secondary text-xs py-1 px-3">+ Add Subject</button>
                    )}
                  </div>
                  {activeExam.entries?.length === 0 ? (
                    <p className="text-xs text-surface-400 dark:text-gray-500 text-center py-6">No subjects scheduled yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-surface-400 dark:text-gray-500 text-left border-b border-surface-100 dark:border-gray-700">
                            <th className="pb-2 font-medium">Subject</th>
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

      {/* Create Exam Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Create New Exam">
        <form onSubmit={handleCreateExam} className="space-y-4">
          <div>
            <label className="label">Exam Title *</label>
            <input className="input-field" required value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="e.g. Mid-Term Examination 2025" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Exam Type *</label>
              <select className="input-field" value={form.examType} onChange={e => setForm(f => ({...f, examType: e.target.value}))}>
                {EXAM_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Grading Type</label>
              <select className="input-field" value={form.gradingType} onChange={e => setForm(f => ({...f, gradingType: e.target.value}))}>
                {GRADING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Class (optional)</label>
              <select className="input-field" value={form.classId} onChange={e => setForm(f => ({...f, classId: e.target.value}))}>
                <option value="">All classes</option>
                {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Academic Year</label>
              <input className="input-field" value={form.academicYear} onChange={e => setForm(f => ({...f, academicYear: e.target.value}))} placeholder="2025-2026" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date</label>
              <input type="date" className="input-field" value={form.startDate} onChange={e => setForm(f => ({...f, startDate: e.target.value}))} />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" className="input-field" value={form.endDate} onChange={e => setForm(f => ({...f, endDate: e.target.value}))} />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Creating...' : 'Create Exam'}</button>
          </div>
        </form>
      </Modal>

      {/* Add Timetable Entry Modal */}
      <Modal open={showEntry} onClose={() => setShowEntry(false)} title="Add Subject to Schedule">
        <form onSubmit={handleAddEntry} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Class *</label>
              <select className="input-field" required value={entryForm.classId} onChange={e => setEntryForm(f => ({...f, classId: e.target.value}))}>
                <option value="">Select class</option>
                {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Subject *</label>
              <input className="input-field" required value={entryForm.subject} onChange={e => setEntryForm(f => ({...f, subject: e.target.value}))} placeholder="e.g. Mathematics" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Date *</label>
              <input type="date" className="input-field" required value={entryForm.date} onChange={e => setEntryForm(f => ({...f, date: e.target.value}))} />
            </div>
            <div>
              <label className="label">Start Time</label>
              <input type="time" className="input-field" value={entryForm.startTime} onChange={e => setEntryForm(f => ({...f, startTime: e.target.value}))} />
            </div>
            <div>
              <label className="label">End Time</label>
              <input type="time" className="input-field" value={entryForm.endTime} onChange={e => setEntryForm(f => ({...f, endTime: e.target.value}))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Max Marks</label>
              <input type="number" className="input-field" value={entryForm.maxMarks} onChange={e => setEntryForm(f => ({...f, maxMarks: e.target.value}))} min="1" />
            </div>
            <div>
              <label className="label">Venue</label>
              <input className="input-field" value={entryForm.venue} onChange={e => setEntryForm(f => ({...f, venue: e.target.value}))} placeholder="e.g. Hall A" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowEntry(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Adding...' : 'Add Subject'}</button>
          </div>
        </form>
      </Modal>

      {/* Enter Result Modal */}
      <Modal open={showResult} onClose={() => setShowResult(false)} title="Enter Exam Result">
        <form onSubmit={handleEnterResult} className="space-y-4">
          <div>
            <label className="label">Student *</label>
            <select className="input-field" required value={resultForm.studentId} onChange={e => setResultForm(f => ({...f, studentId: e.target.value}))}>
              <option value="">Select student</option>
              {students.map((s: any) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.admissionNo})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Subject *</label>
            <input className="input-field" required value={resultForm.subject} onChange={e => setResultForm(f => ({...f, subject: e.target.value}))} placeholder="e.g. Mathematics" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Marks *</label>
              <input type="number" step="0.01" className="input-field" required value={resultForm.marksObtained} onChange={e => setResultForm(f => ({...f, marksObtained: e.target.value}))} placeholder="0" />
            </div>
            <div>
              <label className="label">Max Marks</label>
              <input type="number" className="input-field" value={resultForm.maxMarks} onChange={e => setResultForm(f => ({...f, maxMarks: e.target.value}))} />
            </div>
            <div>
              <label className="label">Grade</label>
              <input className="input-field" value={resultForm.grade} onChange={e => setResultForm(f => ({...f, grade: e.target.value}))} placeholder="A+" />
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
