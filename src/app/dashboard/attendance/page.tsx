'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; bg: string; text: string; ring: string; full: string }> = {
  present:  { label: 'P', bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-300', full: 'Present' },
  absent:   { label: 'A', bg: 'bg-red-100',     text: 'text-red-700',     ring: 'ring-red-300',     full: 'Absent' },
  late:     { label: 'L', bg: 'bg-amber-100',   text: 'text-amber-700',   ring: 'ring-amber-300',   full: 'Late' },
  half_day: { label: 'H', bg: 'bg-orange-100',  text: 'text-orange-700',  ring: 'ring-orange-300',  full: 'Half Day' },
  excused:  { label: 'E', bg: 'bg-blue-100',    text: 'text-blue-700',    ring: 'ring-blue-300',    full: 'Excused' },
};

// ─── Parent view: monthly calendar ─────────────────────────────────────────────

function ParentAttendancePage({ studentId, childName }: { studentId: string; childName: string }) {
  const today = new Date();
  const [month, setMonth] = useState(today.toISOString().substring(0, 7));
  const [view, setView] = useState<'daily' | 'classwise'>('daily');
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/attendance?student_id=${studentId}&month=${month}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setRecords(data.attendance || []);
    setLoading(false);
  }, [studentId, month]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  const [year, mon] = month.split('-').map(Number);
  const firstDay = new Date(year, mon - 1, 1).getDay();
  const daysInMonth = new Date(year, mon, 0).getDate();

  const recordMap: Record<number, string> = {};
  records.forEach(r => { recordMap[new Date(r.date).getUTCDate()] = r.status; });

  const present = records.filter(r => r.status === 'present').length;
  const absent  = records.filter(r => r.status === 'absent').length;
  const late    = records.filter(r => r.status === 'late').length;
  const total   = records.length;
  const rate    = total > 0 ? Math.round((present / total) * 100) : 0;

  const prevMonth = () => { const d = new Date(`${month}-01`); d.setMonth(d.getMonth() - 1); setMonth(d.toISOString().substring(0, 7)); };
  const nextMonth = () => { const d = new Date(`${month}-01`); d.setMonth(d.getMonth() + 1); if (d <= today) setMonth(d.toISOString().substring(0, 7)); };
  const monthLabel = new Date(`${month}-01`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">{childName}&apos;s Attendance</h1>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">Monthly attendance record</p>
        </div>
        <div className="flex rounded-xl overflow-hidden border border-surface-200 text-sm font-medium">
          <button onClick={() => setView('daily')} className={`px-4 py-2 transition-colors ${view === 'daily' ? 'bg-brand-500 text-white' : 'bg-white text-surface-500 hover:bg-surface-50'}`}>Daily</button>
          <button onClick={() => setView('classwise')} className={`px-4 py-2 transition-colors ${view === 'classwise' ? 'bg-brand-500 text-white' : 'bg-white text-surface-500 hover:bg-surface-50'}`}>Class-wise</button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Attendance Rate', value: `${rate}%`, color: rate >= 75 ? 'text-emerald-600' : 'text-red-600' },
          { label: 'Present', value: present, color: 'text-emerald-600' },
          { label: 'Absent',  value: absent,  color: 'text-red-600' },
          { label: 'Late',    value: late,    color: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-display font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {view === 'daily' ? (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 dark:border-gray-800">
            <button onClick={prevMonth} className="w-8 h-8 rounded-lg hover:bg-surface-100 dark:hover:bg-gray-800 flex items-center justify-center text-surface-400 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15,18 9,12 15,6"/></svg>
            </button>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{monthLabel}</h3>
            <button onClick={nextMonth} disabled={month >= today.toISOString().substring(0, 7)} className="w-8 h-8 rounded-lg hover:bg-surface-100 dark:hover:bg-gray-800 flex items-center justify-center text-surface-400 transition-colors disabled:opacity-30">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9,18 15,12 9,6"/></svg>
            </button>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-7 mb-1">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <div key={d} className="text-center text-[11px] font-semibold text-surface-400 dark:text-gray-500 py-2">{d}</div>
              ))}
            </div>
            {loading ? (
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-xl bg-surface-100 dark:bg-gray-800 animate-pulse"/>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} className="h-12"/>)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day     = i + 1;
                  const dateStr = `${year}-${String(mon).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                  const isToday = dateStr === today.toISOString().split('T')[0];
                  const dow     = new Date(dateStr + 'T00:00:00').getDay();
                  const weekend = dow === 0 || dow === 6;
                  const status  = recordMap[day];
                  const cfg     = status ? STATUS_CFG[status] : null;
                  if (weekend) {
                    return (
                      <div key={day} className="h-12 rounded-xl flex flex-col items-center justify-center bg-surface-50 dark:bg-gray-800/40 opacity-40">
                        <span className="text-sm font-medium text-surface-400 dark:text-gray-600">{day}</span>
                        <span className="text-[9px] text-surface-300 dark:text-gray-600 font-medium">OFF</span>
                      </div>
                    );
                  }
                  return (
                    <div key={day} className={`h-12 rounded-xl flex flex-col items-center justify-center transition-all ${cfg ? `${cfg.bg} ${cfg.ring && `ring-1 ${cfg.ring}`}` : 'bg-surface-50 dark:bg-gray-800/30'} ${isToday ? 'ring-2 ring-brand-400 dark:ring-brand-500' : ''}`}>
                      <span className={`text-sm font-bold leading-none ${cfg ? cfg.text : 'text-gray-600 dark:text-gray-400'}`}>{day}</span>
                      {cfg && <span className={`text-[10px] font-semibold mt-0.5 ${cfg.text}`}>{cfg.full}</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="px-4 pb-4 pt-1 flex flex-wrap gap-3">
            {Object.entries(STATUS_CFG).map(([key, cfg]) => (
              <span key={key} className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.full}</span>
            ))}
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-surface-100 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Class-wise Attendance</h3>
            <p className="text-xs text-surface-400 mt-0.5">Subject-wise attendance for {monthLabel}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table text-xs">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>School In</th>
                  <th>Eng</th><th>Hindi</th><th>SC</th><th>SS</th><th>SKT</th><th>DR</th><th>IT</th><th>OT</th>
                  <th>School Out</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 11 }).map((_, j) => <td key={j}><div className="h-3 bg-surface-100 rounded animate-pulse w-10"/></td>)}</tr>
                  ))
                ) : records.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-8 text-surface-400">No attendance records</td></tr>
                ) : records.map(r => {
                  const cfg = STATUS_CFG[r.status];
                  return (
                    <tr key={r.date}>
                      <td>{new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                      <td>{r.punch_in || '—'}</td>
                      {['eng','hindi','sc','ss','skt','dr','it','ot'].map(sub => (
                        <td key={sub}>
                          {r.subjects?.[sub] ? (
                            <span className={`inline-block w-5 h-5 rounded text-center text-[9px] font-bold leading-5 ${STATUS_CFG[r.subjects[sub]]?.bg} ${STATUS_CFG[r.subjects[sub]]?.text}`}>
                              {STATUS_CFG[r.subjects[sub]]?.label}
                            </span>
                          ) : <span className="text-surface-300">—</span>}
                        </td>
                      ))}
                      <td>{r.punch_out || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Employee Attendance — Teacher self-service ────────────────────────────────

function EmployeeAttendanceTeacher({ userId, schoolId }: { userId: string; schoolId: string }) {
  const today = new Date();
  const [date, setDate]     = useState(today.toISOString().split('T')[0]);
  const [status, setStatus] = useState('present');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [month, setMonth]   = useState(today.toISOString().substring(0, 7));
  const [records, setRecords] = useState<any[]>([]);
  const [calLoading, setCalLoading] = useState(true);
  const [teacherId, setTeacherId]   = useState<string | null>(null);

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchCalendar = useCallback(async () => {
    setCalLoading(true);
    const res  = await fetch(`/api/attendance?type=employee&teacher_user_id=${userId}&month=${month}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setRecords(data.attendance || []);
    if (data.teacher_id && !teacherId) setTeacherId(data.teacher_id);
    setCalLoading(false);
  }, [userId, month, token]);

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  const saveAttendance = async () => {
    setSaving(true); setMessage('');
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST', headers,
        body: JSON.stringify({
          type: 'employee',
          records: [{ user_id: userId, status }],
          date,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage('✓ Attendance saved!');
        fetchCalendar();
      } else {
        setMessage(`Error: ${body.error || 'Failed to save attendance'}`);
      }
    } catch {
      setMessage('Error: Network error. Please try again.');
    }
    setSaving(false);
    setTimeout(() => setMessage(''), 4000);
  };

  const [year, mon] = month.split('-').map(Number);
  const firstDay    = new Date(year, mon - 1, 1).getDay();
  const daysInMonth = new Date(year, mon, 0).getDate();
  const recordMap: Record<number, string> = {};
  records.forEach(r => { recordMap[new Date(r.date).getUTCDate()] = r.status; });

  const prevMonth = () => { const d = new Date(`${month}-01`); d.setMonth(d.getMonth() - 1); setMonth(d.toISOString().substring(0, 7)); };
  const nextMonth = () => { const d = new Date(`${month}-01`); d.setMonth(d.getMonth() + 1); if (d <= today) setMonth(d.toISOString().substring(0, 7)); };
  const monthLabel = new Date(`${month}-01`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Mark Today's Attendance */}
      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Mark My Attendance</h3>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="label">Date</label>
            <input type="date" className="input-field bg-surface-50 cursor-not-allowed" value={date} readOnly
              min={today.toISOString().split('T')[0]} max={today.toISOString().split('T')[0]} />
          </div>
          <div>
            <label className="label">Status</label>
            <div className="flex gap-2">
              {['present', 'absent', 'late', 'half_day'].map(s => {
                const cfg = STATUS_CFG[s];
                return (
                  <button key={s} type="button"
                    onClick={() => setStatus(s)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${status === s ? `${cfg.bg} ${cfg.text} ring-2 ${cfg.ring}` : 'bg-surface-50 dark:bg-gray-800 text-surface-400 hover:bg-surface-100'}`}
                  >
                    {cfg.full}
                  </button>
                );
              })}
            </div>
          </div>
          <button onClick={saveAttendance} disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save'}
          </button>
          {message && (
            <span className={`text-sm font-medium ${message.startsWith('Error') ? 'text-red-600' : 'text-emerald-600'}`}>
              {message}
            </span>
          )}
        </div>
      </div>

      {/* Monthly calendar */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 dark:border-gray-800">
          <button onClick={prevMonth} className="w-8 h-8 rounded-lg hover:bg-surface-100 dark:hover:bg-gray-800 flex items-center justify-center text-surface-400 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15,18 9,12 15,6"/></svg>
          </button>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{monthLabel}</h3>
          <button onClick={nextMonth} disabled={month >= today.toISOString().substring(0, 7)} className="w-8 h-8 rounded-lg hover:bg-surface-100 dark:hover:bg-gray-800 flex items-center justify-center text-surface-400 transition-colors disabled:opacity-30">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9,18 15,12 9,6"/></svg>
          </button>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-7 mb-1">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} className="text-center text-[11px] font-semibold text-surface-400 py-2">{d}</div>
            ))}
          </div>
          {calLoading ? (
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, i) => <div key={i} className="h-12 rounded-xl bg-surface-100 animate-pulse"/>)}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} className="h-12"/>)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day      = i + 1;
                const dateStr  = `${year}-${String(mon).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                const isToday  = dateStr === today.toISOString().split('T')[0];
                const dow      = new Date(dateStr + 'T00:00:00').getDay();
                const weekend  = dow === 0 || dow === 6;
                const st       = recordMap[day];
                const cfg      = st ? STATUS_CFG[st] : null;
                if (weekend) {
                  return (
                    <div key={day} className="h-12 rounded-xl flex flex-col items-center justify-center bg-surface-50 dark:bg-gray-800/40 opacity-40">
                      <span className="text-sm font-medium text-surface-400">{day}</span>
                      <span className="text-[9px] text-surface-300 font-medium">OFF</span>
                    </div>
                  );
                }
                return (
                  <div key={day} className={`h-12 rounded-xl flex flex-col items-center justify-center ${cfg ? `${cfg.bg} ring-1 ${cfg.ring}` : 'bg-surface-50 dark:bg-gray-800/30'} ${isToday ? 'ring-2 ring-brand-400' : ''}`}>
                    <span className={`text-sm font-bold leading-none ${cfg ? cfg.text : 'text-gray-600 dark:text-gray-400'}`}>{day}</span>
                    {cfg && <span className={`text-[10px] font-semibold mt-0.5 ${cfg.text}`}>{cfg.label}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Employee Attendance — Admin view ─────────────────────────────────────────

function EmployeeAttendanceAdmin() {
  const today = new Date();
  const [date, setDate]       = useState(today.toISOString().split('T')[0]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [message, setMessage]   = useState('');

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    const res  = await fetch(`/api/attendance?type=employee&date=${date}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setTeachers((data.teachers || []).map((t: any) => ({ ...t, pendingStatus: t.status || 'present' })));
    setLoading(false);
  }, [date, token]);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  const updateStatus = (teacherId: string, status: string) => {
    setTeachers(prev => prev.map(t => t.teacher_id === teacherId ? { ...t, pendingStatus: status } : t));
  };

  const markAll = (status: string) => setTeachers(prev => prev.map(t => ({ ...t, pendingStatus: status })));

  const saveAll = async () => {
    setSaving(true); setMessage('');
    const records = teachers.map(t => ({ teacher_id: t.teacher_id, status: t.pendingStatus }));
    const res = await fetch('/api/attendance', {
      method: 'POST', headers,
      body: JSON.stringify({ type: 'employee', records, date }),
    });
    if (res.ok) { setMessage('Saved!'); setTimeout(() => setMessage(''), 3000); fetchTeachers(); }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="label">Date</label>
          <input type="date" className="input-field" value={date} onChange={e => setDate(e.target.value)} max={today.toISOString().split('T')[0]} />
        </div>
        <div className="flex gap-2 ml-auto">
          <button onClick={() => markAll('present')} className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-100 font-medium">All Present</button>
          <button onClick={() => markAll('absent')}  className="text-xs bg-red-50 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-100 font-medium">All Absent</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Employee ID</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{[1,2,3].map(j => <td key={j}><div className="h-4 bg-surface-100 rounded animate-pulse w-24"/></td>)}</tr>
                ))
              ) : teachers.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-8 text-surface-400">No active teachers found.</td></tr>
              ) : teachers.map(t => (
                <tr key={t.teacher_id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center text-[10px] font-bold text-violet-700 dark:text-violet-400">
                        {t.first_name?.[0]}{t.last_name?.[0]}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">{t.first_name} {t.last_name}</span>
                    </div>
                  </td>
                  <td className="text-sm text-surface-400 font-mono">{t.employee_id || '—'}</td>
                  <td>
                    <div className="flex gap-1">
                      {['present', 'absent', 'late', 'half_day'].map(s => {
                        const cfg = STATUS_CFG[s];
                        return (
                          <button key={s} onClick={() => updateStatus(t.teacher_id, s)}
                            className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${t.pendingStatus === s ? `${cfg.bg} ${cfg.text} ring-1 ${cfg.ring}` : 'bg-surface-50 dark:bg-gray-800 text-surface-400 hover:bg-surface-100'}`}
                          >
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {teachers.length > 0 && (
          <div className="p-4 border-t border-surface-100 dark:border-gray-800 flex items-center gap-4">
            {message && <span className="text-sm text-emerald-600 font-medium">{message}</span>}
            <button onClick={saveAll} disabled={saving} className="btn-primary ml-auto">
              {saving ? 'Saving…' : 'Save Attendance'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Student Attendance — Teacher / Admin ──────────────────────────────────────

const SUBJECTS     = ['Eng', 'Hindi', 'SC', 'SS', 'SKT', 'DR', 'IT', 'OT'];
const SUBJECT_KEYS = ['eng', 'hindi', 'sc', 'ss', 'skt', 'dr', 'it', 'ot'];

function StudentAttendancePage({ userId }: { userId: string }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetch('/api/classes', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const list = d.classes || [];
        setClasses(list);
        if (userId) {
          const myClass = list.find((c: any) => c.class_teacher_user_id === userId);
          if (myClass) setSelectedClass(myClass.id);
        }
      });
  }, [token, userId]);

  const fetchClassAttendance = useCallback(async () => {
    if (!selectedClass) return;
    setLoading(true);
    const res = await fetch(`/api/attendance?class_id=${selectedClass}&date=${date}`, {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
    });
    const data = await res.json();
    setStudents((data.students || []).map((s: any) => ({
      ...s,
      schoolStatus: s.status || 'present',
      punchIn:  s.punch_in  || '',
      punchOut: s.punch_out || '',
      subjects: s.subjects  || {},
    })));
    setLoading(false);
  }, [selectedClass, date, token]);

  useEffect(() => { fetchClassAttendance(); }, [fetchClassAttendance]);

  const updateStudent = (studentId: string, field: string, value: string) => {
    setStudents(prev => prev.map(s => s.student_id === studentId ? { ...s, [field]: value } : s));
  };

  const updateSubject = (studentId: string, subKey: string, value: string) => {
    setStudents(prev => prev.map(s => {
      if (s.student_id !== studentId) return s;
      return { ...s, subjects: { ...s.subjects, [subKey]: value } };
    }));
  };

  const markAll = (status: string) => setStudents(prev => prev.map(s => ({ ...s, schoolStatus: status })));

  const selectedDayOfWeek = new Date(date + 'T00:00:00').getDay();
  const isWeekend = selectedDayOfWeek === 0 || selectedDayOfWeek === 6;

  const saveAttendance = async () => {
    if (isWeekend) { setSaveError('Cannot mark attendance on weekends.'); return; }
    setSaving(true); setMessage(''); setSaveError('');
    try {
      const records = students.filter(s => s.schoolStatus).map(s => ({
        student_id: s.student_id,
        status:     s.schoolStatus || 'present',
        remarks:    s.remarks || undefined,
      }));
      const res  = await fetch('/api/attendance', {
        method: 'POST', headers,
        body: JSON.stringify({ records, date, class_id: selectedClass }),
      });
      const body = await res.json();
      if (res.ok) { setMessage('Attendance saved successfully!'); fetchClassAttendance(); }
      else { setSaveError(body.error || 'Failed to save attendance.'); }
    } catch { setSaveError('Network error. Please try again.'); }
    setSaving(false);
    setTimeout(() => setMessage(''), 4000);
  };

  const selectedCls = classes.find(c => c.id === selectedClass);

  const cyclePunch = (studentId: string, field: 'punchIn' | 'punchOut') => {
    const punchInTimes  = ['09:00', '09:15', '09:30', ''];
    const punchOutTimes = ['16:00', '15:45', '15:30', ''];
    const times = field === 'punchIn' ? punchInTimes : punchOutTimes;
    setStudents(prev => prev.map(s => {
      if (s.student_id !== studentId) return s;
      const cur = s[field] || '';
      const idx = times.indexOf(cur);
      return { ...s, [field]: times[(idx + 1) % times.length] };
    }));
  };

  return (
    <div className="space-y-6">
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Class</label>
            <select className="input-field" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
              <option value="">Select class</option>
              {[...new Set(classes.map(c => c.grade))].map(grade => (
                <optgroup key={grade} label={`Grade ${grade}`}>
                  {classes.filter(c => c.grade === grade).map(c => (
                    <option key={c.id} value={c.id}>{c.grade} - {c.section}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Section</label>
            <input className="input-field bg-surface-50" readOnly value={selectedCls ? selectedCls.section : ''} placeholder="Auto-filled" />
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input-field" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>
      </div>

      {selectedClass && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-surface-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{selectedCls?.grade} - {selectedCls?.section} &middot; {date}</h3>
              <p className="text-xs text-surface-400 mt-0.5">{students.length} students</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => markAll('present')} className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-100 font-medium transition-colors">All Present</button>
              <button onClick={() => markAll('absent')}  className="text-xs bg-red-50 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-100 font-medium transition-colors">All Absent</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table text-xs min-w-[900px]">
              <thead>
                <tr>
                  <th className="min-w-[140px]">Student Name</th>
                  <th>Roll No.</th>
                  <th>School In</th>
                  {SUBJECTS.map(s => <th key={s}>{s}</th>)}
                  <th>School Out</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 12 }).map((_, j) => <td key={j}><div className="h-4 bg-surface-100 rounded animate-pulse"/></td>)}</tr>
                  ))
                ) : students.length === 0 ? (
                  <tr><td colSpan={12} className="text-center py-8 text-surface-400">No students in this class</td></tr>
                ) : students.map(s => (
                  <tr key={s.student_id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-950 flex items-center justify-center text-[9px] font-bold text-brand-600 dark:text-brand-400 flex-shrink-0">
                          {s.first_name?.[0]}{s.last_name?.[0]}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[100px]">{s.first_name} {s.last_name}</span>
                      </div>
                    </td>
                    <td className="font-mono">{s.admission_no || '—'}</td>
                    <td>
                      <button onClick={() => cyclePunch(s.student_id, 'punchIn')}
                        className={`px-2 py-1 rounded-lg border font-mono transition-colors ${s.punchIn ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-surface-50 border-surface-200 text-surface-400'}`}>
                        {s.punchIn || '—'}
                      </button>
                    </td>
                    {SUBJECT_KEYS.map(subKey => {
                      const val = s.subjects?.[subKey] || '';
                      const cfg = val ? STATUS_CFG[val] : null;
                      return (
                        <td key={subKey}>
                          <button onClick={() => { const cycle = ['present', 'absent', '']; const next = cycle[(cycle.indexOf(val) + 1) % cycle.length]; updateSubject(s.student_id, subKey, next); }}
                            className={`w-7 h-7 rounded-lg border font-bold text-[9px] transition-colors ${cfg ? `${cfg.bg} ${cfg.text} border-transparent` : 'bg-surface-50 border-surface-200 text-surface-300'}`}>
                            {cfg ? cfg.label : '—'}
                          </button>
                        </td>
                      );
                    })}
                    <td>
                      <button onClick={() => cyclePunch(s.student_id, 'punchOut')}
                        className={`px-2 py-1 rounded-lg border font-mono transition-colors ${s.punchOut ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-surface-50 border-surface-200 text-surface-400'}`}>
                        {s.punchOut || '—'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isWeekend && (
            <div className="mx-4 my-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Weekend — attendance cannot be marked on Saturday or Sunday.
            </div>
          )}

          {students.length > 0 && (
            <div className="p-4 border-t border-surface-100 dark:border-gray-800 flex items-center justify-between gap-3 flex-wrap">
              <div>
                {message   && <span className="text-sm text-emerald-600 font-medium">{message}</span>}
                {saveError && <span className="text-sm text-red-600 font-medium">{saveError}</span>}
              </div>
              <button onClick={saveAttendance} disabled={saving || isWeekend} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed ml-auto">
                {saving ? 'Saving…' : 'Save Attendance'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page: role-aware ──────────────────────────────────────────────────────

export default function AttendancePage() {
  const [role, setRole]         = useState<string | null>(null);
  const [userId, setUserId]     = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [activeChild, setActiveChild] = useState<any>(null);
  const [tab, setTab]           = useState<'student' | 'employee'>('student');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setRole(user.primaryRole);
        setUserId(user.id || '');
        setSchoolId(user.schoolId || '');
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

  if (role === null) return null;

  // Parent: show child's attendance
  if (role === 'parent') {
    if (!activeChild) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-3">
          <p className="text-gray-900 dark:text-gray-100 font-semibold">No child selected</p>
          <p className="text-sm text-surface-400">Select a child from the top bar to view attendance.</p>
        </div>
      );
    }
    return <ParentAttendancePage studentId={activeChild.id} childName={`${activeChild.first_name} ${activeChild.last_name}`} />;
  }

  // Teacher / Admin: two-tab view
  const isAdmin = ['school_admin', 'super_admin', 'principal', 'hod'].includes(role);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Attendance</h1>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">
            {tab === 'student' ? 'Mark and track student attendance' : 'Track employee attendance'}
          </p>
        </div>
        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-surface-100 dark:bg-gray-800 rounded-xl">
          <button onClick={() => setTab('student')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === 'student' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-surface-400 hover:text-gray-700'}`}>
            Student Attendance
          </button>
          <button onClick={() => setTab('employee')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === 'employee' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-surface-400 hover:text-gray-700'}`}>
            Employee Attendance
          </button>
        </div>
      </div>

      {tab === 'student'  && <StudentAttendancePage userId={userId} />}
      {tab === 'employee' && (
        isAdmin
          ? <EmployeeAttendanceAdmin />
          : <EmployeeAttendanceTeacher userId={userId} schoolId={schoolId} />
      )}
    </div>
  );
}
