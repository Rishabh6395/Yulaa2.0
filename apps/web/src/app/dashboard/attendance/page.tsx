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

// ─── Subject keys matching the teacher's SUBJECTS array ────────────────────────

const PARENT_SUBJECTS = [
  { key: 'eng',   label: 'Eng' },
  { key: 'hindi', label: 'Hindi' },
  { key: 'maths', label: 'Maths' },
  { key: 'sc',    label: 'Sci' },
  { key: 'ss',    label: 'SS' },
  { key: 'skt',   label: 'SKT' },
  { key: 'dr',    label: 'DR' },
  { key: 'it',    label: 'IT' },
];

const SUB_STATUS_DISPLAY: Record<string, { bg: string; text: string; label: string }> = {
  present: { bg: 'bg-emerald-100 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400', label: 'P' },
  absent:  { bg: 'bg-red-100 dark:bg-red-950/40',         text: 'text-red-700 dark:text-red-400',         label: 'A' },
  late:    { bg: 'bg-amber-100 dark:bg-amber-950/40',     text: 'text-amber-700 dark:text-amber-400',     label: 'L' },
};

// ─── Parent view: monthly calendar ─────────────────────────────────────────────

function ParentAttendancePage({ studentId, childName }: { studentId: string; childName: string }) {
  const today = new Date();
  const [month,          setMonth]          = useState(today.toISOString().substring(0, 7));
  const [view,           setView]           = useState<'daily' | 'classwise'>('daily');
  const [records,        setRecords]        = useState<any[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [attendanceMode, setAttendanceMode] = useState('class'); // default shows both tabs while loading
  const [holidayMap,     setHolidayMap]     = useState<Record<number, string>>({});
  const [weekoffDays,    setWeekoffDays]    = useState<number[]>([0, 6]);

  // Fetch school's attendance mode config
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch('/api/attendance-config', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const mode = d.attendanceMode ?? 'class';
        setAttendanceMode(mode);
        // If daily mode, lock to daily view
        if (mode === 'daily') setView('daily');
        else setView('classwise');
      })
      .catch((err: unknown) => { if (process.env.NODE_ENV === 'development') console.error('[attendance-config]', err); });
  }, []);

  // Load holidays whenever the month changes
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const [y] = month.split('-').map(Number);
    const academicYear = `${y}-${y + 1}`;
    // Pass studentId so the API derives weekoff days from the class timetable
    fetch(`/api/holidays?year=${academicYear}&studentId=${studentId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        setWeekoffDays(d.weekoffDays ?? [0, 6]);
        const map: Record<number, string> = {};
        (d.holidays ?? []).forEach((h: any) => {
          const hDate = new Date(h.date);
          if (hDate.getUTCFullYear() === Number(month.split('-')[0]) &&
              hDate.getUTCMonth() + 1 === Number(month.split('-')[1])) {
            map[hDate.getUTCDate()] = h.name;
          }
        });
        setHolidayMap(map);
      })
      .catch((err: unknown) => { if (process.env.NODE_ENV === 'development') console.error('[holidays]', err); });
  }, [month, studentId]);

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
  const firstDay    = new Date(year, mon - 1, 1).getDay();
  const daysInMonth = new Date(year, mon, 0).getDate();

  const recordMap: Record<number, any> = {};
  records.forEach(r => { recordMap[new Date(r.date).getUTCDate()] = r; });

  const present = records.filter(r => r.status === 'present').length;
  const absent  = records.filter(r => r.status === 'absent').length;
  const late    = records.filter(r => r.status === 'late').length;
  const total   = records.length;
  const rate    = total > 0 ? Math.round((present / total) * 100) : 0;

  const prevMonth  = () => { const d = new Date(`${month}-01`); d.setMonth(d.getMonth() - 1); setMonth(d.toISOString().substring(0, 7)); };
  const nextMonth  = () => { const d = new Date(`${month}-01`); d.setMonth(d.getMonth() + 1); if (d <= today) setMonth(d.toISOString().substring(0, 7)); };
  const monthLabel = new Date(`${month}-01`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  // Daily mode: show calendar only; class mode: show both Daily + Class-wise tabs
  const showClasswise = attendanceMode === 'class';

  // Legend for daily mode: School In/Out labels
  const dailyLegend = attendanceMode === 'daily'
    ? [{ status: 'present', label: 'School In' }, { status: 'absent', label: 'School Out' }]
    : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">{childName}&apos;s Attendance</h1>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">Monthly attendance record</p>
        </div>
        {/* Only show tab switcher in class mode */}
        {showClasswise && (
          <div className="flex rounded-xl overflow-hidden border border-surface-200 dark:border-gray-700 text-sm font-medium">
            <button onClick={() => setView('daily')}
              className={`px-4 py-2 transition-colors ${view === 'daily' ? 'bg-brand-500 text-white' : 'bg-white dark:bg-gray-800 text-surface-500 hover:bg-surface-50 dark:hover:bg-gray-700'}`}>
              Daily
            </button>
            <button onClick={() => setView('classwise')}
              className={`px-4 py-2 transition-colors ${view === 'classwise' ? 'bg-brand-500 text-white' : 'bg-white dark:bg-gray-800 text-surface-500 hover:bg-surface-50 dark:hover:bg-gray-700'}`}>
              Subject-wise
            </button>
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Attendance Rate', value: `${rate}%`, color: rate >= 75 ? 'text-emerald-600' : 'text-red-600' },
          { label: attendanceMode === 'daily' ? 'School In' : 'Present', value: present, color: 'text-emerald-600' },
          { label: attendanceMode === 'daily' ? 'School Out' : 'Absent',  value: absent,  color: 'text-red-600' },
          { label: 'Late',    value: late,    color: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-display font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Daily calendar view */}
      {(!showClasswise || view === 'daily') && (
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
                  const isWeekoff = weekoffDays.includes(dow);
                  const holiday = holidayMap[day];
                  const rec       = recordMap[day];
                  const isLeave   = rec?.remarks === '__leave__';
                  const cfg       = rec ? (isLeave ? STATUS_CFG.excused : STATUS_CFG[rec.status]) : null;
                  // Label: Leave > daily In/Out > standard full label
                  const cellLabel = isLeave ? 'Leave'
                    : attendanceMode === 'daily'
                    ? (rec?.status === 'present' ? 'In' : rec?.status === 'absent' ? 'Out' : cfg?.full)
                    : cfg?.full;
                  if (isWeekoff) {
                    return (
                      <div key={day} title={holiday || 'Week Off'} className="h-12 rounded-xl flex flex-col items-center justify-center bg-sky-100 dark:bg-sky-900/30 opacity-75">
                        <span className="text-sm font-medium text-sky-600 dark:text-sky-400">{day}</span>
                        <span className="text-[9px] text-sky-500 dark:text-sky-500 font-medium">OFF</span>
                      </div>
                    );
                  }
                  if (holiday) {
                    return (
                      <div key={day} title={holiday} className="h-12 rounded-xl flex flex-col items-center justify-center bg-indigo-100 dark:bg-indigo-900/30">
                        <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{day}</span>
                        <span className="text-[9px] text-indigo-500 font-medium">Hol</span>
                      </div>
                    );
                  }
                  return (
                    <div key={day} className={`h-12 rounded-xl flex flex-col items-center justify-center transition-all ${cfg ? `${cfg.bg} ring-1 ${cfg.ring}` : 'bg-surface-50 dark:bg-gray-800/30'} ${isToday ? 'ring-2 ring-brand-400 dark:ring-brand-500' : ''}`}>
                      <span className={`text-sm font-bold leading-none ${cfg ? cfg.text : 'text-gray-600 dark:text-gray-400'}`}>{day}</span>
                      {cfg && <span className={`text-[10px] font-semibold mt-0.5 ${cfg.text}`}>{cellLabel}</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="px-4 pb-4 pt-1 flex flex-wrap gap-3">
            {dailyLegend ? (
              dailyLegend.map(l => {
                const c = STATUS_CFG[l.status];
                return <span key={l.status} className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${c.bg} ${c.text}`}>{l.label}</span>;
              })
            ) : (
              Object.entries(STATUS_CFG).map(([key, cfg]) => (
                <span key={key} className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.full}</span>
              ))
            )}
            <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400">Week Off</span>
            <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">Holiday</span>
          </div>
        </div>
      )}

      {/* Subject-wise table — only in class mode */}
      {showClasswise && view === 'classwise' && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 dark:border-gray-800">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Subject-wise Attendance</h3>
              <p className="text-xs text-surface-400 mt-0.5">{monthLabel}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="w-8 h-8 rounded-lg hover:bg-surface-100 dark:hover:bg-gray-800 flex items-center justify-center text-surface-400 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15,18 9,12 15,6"/></svg>
              </button>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{monthLabel}</span>
              <button onClick={nextMonth} disabled={month >= today.toISOString().substring(0, 7)} className="w-8 h-8 rounded-lg hover:bg-surface-100 dark:hover:bg-gray-800 flex items-center justify-center text-surface-400 transition-colors disabled:opacity-30">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9,18 15,12 9,6"/></svg>
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table text-xs" style={{ minWidth: '640px' }}>
              <thead>
                <tr>
                  <th className="min-w-[80px]">Date</th>
                  <th>Overall</th>
                  {PARENT_SUBJECTS.map(s => <th key={s.key} className="text-center">{s.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 10 }).map((_, j) => <td key={j}><div className="h-4 bg-surface-100 dark:bg-gray-800 rounded animate-pulse"/></td>)}</tr>
                  ))
                ) : records.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-8 text-surface-400">No attendance records for this month</td></tr>
                ) : records.map(r => {
                  const isLeave    = r.remarks === '__leave__';
                  const overallCfg = isLeave ? STATUS_CFG.excused : STATUS_CFG[r.status];
                  const subData    = (r.subject_attendance ?? {}) as Record<string, string>;
                  return (
                    <tr key={String(r.date)} className={isLeave ? 'bg-blue-50/40 dark:bg-blue-950/10' : ''}>
                      <td className="font-medium text-gray-700 dark:text-gray-300">
                        {new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </td>
                      <td>
                        {isLeave ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400">
                            🗓️ Leave
                          </span>
                        ) : overallCfg ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${overallCfg.bg} ${overallCfg.text}`}>
                            {overallCfg.full}
                          </span>
                        ) : <span className="text-surface-300 dark:text-gray-600">—</span>}
                      </td>
                      {PARENT_SUBJECTS.map(sub => {
                        if (isLeave) return (
                          <td key={sub.key} className="text-center">
                            <span className="inline-block w-6 h-6 rounded text-[10px] font-bold leading-6 text-center bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">L</span>
                          </td>
                        );
                        const subStatus = subData[sub.key];
                        const disp = subStatus ? SUB_STATUS_DISPLAY[subStatus] : null;
                        return (
                          <td key={sub.key} className="text-center">
                            {disp ? (
                              <span className={`inline-block w-6 h-6 rounded text-[10px] font-bold leading-6 text-center ${disp.bg} ${disp.text}`}>
                                {disp.label}
                              </span>
                            ) : <span className="text-surface-200 dark:text-gray-700">·</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Legend */}
          <div className="px-4 pb-3 pt-2 flex flex-wrap gap-3">
            {Object.entries(SUB_STATUS_DISPLAY).map(([key, d]) => (
              <span key={key} className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${d.bg} ${d.text}`}>{d.label} = {key.charAt(0).toUpperCase() + key.slice(1)}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Employee Attendance — Teacher self-service ────────────────────────────────

function fmtTime(dt: any) {
  if (!dt) return '—';
  return new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// ─── GPS status badge for geo-fencing ─────────────────────────────────────────

type GpsStatus = 'idle' | 'checking' | 'within' | 'outside' | 'tagging' | 'unavailable' | 'no_geo';

function GpsBadge({ status, distance, radius }: { status: GpsStatus; distance?: number; radius?: number }) {
  if (status === 'idle' || status === 'no_geo') return null;

  const cfg: Record<GpsStatus, { cls: string; icon: string; text: string }> = {
    checking:    { cls: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400',          icon: '⟳', text: 'Checking location…' },
    within:      { cls: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400', icon: '✓', text: `Within Fence${distance !== undefined ? ` (${Math.round(distance)} m)` : ''}` },
    outside:     { cls: 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400',              icon: '✗', text: `Outside Fence${distance !== undefined ? ` (${Math.round(distance)} m — limit ${radius} m)` : ''}` },
    tagging:     { cls: 'bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400',              icon: '⊕', text: 'Geo Tagging — Punch from anywhere' },
    unavailable: { cls: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400',      icon: '!', text: 'Location unavailable — enable GPS' },
    idle:        { cls: '', icon: '', text: '' },
    no_geo:      { cls: '', icon: '', text: '' },
  };

  const c = cfg[status];
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${c.cls}`}>
      <span className="text-sm leading-none">{c.icon}</span>
      <span>{c.text}</span>
    </div>
  );
}

// Haversine distance in metres (client-side copy for the badge)
function haversineM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6_371_000, r = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(r(lat2-lat1)/2)**2 + Math.cos(r(lat1))*Math.cos(r(lat2))*Math.sin(r(lon2-lon1)/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function EmployeeAttendanceTeacher({ userId, schoolId }: { userId: string; schoolId: string }) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const [month,     setMonth]     = useState(today.toISOString().substring(0, 7));
  const [records,   setRecords]   = useState<any[]>([]);
  const [todayRec,  setTodayRec]  = useState<any>(null);
  const [calLoading, setCalLoading] = useState(true);
  const [punching,  setPunching]  = useState<'in' | 'out' | null>(null);
  const [message,   setMessage]   = useState('');

  // Geo state
  const [geoConfig,  setGeoConfig]  = useState<any>(null);
  const [gpsStatus,  setGpsStatus]  = useState<GpsStatus>('idle');
  const [gpsCoords,  setGpsCoords]  = useState<{ lat: number; lng: number } | null>(null);
  const [gpsDist,    setGpsDist]    = useState<number | undefined>(undefined);

  // Holidays for the calendar
  const [holidayMap,  setHolidayMap]  = useState<Record<number, string>>({});
  const [weekoffDays, setWeekoffDays] = useState<number[]>([0, 6]);

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Load geo config once
  useEffect(() => {
    if (!token) return;
    fetch('/api/attendance-config', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        setGeoConfig(d);
        if (d.geoTaggingEnabled) setGpsStatus('tagging');
        else if (d.geoFencingEnabled) checkLocation(d);
        // else: no_geo — hide badge
        else setGpsStatus('no_geo');
      })
      .catch(() => setGpsStatus('no_geo'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function checkLocation(cfg: any) {
    if (!navigator.geolocation) { setGpsStatus('unavailable'); return; }
    setGpsStatus('checking');
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setGpsCoords({ lat, lng });
        if (cfg.geoFencingEnabled && cfg.latitude != null && cfg.longitude != null) {
          const dist = haversineM(lat, lng, cfg.latitude, cfg.longitude);
          setGpsDist(dist);
          setGpsStatus(dist <= (cfg.geoFenceRadius ?? 500) ? 'within' : 'outside');
        } else {
          setGpsStatus('no_geo');
        }
      },
      () => setGpsStatus('unavailable'),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  // Refresh GPS check when fencing is active
  const refreshGps = () => { if (geoConfig?.geoFencingEnabled) checkLocation(geoConfig); };

  const fetchCalendar = useCallback(async () => {
    setCalLoading(true);
    const res  = await fetch(`/api/attendance?type=employee&teacher_user_id=${userId}&month=${month}&date=${todayStr}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setRecords(data.attendance || []);
    setTodayRec(data.today || null);
    setCalLoading(false);
  }, [userId, month, token, todayStr]);

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  // Load holidays for the current month's academic year
  useEffect(() => {
    if (!token) return;
    const [y] = month.split('-').map(Number);
    const academicYear = `${y}-${y + 1}`;
    fetch(`/api/holidays?year=${academicYear}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        setWeekoffDays(d.weekoffDays ?? [0, 6]);
        const map: Record<number, string> = {};
        (d.holidays ?? []).forEach((h: any) => {
          const hDate = new Date(h.date);
          // Only include holidays in the current month being viewed
          if (hDate.getUTCFullYear() === Number(month.split('-')[0]) &&
              hDate.getUTCMonth() + 1 === Number(month.split('-')[1])) {
            map[hDate.getUTCDate()] = h.name;
          }
        });
        setHolidayMap(map);
      })
      .catch((err: unknown) => { if (process.env.NODE_ENV === 'development') console.error('[holidays]', err); });
  }, [token, month]);

  const handlePunch = async (action: 'punch_in' | 'punch_out') => {
    setPunching(action === 'punch_in' ? 'in' : 'out');
    setMessage('');
    try {
      // Build payload — include coords if geo fencing is active
      const payload: Record<string, unknown> = { type: 'employee', action, user_id: userId };
      if (geoConfig?.geoFencingEnabled) {
        if (!gpsCoords) {
          setMessage('Error: Location required for Geo Fencing. Please enable GPS and try again.');
          setPunching(null);
          return;
        }
        payload.lat = gpsCoords.lat;
        payload.lng = gpsCoords.lng;
      }

      const res  = await fetch('/api/attendance', {
        method: 'POST', headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage(`✓ ${action === 'punch_in' ? 'Punched In' : 'Punched Out'} at ${fmtTime(data.time)}`);
        fetchCalendar();
      } else {
        setMessage(`Error: ${data.error || 'Failed'}`);
      }
    } catch { setMessage('Error: Network error'); }
    setPunching(null);
    setTimeout(() => setMessage(''), 6000);
  };

  const [year, mon] = month.split('-').map(Number);
  const firstDay    = new Date(year, mon - 1, 1).getDay();
  const daysInMonth = new Date(year, mon, 0).getDate();
  const recordMap: Record<number, any> = {};
  records.forEach(r => { recordMap[new Date(r.date).getUTCDate()] = r.status; });

  const prevMonth = () => { const d = new Date(`${month}-01`); d.setMonth(d.getMonth() - 1); setMonth(d.toISOString().substring(0, 7)); };
  const nextMonth = () => { const d = new Date(`${month}-01`); d.setMonth(d.getMonth() + 1); if (d <= today) setMonth(d.toISOString().substring(0, 7)); };
  const monthLabel = new Date(`${month}-01`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const hasPunchIn  = !!todayRec?.punchInTime;
  const hasPunchOut = !!todayRec?.punchOutTime;
  const geoBlocked  = geoConfig?.geoFencingEnabled && gpsStatus === 'outside';

  return (
    <div className="space-y-6">
      {/* Punch In / Out card */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">My Attendance — Today</h3>
            <p className="text-xs text-surface-400 mt-0.5">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          {todayRec && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg capitalize ${STATUS_CFG[todayRec.status]?.bg} ${STATUS_CFG[todayRec.status]?.text}`}>
              {STATUS_CFG[todayRec.status]?.full ?? todayRec.status}
            </span>
          )}
        </div>

        {/* GPS status badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <GpsBadge status={gpsStatus} distance={gpsDist} radius={geoConfig?.geoFenceRadius} />
          {geoConfig?.geoFencingEnabled && gpsStatus !== 'checking' && (
            <button onClick={refreshGps} className="text-xs text-brand-500 hover:underline">
              Refresh location
            </button>
          )}
        </div>

        {geoBlocked && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-400 font-medium">
            You are outside the school geo-fence. Move closer to school to punch in / out.
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* Punch In */}
          <div className="p-4 rounded-xl border-2 border-surface-100 dark:border-gray-700 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-600"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10,17 15,12 10,7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              </div>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Punch In</span>
            </div>
            {hasPunchIn ? (
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{fmtTime(todayRec.punchInTime)}</p>
            ) : (
              <button onClick={() => handlePunch('punch_in')} disabled={punching !== null || geoBlocked}
                className="w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors disabled:opacity-60"
                title={geoBlocked ? 'Outside geo-fence — move closer to school' : ''}>
                {punching === 'in' ? 'Saving…' : 'Punch In'}
              </button>
            )}
          </div>

          {/* Punch Out */}
          <div className="p-4 rounded-xl border-2 border-surface-100 dark:border-gray-700 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-red-600"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </div>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Punch Out</span>
            </div>
            {hasPunchOut ? (
              <p className="text-lg font-bold text-red-600 dark:text-red-400">{fmtTime(todayRec.punchOutTime)}</p>
            ) : (
              <button onClick={() => handlePunch('punch_out')} disabled={punching !== null || !hasPunchIn || geoBlocked}
                className="w-full py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-60"
                title={!hasPunchIn ? 'Punch In first' : geoBlocked ? 'Outside geo-fence' : ''}>
                {punching === 'out' ? 'Saving…' : 'Punch Out'}
              </button>
            )}
          </div>
        </div>

        {message && (
          <p className={`text-sm font-medium ${message.startsWith('Error') ? 'text-red-600' : 'text-emerald-600'}`}>
            {message}
          </p>
        )}
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
                const isWeekoff = weekoffDays.includes(dow);
                const holiday  = holidayMap[day];
                const st       = recordMap[day];
                const cfg      = st ? STATUS_CFG[st] : null;

                if (isWeekoff) {
                  return (
                    <div key={day} title={holiday || 'Week Off'} className="h-12 rounded-xl flex flex-col items-center justify-center bg-sky-100 dark:bg-sky-900/30 opacity-70">
                      <span className="text-sm font-medium text-sky-600 dark:text-sky-400">{day}</span>
                      <span className="text-[9px] text-sky-500 dark:text-sky-500 font-medium">OFF</span>
                    </div>
                  );
                }
                if (holiday) {
                  return (
                    <div key={day} title={holiday} className="h-12 rounded-xl flex flex-col items-center justify-center bg-indigo-100 dark:bg-indigo-900/30">
                      <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{day}</span>
                      <span className="text-[9px] text-indigo-500 font-medium truncate w-full text-center px-1">Hol</span>
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
        {/* Calendar legend */}
        <div className="px-4 pb-4 pt-1 flex flex-wrap gap-2">
          {Object.entries(STATUS_CFG).map(([key, c]) => (
            <span key={key} className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>{c.full}</span>
          ))}
          <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400">Week Off</span>
          <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">Holiday</span>
        </div>
      </div>
    </div>
  );
}

// ─── Employee Attendance — Admin view ─────────────────────────────────────────

function EmployeeAttendanceAdmin() {
  const today = new Date();
  const [viewMode,    setViewMode]    = useState<'daily' | 'report'>('daily');
  const [date,        setDate]        = useState(today.toISOString().split('T')[0]);
  const [month,       setMonth]       = useState(today.toISOString().substring(0, 7));
  const [teachers,    setTeachers]    = useState<any[]>([]);
  const [report,      setReport]      = useState<any[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [message,     setMessage]     = useState('');
  const [weekoffDays, setWeekoffDays] = useState<number[]>([0, 6]);

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Load weekoff days from leave config whenever the viewed month changes
  useEffect(() => {
    if (!token) return;
    const [y] = month.split('-').map(Number);
    const academicYear = `${y}-${y + 1}`;
    fetch(`/api/holidays?year=${academicYear}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setWeekoffDays(d.weekoffDays ?? [0, 6]))
      .catch((err: unknown) => { if (process.env.NODE_ENV === 'development') console.error('[weekoffs]', err); });
  }, [token, month]);

  const fetchDaily = useCallback(async () => {
    setLoading(true);
    const res  = await fetch(`/api/attendance?type=employee&date=${date}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setTeachers((data.teachers || []).map((t: any) => ({ ...t, pendingStatus: t.status || 'present' })));
    setLoading(false);
  }, [date, token]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    const res  = await fetch(`/api/attendance?type=employee&month=${month}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setReport(data.report || []);
    setLoading(false);
  }, [month, token]);

  useEffect(() => { if (viewMode === 'daily') fetchDaily(); else fetchReport(); }, [viewMode, fetchDaily, fetchReport]);

  const updateStatus = (teacherId: string, status: string) => {
    setTeachers(prev => prev.map(t => t.teacher_id === teacherId ? { ...t, pendingStatus: status } : t));
  };

  const saveAll = async () => {
    setSaving(true); setMessage('');
    const records = teachers.map(t => ({ teacher_id: t.teacher_id, status: t.pendingStatus }));
    const res = await fetch('/api/attendance', {
      method: 'POST', headers,
      body: JSON.stringify({ type: 'employee', records, date }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) { setMessage('✓ Saved!'); setTimeout(() => setMessage(''), 3000); fetchDaily(); }
    else setMessage(`Error: ${body.error || 'Save failed'}`);
    setSaving(false);
  };

  // Report: build date columns for selected month
  const [reportYear, reportMon] = month.split('-').map(Number);
  const daysInMonth = new Date(reportYear, reportMon, 0).getDate();
  const dateCols = Array.from({ length: daysInMonth }, (_, i) => {
    const d   = i + 1;
    const str = `${month}-${String(d).padStart(2, '0')}`;
    const dow = new Date(str + 'T00:00:00').getDay();
    return { day: d, str, isWeekend: weekoffDays.includes(dow) };
  });

  return (
    <div className="space-y-4">
      {/* View mode tabs */}
      <div className="flex gap-1 p-1 bg-surface-100 dark:bg-gray-800 rounded-xl w-fit">
        {(['daily', 'report'] as const).map(m => (
          <button key={m} onClick={() => setViewMode(m)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${viewMode === m ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-surface-400 hover:text-gray-700'}`}>
            {m === 'daily' ? 'Daily Mark' : 'Monthly Report'}
          </button>
        ))}
      </div>

      {viewMode === 'daily' ? (
        <>
          <div className="card p-4 flex flex-wrap gap-4 items-end">
            <div>
              <label className="label">Date</label>
              <input type="date" className="input-field" value={date} onChange={e => setDate(e.target.value)} max={today.toISOString().split('T')[0]} />
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table text-sm">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Emp ID</th>
                    <th>Punch In</th>
                    <th>Punch Out</th>
                    <th>Mark Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>{[1,2,3,4,5].map(j => <td key={j}><div className="h-4 bg-surface-100 dark:bg-gray-700 rounded animate-pulse"/></td>)}</tr>
                    ))
                  ) : teachers.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-8 text-surface-400">No active employees found.</td></tr>
                  ) : teachers.map(t => (
                    <tr key={t.teacher_id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center text-[10px] font-bold text-violet-600 shrink-0">
                            {t.first_name?.[0]}{t.last_name?.[0]}
                          </div>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{t.first_name} {t.last_name}</span>
                        </div>
                      </td>
                      <td className="font-mono text-surface-400 text-xs">{t.employee_id || '—'}</td>
                      <td className={`font-mono text-xs font-semibold ${t.punch_in_time ? 'text-emerald-600' : 'text-surface-300'}`}>
                        {fmtTime(t.punch_in_time)}
                      </td>
                      <td className={`font-mono text-xs font-semibold ${t.punch_out_time ? 'text-red-500' : 'text-surface-300'}`}>
                        {fmtTime(t.punch_out_time)}
                      </td>
                      <td>
                        <div className="flex gap-1">
                          {['present', 'absent', 'late', 'half_day'].map(s => {
                            const cfg = STATUS_CFG[s];
                            return (
                              <button key={s} onClick={() => updateStatus(t.teacher_id, s)}
                                className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${t.pendingStatus === s ? `${cfg.bg} ${cfg.text} ring-1 ${cfg.ring}` : 'bg-surface-50 dark:bg-gray-800 text-surface-400 hover:bg-surface-100'}`}>
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
                {message && <span className={`text-sm font-medium ${message.startsWith('Error') ? 'text-red-600' : 'text-emerald-600'}`}>{message}</span>}
                <button onClick={saveAll} disabled={saving} className="btn-primary ml-auto">
                  {saving ? 'Saving…' : 'Save Attendance'}
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="card p-4 flex items-end gap-4">
            <div>
              <label className="label">Month</label>
              <input type="month" className="input-field" value={month} onChange={e => setMonth(e.target.value)}
                max={today.toISOString().substring(0, 7)} />
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table text-xs" style={{ minWidth: `${200 + daysInMonth * 52}px` }}>
                <thead>
                  <tr>
                    <th className="min-w-[160px] sticky left-0 bg-surface-50 dark:bg-gray-800 z-10">Employee</th>
                    {dateCols.map(({ day, isWeekend }) => (
                      <th key={day} className={`w-12 text-center ${isWeekend ? 'text-surface-300 dark:text-gray-600' : ''}`}>{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        <td className="sticky left-0 bg-white dark:bg-gray-900"><div className="h-4 bg-surface-100 dark:bg-gray-700 rounded animate-pulse w-32"/></td>
                        {dateCols.map(({ day }) => <td key={day}><div className="h-4 bg-surface-100 dark:bg-gray-700 rounded animate-pulse"/></td>)}
                      </tr>
                    ))
                  ) : report.length === 0 ? (
                    <tr><td colSpan={daysInMonth + 1} className="text-center py-8 text-surface-400">No employees found.</td></tr>
                  ) : report.map(t => {
                    const dayMap: Record<string, any> = {};
                    t.records.forEach((r: any) => { dayMap[new Date(r.date).toISOString().split('T')[0]] = r; });
                    const presentDays = t.records.filter((r: any) => r.status === 'present').length;
                    const totalWork = dateCols.filter(d => !d.isWeekend).length;
                    return (
                      <tr key={t.teacher_id}>
                        <td className="sticky left-0 bg-white dark:bg-gray-900 border-r border-surface-100 dark:border-gray-700">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{t.first_name} {t.last_name}</p>
                            <p className="text-[10px] text-surface-400">{presentDays}/{totalWork} days present</p>
                          </div>
                        </td>
                        {dateCols.map(({ day, str, isWeekend }) => {
                          const rec = dayMap[str];
                          const cfg = rec ? STATUS_CFG[rec.status] : null;
                          return (
                            <td key={day} className={`text-center p-1 ${isWeekend ? 'bg-surface-50/50 dark:bg-gray-800/30' : ''}`}>
                              {isWeekend ? (
                                <span className="text-[9px] text-surface-300">—</span>
                              ) : cfg ? (
                                <div className="group relative flex flex-col items-center">
                                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
                                    {cfg.label}
                                  </span>
                                  {(rec.punch_in_time || rec.punch_out_time) && (
                                    <div className="hidden group-hover:block absolute top-full left-1/2 -translate-x-1/2 z-20 bg-gray-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap mt-1 shadow-lg">
                                      {rec.punch_in_time && <div>In: {fmtTime(rec.punch_in_time)}</div>}
                                      {rec.punch_out_time && <div>Out: {fmtTime(rec.punch_out_time)}</div>}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] text-surface-200 dark:text-gray-700">·</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Student Attendance — Teacher / Admin ──────────────────────────────────────

const STUDENT_STATUSES = ['present', 'absent', 'late', 'half_day', 'excused'] as const;
// Daily roll-call mode: only School In (present) and School Out (absent)
const DAILY_STATUSES   = ['present', 'absent'] as const;
const DAILY_LABELS: Record<string, string> = { present: 'School In', absent: 'School Out' };

// Subject-wise columns — populated dynamically from stream master; fallback to legacy keys
const FALLBACK_SUBJECTS = [
  { key: 'eng',   label: 'Eng' },
  { key: 'hindi', label: 'Hindi' },
  { key: 'maths', label: 'Maths' },
  { key: 'sc',    label: 'Sci' },
  { key: 'ss',    label: 'SS' },
  { key: 'skt',   label: 'SKT' },
  { key: 'dr',    label: 'DR' },
  { key: 'it',    label: 'IT' },
];
const SUB_STATUSES = ['P', 'A', 'L'] as const;
const SUB_STATUS_MAP: Record<string, { bg: string; text: string }> = {
  P: { bg: 'bg-emerald-100 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400' },
  A: { bg: 'bg-red-100 dark:bg-red-950/40',         text: 'text-red-700 dark:text-red-400' },
  L: { bg: 'bg-amber-100 dark:bg-amber-950/40',     text: 'text-amber-700 dark:text-amber-400' },
};
const FULL_STATUS: Record<string, string> = { P: 'present', A: 'absent', L: 'late' };

function StudentAttendancePage({ userId, attendanceMode }: { userId: string; attendanceMode: string }) {
  const [date,        setDate]        = useState(new Date().toISOString().split('T')[0]);
  const [classes,     setClasses]     = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students,    setStudents]    = useState<any[]>([]);
  const [subjects,    setSubjects]    = useState<{ key: string; label: string }[]>(FALLBACK_SUBJECTS);
  const [loading,     setLoading]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [message,     setMessage]     = useState('');
  const [saveError,   setSaveError]   = useState('');
  const [weekoffDays, setWeekoffDays] = useState<number[]>([0, 6]);

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Load weekoff days from leave config — re-fetch when the selected date crosses an academic year
  useEffect(() => {
    if (!token) return;
    const y = new Date(date).getFullYear();
    const academicYear = `${y}-${y + 1}`;
    fetch(`/api/holidays?year=${academicYear}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setWeekoffDays(d.weekoffDays ?? [0, 6]))
      .catch((err: unknown) => { if (process.env.NODE_ENV === 'development') console.error('[weekoffs]', err); });
  }, [token, date.substring(0, 4)]);

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

  // Fetch subjects from stream master when class changes
  useEffect(() => {
    if (!selectedClass) { setSubjects(FALLBACK_SUBJECTS); return; }
    fetch(`/api/masters/streams?classId=${selectedClass}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const masters: any[] = d.streamMasters || [];
        if (masters.length > 0) {
          setSubjects(masters.map(m => ({ key: m.name.toLowerCase().replace(/\s+/g, '_'), label: m.name })));
        } else {
          setSubjects(FALLBACK_SUBJECTS);
        }
      })
      .catch(() => setSubjects(FALLBACK_SUBJECTS));
  }, [selectedClass, token]);

  const fetchClassAttendance = useCallback(async () => {
    if (!selectedClass) return;
    setLoading(true);
    const res = await fetch(`/api/attendance?class_id=${selectedClass}&date=${date}`, {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
    });
    const data = await res.json();
    setStudents((data.students || []).map((s: any) => {
      const isLeaveLocked = s.remarks === '__leave__';
      const subjectKeys = subjects.length > 0 ? subjects : FALLBACK_SUBJECTS;
      return {
        ...s,
        isLeaveLocked,
        schoolStatus:  isLeaveLocked ? 'excused' : (s.status || 'present'),
        subjectStatus: s.subject_attendance
          ? Object.fromEntries(Object.entries(s.subject_attendance as Record<string, string>).map(([k, v]) => [k, v === 'present' ? 'P' : v === 'absent' ? 'A' : v === 'late' ? 'L' : v]))
          : Object.fromEntries(subjectKeys.map(sub => [sub.key, 'P'])),
      };
    }));
    setLoading(false);
  }, [selectedClass, date, token]);

  useEffect(() => { fetchClassAttendance(); }, [fetchClassAttendance]);

  const updateStatus = (studentId: string, status: string) => {
    setStudents(prev => prev.map(s => s.student_id === studentId ? { ...s, schoolStatus: status } : s));
  };

  const updateSubjectStatus = (studentId: string, subKey: string, val: string) => {
    setStudents(prev => prev.map(s =>
      s.student_id === studentId
        ? { ...s, subjectStatus: { ...s.subjectStatus, [subKey]: val } }
        : s
    ));
  };

  const markAll = (status: string) => setStudents(prev => prev.map(s => s.isLeaveLocked ? s : { ...s, schoolStatus: status }));
  const markAllSubject = (subKey: string, val: string) => {
    setStudents(prev => prev.map(s => s.isLeaveLocked ? s : { ...s, subjectStatus: { ...s.subjectStatus, [subKey]: val } }));
  };

  const selectedDayOfWeek = new Date(date + 'T00:00:00').getDay();
  const isWeekend = weekoffDays.includes(selectedDayOfWeek);

  const saveAttendance = async () => {
    if (isWeekend) { setSaveError('Cannot mark attendance on a weekoff day.'); return; }
    setSaving(true); setMessage(''); setSaveError('');
    try {
      const records = students.filter(s => s.schoolStatus && !s.isLeaveLocked).map(s => {
        const base: any = {
          student_id: s.student_id,
          status:     s.schoolStatus || 'present',
          remarks:    s.remarks || undefined,
        };
        if (attendanceMode === 'class' && s.subjectStatus) {
          base.subject_attendance = Object.fromEntries(
            Object.entries(s.subjectStatus as Record<string, string>).map(([k, v]) => [k, FULL_STATUS[v] ?? 'present'])
          );
        }
        return base;
      });
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
            <input className="input-field bg-surface-50 cursor-not-allowed" readOnly value={selectedCls ? selectedCls.section : ''} placeholder="Auto-filled" />
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
              <button onClick={() => markAll('present')} className="text-xs bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-100 font-medium transition-colors">All Present</button>
              <button onClick={() => markAll('absent')}  className="text-xs bg-red-50 dark:bg-red-950/30 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-100 font-medium transition-colors">All Absent</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table text-xs" style={attendanceMode === 'class' ? { minWidth: '760px' } : undefined}>
              <thead>
                <tr>
                  <th className="min-w-[150px]">Student Name</th>
                  <th>Roll No.</th>
                  {attendanceMode === 'daily' ? (
                    <th>School In / Out</th>
                  ) : (
                    <>
                      <th className="min-w-[140px]">Overall</th>
                      {subjects.map(sub => (
                        <th key={sub.key} className="text-center min-w-[52px] p-1">
                          <div className="text-[11px] font-semibold mb-0.5">{sub.label}</div>
                          <div className="flex gap-0.5 justify-center">
                            {SUB_STATUSES.map(v => (
                              <button key={v} onClick={() => markAllSubject(sub.key, v)}
                                title={`All ${sub.label}: ${v}`}
                                className={`w-5 h-4 rounded text-[8px] font-bold transition-colors ${SUB_STATUS_MAP[v].bg} ${SUB_STATUS_MAP[v].text} opacity-70 hover:opacity-100`}>
                                {v}
                              </button>
                            ))}
                          </div>
                        </th>
                      ))}
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: attendanceMode === 'class' ? subjects.length + 2 : 3 }).map((_, j) => <td key={j}><div className="h-5 bg-surface-100 dark:bg-gray-700 rounded animate-pulse"/></td>)}</tr>
                  ))
                ) : students.length === 0 ? (
                  <tr><td colSpan={attendanceMode === 'class' ? subjects.length + 2 : 3} className="text-center py-8 text-surface-400">No students in this class</td></tr>
                ) : students.map(s => {
                  const cur = s.schoolStatus || 'present';
                  const cfg = STATUS_CFG[cur];
                  return (
                    <tr key={s.student_id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${cfg.bg} ${cfg.text}`}>
                            {s.first_name?.[0]}{s.last_name?.[0]}
                          </div>
                          <span className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[120px]">{s.first_name} {s.last_name}</span>
                        </div>
                      </td>
                      <td className="font-mono text-surface-400">{s.admission_no || '—'}</td>

                      {/* ── Leave-locked row ──────────────────────────────── */}
                      {s.isLeaveLocked ? (
                        attendanceMode === 'daily' ? (
                          <td>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                              Leave Approved
                            </span>
                          </td>
                        ) : (
                          <>
                            <td>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400">
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                Leave
                              </span>
                            </td>
                            {subjects.map(sub => (
                              <td key={sub.key} className="text-center p-1">
                                <span className="inline-block w-6 h-6 rounded text-[10px] font-bold leading-6 text-center bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 opacity-70">A</span>
                              </td>
                            ))}
                          </>
                        )
                      ) : attendanceMode === 'daily' ? (
                        /* ── Daily roll-call ──────────────────────────────── */
                        <td>
                          <div className="flex gap-2">
                            {DAILY_STATUSES.map(st => {
                              const c = STATUS_CFG[st];
                              return (
                                <button key={st} onClick={() => updateStatus(s.student_id, st)}
                                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all border-2 ${
                                    cur === st
                                      ? `${c.bg} ${c.text} border-current ring-2 ${c.ring}`
                                      : 'bg-surface-50 dark:bg-gray-800 text-surface-400 dark:text-gray-500 border-transparent hover:border-surface-200'
                                  }`}>
                                  {DAILY_LABELS[st]}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      ) : (
                        /* ── Class-wise subject columns ───────────────────── */
                        <>
                          <td>
                            <div className="flex gap-1">
                              {STUDENT_STATUSES.map(st => {
                                const c = STATUS_CFG[st];
                                return (
                                  <button key={st} onClick={() => updateStatus(s.student_id, st)}
                                    title={c.full}
                                    className={`w-7 h-7 rounded-lg font-bold text-[10px] transition-all border-2 ${
                                      cur === st
                                        ? `${c.bg} ${c.text} border-current ring-2 ${c.ring}`
                                        : 'bg-surface-50 dark:bg-gray-800 text-surface-300 dark:text-gray-600 border-transparent hover:border-surface-200'
                                    }`}>
                                    {c.label}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          {subjects.map(sub => {
                            const val = (s.subjectStatus as Record<string, string>)?.[sub.key] ?? 'P';
                            return (
                              <td key={sub.key} className="text-center p-1">
                                <div className="flex gap-0.5 justify-center">
                                  {SUB_STATUSES.map(v => (
                                    <button key={v} onClick={() => updateSubjectStatus(s.student_id, sub.key, v)}
                                      className={`w-6 h-6 rounded text-[10px] font-bold transition-all ${
                                        val === v
                                          ? `${SUB_STATUS_MAP[v].bg} ${SUB_STATUS_MAP[v].text} ring-1 ring-current`
                                          : 'bg-surface-50 dark:bg-gray-800 text-surface-300 dark:text-gray-600 hover:bg-surface-100'
                                      }`}>
                                      {v}
                                    </button>
                                  ))}
                                </div>
                              </td>
                            );
                          })}
                        </>
                      )}
                    </tr>
                  );
                })}
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
  const [role, setRole]                   = useState<string | null>(null);
  const [userId, setUserId]               = useState('');
  const [schoolId, setSchoolId]           = useState('');
  const [activeChild, setActiveChild]     = useState<any>(null);
  const [tab, setTab]                     = useState<'student' | 'employee' | 'self'>('student');
  const [attendanceMode, setAttendanceMode] = useState('class');

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

  // Fetch school attendance mode config
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch('/api/attendance-config', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.attendanceMode) setAttendanceMode(d.attendanceMode); })
      .catch((err: unknown) => { if (process.env.NODE_ENV === 'development') console.error('[attendance-config]', err); });
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

  // Teacher / Admin: tab view
  const isAdmin         = ['school_admin', 'super_admin', 'principal', 'hod'].includes(role);
  const hasSelfAttendance = ['school_admin', 'principal', 'hod'].includes(role);

  const tabLabel: Record<string, string> = {
    student:  'Mark and track student attendance',
    employee: 'Track all employee attendance',
    self:     'Your personal attendance — punch in & out',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Attendance</h1>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">{tabLabel[tab]}</p>
        </div>
        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-surface-100 dark:bg-gray-800 rounded-xl">
          <button onClick={() => setTab('student')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === 'student' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-surface-400 hover:text-gray-700'}`}>
            Student
          </button>
          <button onClick={() => setTab('employee')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === 'employee' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-surface-400 hover:text-gray-700'}`}>
            Employee
          </button>
          {hasSelfAttendance && (
            <button onClick={() => setTab('self')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === 'self' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-surface-400 hover:text-gray-700'}`}>
              My Attendance
            </button>
          )}
        </div>
      </div>

      {tab === 'student'  && <StudentAttendancePage userId={userId} attendanceMode={attendanceMode} />}
      {tab === 'employee' && (isAdmin ? <EmployeeAttendanceAdmin /> : <EmployeeAttendanceTeacher userId={userId} schoolId={schoolId} />)}
      {tab === 'self'     && <EmployeeAttendanceTeacher userId={userId} schoolId={schoolId} />}
    </div>
  );
}
