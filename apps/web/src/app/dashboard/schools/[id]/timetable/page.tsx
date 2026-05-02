'use client';

import { useEffect, useRef, useState } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ClassItem { id: string; name: string; grade: string; section: string; }
interface Teacher   { id: string; first_name: string; last_name: string; }
interface Period    { no: number; startTime: string; endTime: string; }
interface SlotData  { subject: string; teacherId: string; }

const DAYS = [
  { no: 1, label: 'Monday',    short: 'Mon' },
  { no: 2, label: 'Tuesday',   short: 'Tue' },
  { no: 3, label: 'Wednesday', short: 'Wed' },
  { no: 4, label: 'Thursday',  short: 'Thu' },
  { no: 5, label: 'Friday',    short: 'Fri' },
  { no: 6, label: 'Saturday',  short: 'Sat' },
];

const DEFAULT_PERIODS: Period[] = [
  { no: 1, startTime: '08:00', endTime: '08:45' },
  { no: 2, startTime: '08:45', endTime: '09:30' },
  { no: 3, startTime: '09:45', endTime: '10:30' },
  { no: 4, startTime: '10:30', endTime: '11:15' },
  { no: 5, startTime: '11:30', endTime: '12:15' },
  { no: 6, startTime: '13:00', endTime: '13:45' },
  { no: 7, startTime: '13:45', endTime: '14:30' },
  { no: 8, startTime: '14:30', endTime: '15:15' },
];

// Derive the active Indian academic year (April–March) from today's date
function activeAcademicYear(): string {
  const now = new Date();
  const y   = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}-${y + 1}`;
}

function slotKey(day: number, period: number) { return `${day}_${period}`; }
function initGrid(periods: Period[], activeDays: number[]): Record<string, SlotData> {
  const g: Record<string, SlotData> = {};
  activeDays.forEach(d => periods.forEach(p => { g[slotKey(d, p.no)] = { subject: '', teacherId: '' }; }));
  return g;
}
function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function TimetablePage({ params }: { params: { id: string } }) {
  const schoolId = params.id;

  const academicYear = activeAcademicYear();
  const [classes,        setClasses]        = useState<ClassItem[]>([]);
  const [teachers,       setTeachers]       = useState<Teacher[]>([]);
  const [classSubjects,  setClassSubjects]  = useState<string[]>([]);
  const [selectedClass,  setSelectedClass]  = useState('');
  const [activeDays,     setActiveDays]     = useState<number[]>([1, 2, 3, 4, 5]);
  const [periods,        setPeriods]        = useState<Period[]>(DEFAULT_PERIODS);
  const [grid,           setGrid]           = useState<Record<string, SlotData>>({});
  const [loadingTT,      setLoadingTT]      = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [saved,          setSaved]          = useState(false);
  const [error,          setError]          = useState('');
  const [view,           setView]           = useState<'grid' | 'periods' | 'upload' | 'reassign'>('grid');
  const [newPeriod,      setNewPeriod]      = useState({ startTime: '', endTime: '' });

  // Excel upload
  const fileRef       = useRef<HTMLInputElement>(null);
  const [uploading,   setUploading]   = useState(false);
  const [uploadResult, setUploadResult] = useState('');

  // Proxy reassignment
  const [proxyTeacher,     setProxyTeacher]     = useState('');
  const [proxySlots,       setProxySlots]       = useState<any[]>([]);
  const [proxyLoading,     setProxyLoading]     = useState(false);
  const [reassignments,    setReassignments]    = useState<any[]>([]);
  const [reassignModal,    setReassignModal]    = useState<any | null>(null);
  const [reassignForm,     setReassignForm]     = useState({ substituteTeacherId: '', startDate: '', endDate: '', reason: '' });
  const [reassigning,      setReassigning]      = useState(false);

  const token = () => typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
  const headers = (json = true) => ({ ...(json ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${token()}` });

  // Load classes + teachers
  useEffect(() => {
    const h = headers(false);
    Promise.all([
      fetch(`/api/super-admin/schools/${schoolId}/classes`,  { headers: h }).then(r => r.json()),
      fetch(`/api/super-admin/schools/${schoolId}/teachers`, { headers: h }).then(r => r.json()),
    ]).then(([cd, td]) => {
      setClasses(cd.classes   || []);
      setTeachers(td.teachers || []);
    }).catch((err: unknown) => { if (process.env.NODE_ENV === 'development') console.error('[classes/teachers]', err); });
  }, [schoolId]);

  // Fetch subjects from stream master for this school's class when class changes
  useEffect(() => {
    if (!selectedClass) { setClassSubjects([]); return; }
    fetch(`/api/masters/streams?classId=${selectedClass}&schoolId=${schoolId}`, { headers: headers(false) })
      .then(r => r.json())
      .then(d => setClassSubjects((d.streamMasters || []).map((m: any) => m.name)))
      .catch(() => setClassSubjects([]));
  }, [selectedClass, schoolId]);

  // Load timetable when class/year changes
  useEffect(() => {
    if (!selectedClass) return;
    setLoadingTT(true);
    fetch(`/api/super-admin/schools/${schoolId}/timetable?classId=${selectedClass}&year=${academicYear}`, { headers: headers(false) })
      .then(r => r.json())
      .then(d => {
        if (d.timetable?.slots?.length) {
          const periodMap: Record<number, Period> = {};
          d.timetable.slots.forEach((s: any) => {
            periodMap[s.periodNo] = { no: s.periodNo, startTime: s.startTime, endTime: s.endTime };
          });
          const derivedPeriods = Object.values(periodMap).sort((a, b) => a.no - b.no);
          if (derivedPeriods.length) setPeriods(derivedPeriods);
          const derivedDays = [...new Set<number>(d.timetable.slots.map((s: any) => s.dayOfWeek as number))];
          if (derivedDays.length) setActiveDays(derivedDays.sort((a, b) => a - b));
          const newGrid: Record<string, SlotData> = {};
          d.timetable.slots.forEach((s: any) => {
            newGrid[slotKey(s.dayOfWeek, s.periodNo)] = { subject: s.subject, teacherId: s.teacherId || '' };
          });
          setGrid(newGrid);
        } else {
          setGrid(initGrid(periods, activeDays));
        }
      })
      .catch(() => setGrid(initGrid(periods, activeDays)))
      .finally(() => setLoadingTT(false));
  }, [selectedClass, academicYear]);

  // Load reassignments for proxy view
  const loadReassignments = () => {
    fetch('/api/timetable/reassign', { headers: headers(false) })
      .then(r => r.json())
      .then(d => setReassignments(d.reassignments || []))
      .catch((err: unknown) => { if (process.env.NODE_ENV === 'development') console.error('[reassignments]', err); });
  };

  // Load proxy teacher's slots when a teacher is selected in proxy mode
  useEffect(() => {
    if (!proxyTeacher || view !== 'reassign') return;
    setProxyLoading(true);
    loadReassignments();
    // Fetch all timetable slots for this teacher across all classes
    fetch(`/api/super-admin/schools/${schoolId}/timetable`, { headers: headers(false) })
      .then(r => r.json())
      .then(async d => {
        const allTimetables = d.timetables || [];
        const slots: any[] = [];
        for (const tt of allTimetables) {
          const detail = await fetch(
            `/api/super-admin/schools/${schoolId}/timetable?classId=${tt.class.id}&year=${academicYear}`,
            { headers: headers(false) },
          ).then(r => r.json());
          detail.timetable?.slots?.forEach((s: any) => {
            if (s.teacherId === proxyTeacher) {
              slots.push({ ...s, className: tt.class.name || `${tt.class.grade}-${tt.class.section}` });
            }
          });
        }
        setProxySlots(slots.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.periodNo - b.periodNo));
      })
      .catch((err: unknown) => { if (process.env.NODE_ENV === 'development') console.error('[proxy-slots]', err); })
      .finally(() => setProxyLoading(false));
  }, [proxyTeacher, view]);

  // ── Timetable grid helpers ───────────────────────────────────────────────────
  function updateSlot(day: number, period: number, field: keyof SlotData, val: string) {
    const k = slotKey(day, period);
    setGrid(g => ({ ...g, [k]: { ...g[k], [field]: val } }));
  }
  function toggleDay(d: number) {
    setActiveDays(days => {
      if (days.includes(d)) { if (days.length === 1) return days; return days.filter(x => x !== d); }
      return [...days, d].sort((a, b) => a - b);
    });
  }
  function addPeriod() {
    if (!newPeriod.startTime || !newPeriod.endTime) return;
    const no = periods.length + 1;
    setPeriods(p => [...p, { no, startTime: newPeriod.startTime, endTime: newPeriod.endTime }]);
    setNewPeriod({ startTime: '', endTime: '' });
  }
  function removePeriod(no: number) {
    setPeriods(p => p.filter(x => x.no !== no).map((x, i) => ({ ...x, no: i + 1 })));
  }
  function updatePeriodTime(no: number, field: 'startTime' | 'endTime', val: string) {
    setPeriods(p => p.map(x => x.no === no ? { ...x, [field]: val } : x));
  }
  async function saveTimetable() {
    if (!selectedClass) return;
    setSaving(true); setError('');
    try {
      const slots = [];
      for (const day of activeDays) {
        for (const period of periods) {
          const data = grid[slotKey(day, period.no)];
          if (!data?.subject?.trim()) continue;
          slots.push({ dayOfWeek: day, periodNo: period.no, startTime: period.startTime, endTime: period.endTime, subject: data.subject.trim(), teacherId: data.teacherId || null });
        }
      }
      await fetch(`/api/super-admin/schools/${schoolId}/timetable`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ classId: selectedClass, academicYear, slots }),
      });
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch { setError('Failed to save timetable'); }
    finally { setSaving(false); }
  }

  // ── Excel upload ─────────────────────────────────────────────────────────────
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setUploadResult(''); setError('');
    try {
      const ext      = file.name.split('.').pop()?.toLowerCase() || '';
      const fileExt  = ext === 'csv' ? 'csv' : 'xlsx';
      const buf      = await file.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const fileData = btoa(binary);

      const res  = await fetch(`/api/super-admin/schools/${schoolId}/timetable`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ action: 'bulk_upload', fileData, fileExt, academicYear }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'Failed to upload timetable — check the file format and try again'); }
      else { setUploadResult(`${d.saved} slot(s) imported across ${d.classes} class(es). Skipped: ${d.skipped}.`); }
    } catch { setError('Failed to upload file'); }
    finally { setUploading(false); e.target.value = ''; }
  }

  // ── Proxy reassign ────────────────────────────────────────────────────────────
  async function submitReassign(e: React.FormEvent) {
    e.preventDefault();
    if (!reassignModal) return;
    setReassigning(true); setError('');
    try {
      const res = await fetch(`/api/super-admin/schools/${schoolId}/timetable`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({
          action:              'reassign',
          slotId:              reassignModal.id,
          substituteTeacherId: reassignForm.substituteTeacherId,
          startDate:           reassignForm.startDate,
          endDate:             reassignForm.endDate,
          reason:              reassignForm.reason,
          proxyTeacherId:      proxyTeacher || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'Failed to reassign teacher — please try again'); setReassigning(false); return; }
      setReassignModal(null);
      loadReassignments();
    } catch { setError('Failed to reassign teacher — please try again'); }
    finally { setReassigning(false); }
  }

  async function cancelReassignment(id: string) {
    await fetch(`/api/timetable/reassign?id=${id}`, { method: 'DELETE', headers: headers(false) });
    loadReassignments();
  }

  const selectedClassData = classes.find(c => c.id === selectedClass);
  const filledSlots = Object.values(grid).filter(s => s.subject?.trim()).length;

  const VIEWS: { id: 'periods' | 'grid' | 'upload' | 'reassign'; label: string }[] = [
    { id: 'periods',  label: 'Configure Periods' },
    { id: 'grid',     label: 'Timetable Grid' },
    { id: 'upload',   label: 'Bulk Upload' },
    { id: 'reassign', label: 'Proxy Reassign' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Timetable Builder</h1>
          <p className="text-sm text-surface-400 mt-0.5">Assign subject-wise teachers per class and section. Each class/section has its own independent timetable.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {VIEWS.map(v => (
            <button key={v.id} onClick={() => setView(v.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${view === v.id ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300' : 'border-surface-200 dark:border-gray-700 text-surface-400 hover:border-brand-300'}`}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sync badge */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-emerald-700 dark:text-emerald-400 w-fit">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
        Timetable syncs with daily attendance — teachers mark attendance subject-wise. Changes apply in real-time.
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          {error}<button onClick={() => setError('')} className="ml-auto text-lg leading-none">×</button>
        </div>
      )}

      {/* Controls row (shown for grid/periods views) */}
      {(view === 'grid' || view === 'periods') && (
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-surface-400 uppercase tracking-wide">Academic Year</label>
            <div className="flex items-center h-9 px-3 text-sm font-semibold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800 rounded-lg w-36">
              {academicYear}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-surface-400 uppercase tracking-wide">Class / Section</label>
            <select className="input w-52" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
              <option value="">— Select Class —</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.grade} - {c.section} {c.name ? `(${c.name})` : ''}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-surface-400 uppercase tracking-wide">Working Days</label>
            <div className="flex gap-1">
              {DAYS.map(d => (
                <button key={d.no} onClick={() => toggleDay(d.no)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${activeDays.includes(d.no) ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300' : 'border-surface-200 dark:border-gray-700 text-surface-400'}`}>
                  {d.short}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {!selectedClass && (view === 'grid' || view === 'periods') && (
        <div className="card p-12 text-center text-surface-400 text-sm">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 opacity-40">
            <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>
          </svg>
          Select a class and section to view or create its timetable.
        </div>
      )}

      {/* ── Period Configuration ──────────────────────────────────────────── */}
      {view === 'periods' && selectedClass && (
        <div className="card p-6 space-y-4 max-w-2xl">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              Period Schedule — {selectedClassData?.grade} {selectedClassData?.section}
            </h2>
            <p className="text-xs text-surface-400 mt-0.5">Define period timings. These apply to all days.</p>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-3 px-2 text-xs font-semibold text-surface-400 uppercase tracking-wide">
              <span className="w-8">P#</span><span>Start</span><span>End</span><span className="w-6" />
            </div>
            {periods.map(p => (
              <div key={p.no} className="grid grid-cols-[auto_1fr_1fr_auto] gap-3 items-center p-2 rounded-xl bg-surface-50 dark:bg-gray-700/40">
                <span className="w-8 text-center text-xs font-bold text-brand-600 dark:text-brand-400">P{p.no}</span>
                <input type="time" className="input text-sm py-1" value={p.startTime}
                  onChange={e => updatePeriodTime(p.no, 'startTime', e.target.value)} />
                <input type="time" className="input text-sm py-1" value={p.endTime}
                  onChange={e => updatePeriodTime(p.no, 'endTime', e.target.value)} />
                <button onClick={() => removePeriod(p.no)} className="w-6 text-surface-300 hover:text-red-500 transition-colors">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 items-end pt-1 border-t border-surface-100 dark:border-gray-700">
            <div className="space-y-1 flex-1">
              <label className="text-xs text-surface-400">Start time</label>
              <input type="time" className="input text-sm" value={newPeriod.startTime}
                onChange={e => setNewPeriod(p => ({ ...p, startTime: e.target.value }))} />
            </div>
            <div className="space-y-1 flex-1">
              <label className="text-xs text-surface-400">End time</label>
              <input type="time" className="input text-sm" value={newPeriod.endTime}
                onChange={e => setNewPeriod(p => ({ ...p, endTime: e.target.value }))} />
            </div>
            <button onClick={addPeriod} className="btn btn-secondary">+ Add Period</button>
          </div>
          <button onClick={() => setView('grid')} className="btn btn-primary">Done → Edit Timetable Grid</button>
        </div>
      )}

      {/* ── Timetable Grid ────────────────────────────────────────────────── */}
      {view === 'grid' && selectedClass && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                {selectedClassData?.grade} — Section {selectedClassData?.section}
              </h2>
              {filledSlots > 0 && (
                <span className="text-xs bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full border border-brand-200 dark:border-brand-800">
                  {filledSlots} slots filled
                </span>
              )}
            </div>
            {loadingTT && <span className="text-xs text-surface-400 animate-pulse">Loading...</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm min-w-[600px]">
              <thead>
                <tr>
                  <th className="text-left py-2 pr-3 text-xs font-semibold text-surface-400 uppercase tracking-wide w-28">Period</th>
                  {activeDays.map(d => {
                    const day = DAYS.find(x => x.no === d)!;
                    return (
                      <th key={d} className="py-2 px-1 text-xs font-semibold text-surface-400 uppercase tracking-wide text-center min-w-[140px]">
                        {day.label}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {periods.map(period => (
                  <tr key={period.no} className="border-t border-surface-100 dark:border-gray-700/60">
                    <td className="py-2 pr-3 align-top">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-brand-600 dark:text-brand-400">P{period.no}</span>
                        <span className="text-[10px] text-surface-400 font-mono">{period.startTime}–{period.endTime}</span>
                      </div>
                    </td>
                    {activeDays.map(day => {
                      const k = slotKey(day, period.no);
                      const slot = grid[k] || { subject: '', teacherId: '' };
                      const hasSubject = slot.subject?.trim();
                      return (
                        <td key={day} className="py-1 px-1 align-top">
                          <div className={`rounded-xl border p-2 space-y-1.5 transition-colors ${hasSubject ? 'border-brand-200 dark:border-brand-800 bg-brand-50/60 dark:bg-brand-950/20' : 'border-surface-200 dark:border-gray-700 bg-surface-50 dark:bg-gray-800/40'}`}>
                            {classSubjects.length > 0 ? (
                              <select
                                className="w-full text-xs bg-transparent border-0 outline-none text-gray-800 dark:text-gray-200 font-medium cursor-pointer"
                                value={slot.subject}
                                onChange={e => updateSlot(day, period.no, 'subject', e.target.value)}
                              >
                                <option value="">— Subject —</option>
                                {classSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            ) : (
                              <input
                                className="w-full text-xs bg-transparent border-0 outline-none text-gray-800 dark:text-gray-200 placeholder-surface-300 dark:placeholder-gray-600 font-medium"
                                placeholder="Subject..."
                                value={slot.subject}
                                onChange={e => updateSlot(day, period.no, 'subject', e.target.value)}
                              />
                            )}
                            <select
                              className="w-full text-[11px] bg-white dark:bg-gray-800 border border-surface-200 dark:border-gray-600 rounded-lg px-1.5 py-1 text-gray-600 dark:text-gray-400 focus:outline-none focus:border-brand-400"
                              value={slot.teacherId}
                              onChange={e => updateSlot(day, period.no, 'teacherId', e.target.value)}
                            >
                              <option value="">— Teacher —</option>
                              {teachers.map(t => (
                                <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                              ))}
                            </select>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button onClick={saveTimetable} disabled={saving || !selectedClass} className="btn btn-primary flex items-center gap-2">
              {saving
                ? <><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Saving...</>
                : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20,6 9,17 4,12"/></svg>Save Timetable</>
              }
            </button>
            {saved && <span className="text-sm text-emerald-600 font-medium flex items-center gap-1"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20,6 9,17 4,12"/></svg>Saved & synced!</span>}
            <span className="text-xs text-surface-400">Each class/section has its own independent timetable.</span>
          </div>
        </div>
      )}

      {/* ── Bulk Upload ───────────────────────────────────────────────────── */}
      {view === 'upload' && (
        <div className="space-y-6 max-w-2xl">
          <div className="card p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Bulk Timetable Upload</h2>
              <p className="text-xs text-surface-400 mt-0.5">Upload an Excel/CSV file to populate timetable slots for multiple classes at once.</p>
            </div>

            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-400 space-y-1">
              <p className="font-semibold">Required columns (in order):</p>
              <p>class_id · day_of_week (1=Mon … 6=Sat) · period_no · start_time (HH:MM) · end_time (HH:MM) · subject · teacher_id (optional)</p>
              <p>Each row = one slot. Use UUIDs from your school's class/teacher lists.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-surface-400 uppercase tracking-wide">Academic Year</label>
              <div className="flex items-center h-9 px-3 text-sm font-semibold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800 rounded-lg w-36">
                {academicYear}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 p-3 bg-surface-50 dark:bg-gray-700/40 rounded-xl">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-surface-400"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
              <div className="flex-1 min-w-0">
                <span className="text-sm text-gray-700 dark:text-gray-300">Upload timetable for {academicYear}</span>
                <p className="text-xs text-surface-400 mt-0.5">Accepts .xlsx or .csv · Existing slots for each class will be replaced</p>
              </div>
              <a href={`/api/super-admin/schools/${schoolId}/timetable?action=template`}
                className="btn btn-secondary text-xs flex items-center gap-1.5 shrink-0 no-underline" download>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Template
              </a>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
              <button onClick={() => { setUploadResult(''); fileRef.current?.click(); }} disabled={uploading}
                className="btn btn-secondary text-xs flex items-center gap-1.5 shrink-0">
                {uploading
                  ? <><svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Uploading...</>
                  : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>Upload Excel/CSV</>
                }
              </button>
            </div>
            {uploadResult && (
              <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20,6 9,17 4,12"/></svg>
                {uploadResult}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Proxy Reassign ────────────────────────────────────────────────── */}
      {view === 'reassign' && (
        <div className="space-y-6">
          <div className="card p-6 space-y-4 max-w-2xl">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Proxy Reassignment</h2>
              <p className="text-xs text-surface-400 mt-0.5">
                Act on behalf of a teacher to reassign their classes to a substitute for a date range.
                Both the original and substitute teacher will see the updated timetable.
              </p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-400">
              Select a teacher → view their slots → click Reassign on any slot.
              The substitute teacher will see it as an <strong>amber/highlighted</strong> block on their timetable.
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-surface-400 uppercase tracking-wide">Teacher (Proxy For)</label>
              <select className="input w-64" value={proxyTeacher} onChange={e => setProxyTeacher(e.target.value)}>
                <option value="">— Select a teacher —</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Proxy teacher's slots */}
          {proxyTeacher && (
            <div className="card p-6 space-y-4 max-w-4xl">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Timetable for {teachers.find(t => t.id === proxyTeacher)?.first_name} {teachers.find(t => t.id === proxyTeacher)?.last_name}
              </h3>

              {proxyLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-surface-50 dark:bg-gray-800 rounded-xl animate-pulse"/>)}</div>
              ) : proxySlots.length === 0 ? (
                <p className="text-sm text-surface-400 text-center py-6">No timetable slots found for this teacher.</p>
              ) : (
                <div className="space-y-2">
                  {/* Group by day */}
                  {[1,2,3,4,5,6].map(dayNo => {
                    const daySlots = proxySlots.filter(s => s.dayOfWeek === dayNo);
                    if (!daySlots.length) return null;
                    const dayLabel = DAYS.find(d => d.no === dayNo)?.label;
                    return (
                      <div key={dayNo}>
                        <p className="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-1.5">{dayLabel}</p>
                        <div className="space-y-1.5 pl-2">
                          {daySlots.map(slot => {
                            const activeReassign = reassignments.find(r => r.slotId === slot.id && r.isActive);
                            return (
                              <div key={slot.id} className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${activeReassign ? 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20' : 'border-surface-200 dark:border-gray-700 bg-surface-50 dark:bg-gray-700/40'}`}>
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="text-xs font-bold text-brand-600 dark:text-brand-400 w-6">P{slot.periodNo}</span>
                                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{slot.subject}</span>
                                  <span className="text-xs bg-surface-100 dark:bg-gray-700 text-surface-400 px-1.5 py-0.5 rounded">{slot.className}</span>
                                  <span className="text-xs text-surface-400">{slot.startTime}–{slot.endTime}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {activeReassign ? (
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-amber-600 dark:text-amber-400">→ {activeReassign.substituteTeacherName} until {fmtDate(activeReassign.endDate)}</span>
                                      <button onClick={() => cancelReassignment(activeReassign.id)}
                                        className="text-xs text-red-500 hover:underline">Cancel</button>
                                    </div>
                                  ) : (
                                    <button onClick={() => { setReassignModal(slot); setReassignForm({ substituteTeacherId: '', startDate: new Date().toISOString().split('T')[0], endDate: '', reason: '' }); }}
                                      className="btn btn-secondary text-xs flex items-center gap-1 py-1">
                                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
                                      Reassign
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* All active reassignments */}
          <div className="card p-6 space-y-4 max-w-4xl">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">All Active Reassignments</h3>
            <button onClick={loadReassignments} className="btn btn-secondary text-xs">Refresh</button>
            {reassignments.length === 0 ? (
              <p className="text-sm text-surface-400 py-4 text-center">No active reassignments.</p>
            ) : (
              <div className="space-y-2">
                {reassignments.map(r => (
                  <div key={r.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-surface-50 dark:bg-gray-700/40 border border-surface-200 dark:border-gray-700">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{r.subject}</span>
                        <span className="text-xs bg-surface-100 dark:bg-gray-700 text-surface-400 px-1.5 py-0.5 rounded">{r.className}</span>
                        <span className="text-xs text-surface-400">P{r.periodNo} · {DAYS.find(d => d.no === r.dayOfWeek)?.label}</span>
                      </div>
                      <p className="text-xs text-surface-400">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{r.originalTeacherName}</span>
                        {' '}→{' '}
                        <span className="font-medium text-amber-600 dark:text-amber-400">{r.substituteTeacherName}</span>
                      </p>
                      <p className="text-xs text-surface-400">{fmtDate(r.startDate)} – {fmtDate(r.endDate)}{r.reason ? ` · ${r.reason}` : ''}</p>
                    </div>
                    <button onClick={() => cancelReassignment(r.id)}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline shrink-0 pt-0.5">
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reassign Slot Modal */}
      {reassignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Reassign — {reassignModal.subject} (P{reassignModal.periodNo}, {reassignModal.className})
            </h2>
            <p className="text-xs text-surface-400">
              Acting as proxy for: <strong className="text-gray-700 dark:text-gray-300">
                {teachers.find(t => t.id === proxyTeacher)?.first_name} {teachers.find(t => t.id === proxyTeacher)?.last_name}
              </strong>
            </p>
            <form onSubmit={submitReassign} className="space-y-3">
              <div>
                <label className="label">Substitute Teacher *</label>
                <select className="input-field" required value={reassignForm.substituteTeacherId}
                  onChange={e => setReassignForm(f => ({...f, substituteTeacherId: e.target.value}))}>
                  <option value="">— Select —</option>
                  {teachers.filter(t => t.id !== proxyTeacher).map(t => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">From *</label>
                  <input type="date" className="input-field" required value={reassignForm.startDate}
                    onChange={e => setReassignForm(f => ({...f, startDate: e.target.value}))} />
                </div>
                <div>
                  <label className="label">Until *</label>
                  <input type="date" className="input-field" required value={reassignForm.endDate}
                    min={reassignForm.startDate}
                    onChange={e => setReassignForm(f => ({...f, endDate: e.target.value}))} />
                </div>
              </div>
              <div>
                <label className="label">Reason</label>
                <input className="input-field" placeholder="e.g. Teacher on leave"
                  value={reassignForm.reason}
                  onChange={e => setReassignForm(f => ({...f, reason: e.target.value}))} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setReassignModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={reassigning} className="btn-primary flex-1">{reassigning ? 'Saving...' : 'Confirm'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
