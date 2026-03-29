'use client';

import { useEffect, useState } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ClassItem { id: string; name: string; grade: string; section: string; }
interface Teacher { id: string; user: { firstName: string; lastName: string } | null; }
interface Period { no: number; startTime: string; endTime: string; }
interface SlotData { subject: string; teacherId: string; }

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

const ACADEMIC_YEARS = ['2024-2025', '2025-2026', '2026-2027'];

function slotKey(day: number, period: number) { return `${day}_${period}`; }
function initGrid(periods: Period[], activeDays: number[]): Record<string, SlotData> {
  const g: Record<string, SlotData> = {};
  activeDays.forEach(d => periods.forEach(p => { g[slotKey(d, p.no)] = { subject: '', teacherId: '' }; }));
  return g;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function TimetablePage({ params }: { params: { id: string } }) {
  const schoolId = params.id;

  const [academicYear, setAcademicYear]     = useState('2025-2026');
  const [classes, setClasses]               = useState<ClassItem[]>([]);
  const [teachers, setTeachers]             = useState<Teacher[]>([]);
  const [selectedClass, setSelectedClass]   = useState('');
  const [activeDays, setActiveDays]         = useState<number[]>([1, 2, 3, 4, 5]);
  const [periods, setPeriods]               = useState<Period[]>(DEFAULT_PERIODS);
  const [grid, setGrid]                     = useState<Record<string, SlotData>>({});
  const [loadingTT, setLoadingTT]           = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [saved, setSaved]                   = useState(false);
  const [error, setError]                   = useState('');
  const [view, setView]                     = useState<'grid' | 'periods'>('grid');
  const [newPeriod, setNewPeriod]           = useState({ startTime: '', endTime: '' });

  const token = () => typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
  const headers = (json = true) => ({
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    Authorization: `Bearer ${token()}`,
  });

  // Load classes + teachers
  useEffect(() => {
    const h = headers(false);
    Promise.all([
      fetch(`/api/super-admin/schools/${schoolId}/classes`, { headers: h }).then(r => r.json()),
      fetch(`/api/super-admin/schools/${schoolId}/teachers`, { headers: h }).then(r => r.json()),
    ]).then(([cd, td]) => {
      setClasses(cd.classes || []);
      setTeachers(td.teachers || []);
    }).catch(() => {});
  }, [schoolId]);

  // Load timetable when class/year changes
  useEffect(() => {
    if (!selectedClass) return;
    setLoadingTT(true);
    fetch(`/api/super-admin/schools/${schoolId}/timetable?classId=${selectedClass}&year=${academicYear}`, { headers: headers(false) })
      .then(r => r.json())
      .then(d => {
        if (d.timetable && d.timetable.slots?.length) {
          // Derive periods from existing slots (unique periods)
          const periodMap: Record<number, Period> = {};
          d.timetable.slots.forEach((s: any) => {
            periodMap[s.periodNo] = { no: s.periodNo, startTime: s.startTime, endTime: s.endTime };
          });
          const derivedPeriods = Object.values(periodMap).sort((a, b) => a.no - b.no);
          if (derivedPeriods.length) setPeriods(derivedPeriods);

          const derivedDays: number[] = [...new Set<number>(d.timetable.slots.map((s: any) => s.dayOfWeek as number))];
          if (derivedDays.length) setActiveDays(derivedDays.sort((a, b) => a - b));

          const newGrid: Record<string, SlotData> = {};
          d.timetable.slots.forEach((s: any) => {
            newGrid[slotKey(s.dayOfWeek, s.periodNo)] = {
              subject: s.subject,
              teacherId: s.teacherId || '',
            };
          });
          setGrid(newGrid);
        } else {
          setGrid(initGrid(periods, activeDays));
        }
      })
      .catch(() => setGrid(initGrid(periods, activeDays)))
      .finally(() => setLoadingTT(false));
  }, [selectedClass, academicYear]);

  function updateSlot(day: number, period: number, field: keyof SlotData, val: string) {
    const k = slotKey(day, period);
    setGrid(g => ({ ...g, [k]: { ...g[k], [field]: val } }));
  }

  function toggleDay(d: number) {
    setActiveDays(days => {
      if (days.includes(d)) {
        if (days.length === 1) return days;
        return days.filter(x => x !== d);
      }
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
          slots.push({
            dayOfWeek: day,
            periodNo: period.no,
            startTime: period.startTime,
            endTime: period.endTime,
            subject: data.subject.trim(),
            teacherId: data.teacherId || null,
          });
        }
      }
      await fetch(`/api/super-admin/schools/${schoolId}/timetable`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ classId: selectedClass, academicYear, slots }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { setError('Failed to save timetable'); }
    finally { setSaving(false); }
  }

  const selectedClassData = classes.find(c => c.id === selectedClass);
  const filledSlots = Object.values(grid).filter(s => s.subject?.trim()).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Timetable Builder</h1>
          <p className="text-sm text-surface-400 mt-0.5">Assign subject-wise teachers per class and section. Each class/section has its own independent timetable.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView('periods')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${view === 'periods' ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30 text-brand-700' : 'border-surface-200 dark:border-gray-700 text-surface-400'}`}>
            Configure Periods
          </button>
          <button onClick={() => setView('grid')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${view === 'grid' ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30 text-brand-700' : 'border-surface-200 dark:border-gray-700 text-surface-400'}`}>
            Timetable Grid
          </button>
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

      {/* Controls row */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-surface-400 uppercase tracking-wide">Academic Year</label>
          <select className="input w-36" value={academicYear} onChange={e => setAcademicYear(e.target.value)}>
            {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
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

      {!selectedClass && (
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
                            <input
                              className="w-full text-xs bg-transparent border-0 outline-none text-gray-800 dark:text-gray-200 placeholder-surface-300 dark:placeholder-gray-600 font-medium"
                              placeholder="Subject..."
                              value={slot.subject}
                              onChange={e => updateSlot(day, period.no, 'subject', e.target.value)}
                            />
                            <select
                              className="w-full text-[11px] bg-white dark:bg-gray-800 border border-surface-200 dark:border-gray-600 rounded-lg px-1.5 py-1 text-gray-600 dark:text-gray-400 focus:outline-none focus:border-brand-400"
                              value={slot.teacherId}
                              onChange={e => updateSlot(day, period.no, 'teacherId', e.target.value)}
                            >
                              <option value="">— Teacher —</option>
                              {teachers.filter(t => t.user).map(t => (
                                <option key={t.id} value={t.id}>{t.user?.firstName} {t.user?.lastName}</option>
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
            <button onClick={saveTimetable} disabled={saving || !selectedClass}
              className="btn btn-primary flex items-center gap-2">
              {saving
                ? <><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Saving...</>
                : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20,6 9,17 4,12"/></svg>Save Timetable</>
              }
            </button>
            {saved && (
              <span className="text-sm text-emerald-600 font-medium flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20,6 9,17 4,12"/></svg>
                Saved & synced!
              </span>
            )}
            <span className="text-xs text-surface-400">Each class/section has its own independent timetable.</span>
          </div>
        </div>
      )}
    </div>
  );
}
