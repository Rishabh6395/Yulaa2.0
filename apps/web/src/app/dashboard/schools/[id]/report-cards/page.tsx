'use client';

import { useEffect, useState, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Student {
  id: string; firstName: string; lastName: string; admissionNo: string;
  classId: string | null; status: string;
}
interface ClassItem { id: string; grade: string; section: string; name: string; }
interface Template  { id: string; name: string; templateType: string; }
interface SentCard  {
  id: string; studentId: string; term: string; academicYear: string;
  sentAt: string; status: string; academicRating: string; attendanceRating: string; behaviorRating: string;
  student: { firstName: string; lastName: string; admissionNo: string };
  sentBy: { firstName: string; lastName: string };
}

const TERMS = ['Term 1', 'Term 2', 'Term 3', 'Mid-term', 'Annual', 'Custom'];

function currentAcademicYear() {
  const y = new Date().getFullYear();
  const m = new Date().getMonth() + 1;
  return m >= 4 ? `${y}-${(y + 1).toString().slice(2)}` : `${y - 1}-${y.toString().slice(2)}`;
}

function academicYearOptions() {
  const base = new Date().getFullYear();
  return Array.from({ length: 4 }, (_, i) => {
    const y = base - 1 + i;
    return `${y}-${(y + 1).toString().slice(2)}`;
  });
}

const RATING_CLS: Record<string, string> = {
  'Excellent':         'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Good':              'bg-blue-100 text-blue-700 border-blue-200',
  'Average':           'bg-amber-100 text-amber-700 border-amber-200',
  'Below Average':     'bg-orange-100 text-orange-700 border-orange-200',
  'Needs Improvement': 'bg-red-100 text-red-700 border-red-200',
};

// ── Main component ────────────────────────────────────────────────────────────

export default function SendReportCardsPage({ params }: { params: { id: string } }) {
  const schoolId = params.id;

  // state
  const [classes,       setClasses]       = useState<ClassItem[]>([]);
  const [students,      setStudents]      = useState<Student[]>([]);
  const [templates,     setTemplates]     = useState<Template[]>([]);
  const [sentCards,     setSentCards]     = useState<SentCard[]>([]);

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set());
  const [academicYear,  setAcademicYear]  = useState(currentAcademicYear());
  const [term,          setTerm]          = useState('Term 1');
  const [customTerm,    setCustomTerm]    = useState('');
  const [templateId,    setTemplateId]    = useState('');
  const [remarks,       setRemarks]       = useState('');

  const [sending,       setSending]       = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [sentMsg,       setSentMsg]       = useState('');
  const [activeTab,     setActiveTab]     = useState<'compose' | 'history'>('compose');

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // load classes + templates
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/super-admin/schools/${schoolId}/classes`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => setClasses(d.classes ?? [])).catch(() => {}),
      fetch(`/api/letter-templates?type=report_card`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => setTemplates(d.templates ?? [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [schoolId]);

  // load students when class changes
  useEffect(() => {
    if (!selectedClass) { setStudents([]); setSelectedIds(new Set()); return; }
    fetch(`/api/super-admin/schools/${schoolId}/students?classId=${selectedClass}&status=active`,
      { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setStudents(d.students ?? []); setSelectedIds(new Set()); })
      .catch(() => {});
  }, [selectedClass, schoolId]);

  // load sent history
  const loadHistory = useCallback(async () => {
    const res = await fetch(
      `/api/report-cards?classId=${selectedClass}&academicYear=${academicYear}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const d = await res.json();
    setSentCards(d.reportCards ?? []);
  }, [selectedClass, academicYear]);

  useEffect(() => { if (activeTab === 'history') loadHistory(); }, [activeTab, loadHistory]);

  // toggle student selection
  const toggle = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    setSelectedIds(prev => prev.size === students.length ? new Set() : new Set(students.map(s => s.id)));
  };

  // send
  const send = async () => {
    if (selectedIds.size === 0) return;
    const effectiveTerm = term === 'Custom' ? customTerm.trim() : term;
    if (!effectiveTerm) { setSentMsg('Please enter a custom term name.'); return; }

    setSending(true);
    setSentMsg('');
    try {
      const res = await fetch('/api/report-cards', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          studentIds:    Array.from(selectedIds),
          academicYear,
          term:          effectiveTerm,
          teacherRemarks: remarks.trim() || undefined,
          templateId:    templateId || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSentMsg(`✓ Report cards sent to ${data.sent} student(s).`);
        setSelectedIds(new Set());
        setRemarks('');
        loadHistory();
      } else {
        setSentMsg(data.error ?? 'Failed to send report cards.');
      }
    } finally {
      setSending(false);
    }
  };

  const activeTerm = term === 'Custom' ? customTerm : term;
  const filteredStudents = students.filter(s => s.status === 'active');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-xl font-semibold text-gray-900">Send Report Cards</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Generate and send academic report cards to students and parents
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
          {(['compose', 'history'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all
                ${activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {tab === 'compose' ? 'Send Report' : 'History'}
            </button>
          ))}
        </div>

        {/* ── Compose tab ── */}
        {activeTab === 'compose' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: configuration panel */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                <h2 className="text-sm font-semibold text-gray-800">Report Settings</h2>

                {/* Class */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Class *</label>
                  <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select class…</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.grade}{c.section} — {c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Academic year */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Academic Year *</label>
                  <select value={academicYear} onChange={e => setAcademicYear(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {academicYearOptions().map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>

                {/* Term */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Term *</label>
                  <select value={term} onChange={e => setTerm(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {term === 'Custom' && (
                    <input type="text" value={customTerm} onChange={e => setCustomTerm(e.target.value)}
                      placeholder="Enter term name…"
                      className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  )}
                </div>

                {/* Template */}
                {templates.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Letter Template</label>
                    <select value={templateId} onChange={e => setTemplateId(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Default template</option>
                      {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                )}

                {/* Teacher remarks */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Teacher Remarks</label>
                  <textarea value={remarks} onChange={e => setRemarks(e.target.value)}
                    rows={3} placeholder="Optional remarks that will appear on every selected student's report card…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                {/* Send button */}
                <button
                  onClick={send}
                  disabled={sending || selectedIds.size === 0 || !selectedClass || !activeTerm}
                  className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2
                    ${selectedIds.size > 0 && selectedClass && activeTerm
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                >
                  {sending ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Sending…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                      </svg>
                      Send to {selectedIds.size > 0 ? `${selectedIds.size} Student${selectedIds.size > 1 ? 's' : ''}` : 'Selected Students'}
                    </>
                  )}
                </button>

                {sentMsg && (
                  <p className={`text-xs text-center font-medium ${sentMsg.startsWith('✓') ? 'text-emerald-600' : 'text-red-500'}`}>
                    {sentMsg}
                  </p>
                )}
              </div>
            </div>

            {/* Right: student list */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-sm font-semibold text-gray-800">Students</h2>
                    {filteredStudents.length > 0 && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {filteredStudents.length} active
                      </span>
                    )}
                  </div>
                  {filteredStudents.length > 0 && (
                    <button onClick={toggleAll}
                      className="text-xs text-blue-600 hover:underline font-medium">
                      {selectedIds.size === filteredStudents.length ? 'Deselect all' : 'Select all'}
                    </button>
                  )}
                </div>

                {!selectedClass ? (
                  <div className="py-16 text-center text-sm text-gray-400">
                    Select a class to view students
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="py-16 text-center text-sm text-gray-400">
                    No active students in this class
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {filteredStudents.map(s => {
                      const checked = selectedIds.has(s.id);
                      return (
                        <button key={s.id} onClick={() => toggle(s.id)}
                          className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-gray-50
                            ${checked ? 'bg-blue-50/50' : ''}`}>
                          {/* Checkbox */}
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors
                            ${checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                            {checked && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                              </svg>
                            )}
                          </div>
                          {/* Avatar */}
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
                            {s.firstName[0]}{s.lastName[0]}
                          </div>
                          {/* Name */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{s.firstName} {s.lastName}</p>
                            <p className="text-xs text-gray-400">#{s.admissionNo}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── History tab ── */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Filters */}
            <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
              <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); }}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All Classes</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.grade}{c.section}</option>)}
              </select>
              <select value={academicYear} onChange={e => setAcademicYear(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {academicYearOptions().map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <button onClick={loadHistory}
                className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
                Refresh
              </button>
            </div>

            {sentCards.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-400">No report cards sent yet</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {sentCards.map(card => (
                  <div key={card.id} className="px-5 py-4 flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-sm font-bold flex-shrink-0">
                      {card.student.firstName[0]}{card.student.lastName[0]}
                    </div>
                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {card.student.firstName} {card.student.lastName}
                        <span className="text-xs text-gray-400 font-normal ml-2">#{card.student.admissionNo}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {card.term} · {card.academicYear} · Sent by {card.sentBy.firstName} {card.sentBy.lastName} · {new Date(card.sentAt).toLocaleDateString()}
                      </p>
                    </div>
                    {/* Ratings */}
                    <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                      {[
                        { label: 'Academic',   val: card.academicRating },
                        { label: 'Attendance', val: card.attendanceRating },
                        { label: 'Behavior',   val: card.behaviorRating },
                      ].map(r => r.val ? (
                        <span key={r.label}
                          className={`text-xs px-2 py-0.5 rounded-full border font-medium ${RATING_CLS[r.val] ?? ''}`}
                          title={r.label}>
                          {r.val}
                        </span>
                      ) : null)}
                    </div>
                    {/* Viewed status */}
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${card.status === 'viewed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {card.status === 'viewed' ? 'Viewed' : 'Sent'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
