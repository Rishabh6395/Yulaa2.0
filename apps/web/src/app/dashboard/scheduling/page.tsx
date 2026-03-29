'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApi } from '@/hooks/useApi';

const DAYS        = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_INDICES = [1, 2, 3, 4, 5, 6]; // 1=Mon … 6=Sat
const PERIODS     = [1, 2, 3, 4, 5, 6, 7];

const SUBJECTS = [
  'English', 'Hindi', 'Mathematics', 'Science', 'Social Studies',
  'Sanskrit', 'Drawing', 'Computer/IT', 'Physical Education',
  'EVS', 'General Knowledge', 'Moral Science', 'Music', 'Other',
];

type SlotKey  = `${number}_${number}`; // `dayOfWeek_periodNo`
type SlotData = { subject: string; teacherId: string };

export default function SchedulingPage() {
  const [selectedClass, setSelectedClass] = useState('');
  const [slots,         setSlots]         = useState<Record<SlotKey, SlotData>>({});
  const [saving,        setSaving]        = useState(false);
  const [saved,         setSaved]         = useState(false);
  const [loading,       setLoading]       = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const { data: classData }   = useApi<{ classes:  any[] }>('/api/classes');
  const { data: teacherData } = useApi<{ teachers: any[] }>('/api/teachers');

  const classes  = classData?.classes  || [];
  const teachers = teacherData?.teachers || [];

  const slotKey = (day: number, period: number): SlotKey => `${day}_${period}`;

  const loadSchedule = useCallback(async (classId: string) => {
    setLoading(true);
    setSlots({});
    try {
      const res  = await fetch(`/api/schedule?classId=${classId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const map: Record<SlotKey, SlotData> = {};
      for (const s of data.slots || []) {
        map[slotKey(s.dayOfWeek, s.periodNo)] = {
          subject:   s.subject   || '',
          teacherId: s.teacherId || '',
        };
      }
      setSlots(map);
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    if (selectedClass) loadSchedule(selectedClass);
  }, [selectedClass, loadSchedule]);

  const updateSlot = (day: number, period: number, field: keyof SlotData, value: string) => {
    const key = slotKey(day, period);
    setSlots(prev => ({
      ...prev,
      [key]: { subject: '', teacherId: '', ...prev[key], [field]: value },
    }));
  };

  const handleSave = async () => {
    if (!selectedClass) return;
    setSaving(true);
    setSaved(false);

    const slotsArray = Object.entries(slots)
      .filter(([, v]) => v.subject || v.teacherId)
      .map(([key, v]) => {
        const [day, period] = key.split('_').map(Number);
        return { dayOfWeek: day, periodNo: period, subject: v.subject, teacherId: v.teacherId || null };
      });

    const res = await fetch('/api/schedule', {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ classId: selectedClass, slots: slotsArray }),
    });

    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const selectedCls = classes.find(c => c.id === selectedClass);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Scheduling</h1>
        <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">Manage weekly timetable — assign subjects and teachers per period</p>
      </div>

      <div className="card p-4">
        <div className="max-w-xs">
          <label className="label">Select Class</label>
          <select className="input-field" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
            <option value="">Select class</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.grade} - {c.section}</option>
            ))}
          </select>
        </div>
      </div>

      {!selectedClass ? (
        <div className="card p-12 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-400">
              <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
          </div>
          <p className="text-gray-900 dark:text-gray-100 font-semibold">Select a class to view its timetable</p>
          <p className="text-sm text-surface-400">Choose a class above to manage the weekly schedule.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-surface-100 dark:border-gray-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Weekly Timetable</h3>
              <p className="text-xs text-surface-400 mt-0.5">{selectedCls?.grade} - {selectedCls?.section}</p>
            </div>
            {loading && <span className="text-xs text-surface-400 animate-pulse">Loading…</span>}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-xs border-collapse">
              <thead>
                <tr className="bg-surface-50 dark:bg-gray-800/60">
                  <th className="text-left px-4 py-3 text-surface-400 font-semibold uppercase tracking-wider w-24 border-b border-surface-100 dark:border-gray-700">Period</th>
                  {DAYS.map(d => (
                    <th key={d} className="text-left px-3 py-3 text-surface-400 font-semibold uppercase tracking-wider border-b border-surface-100 dark:border-gray-700">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map((period, pIdx) => {
                  const isLunchAfter = period === 4;
                  return (
                    <>
                      <tr key={period} className="border-b border-surface-50 dark:border-gray-800 hover:bg-surface-50/50 dark:hover:bg-gray-800/30">
                        <td className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          Period {period}
                        </td>
                        {DAY_INDICES.map(day => {
                          const key   = slotKey(day, period);
                          const slot  = slots[key] || { subject: '', teacherId: '' };
                          return (
                            <td key={day} className="px-2 py-2 align-top min-w-[160px]">
                              <div className="flex flex-col gap-1">
                                <select
                                  className="w-full text-xs border border-surface-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-400"
                                  value={slot.subject}
                                  onChange={e => updateSlot(day, period, 'subject', e.target.value)}
                                >
                                  <option value="">— Subject —</option>
                                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <select
                                  className="w-full text-xs border border-surface-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-400"
                                  value={slot.teacherId}
                                  onChange={e => updateSlot(day, period, 'teacherId', e.target.value)}
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
                      {isLunchAfter && (
                        <tr key="lunch" className="bg-amber-50/50 dark:bg-amber-950/10">
                          <td className="px-4 py-2 text-amber-600 dark:text-amber-400 font-semibold text-xs">Lunch Break</td>
                          {DAY_INDICES.map(d => <td key={d} className="px-2 py-2 text-center text-surface-300 dark:text-gray-600">—</td>)}
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-surface-100 dark:border-gray-800 flex items-center justify-between">
            {saved && (
              <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>
                Timetable saved
              </span>
            )}
            {!saved && <span/>}
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
              {saving ? 'Saving…' : 'Save Timetable'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
