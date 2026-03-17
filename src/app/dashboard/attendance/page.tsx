'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Parent view: monthly calendar ───────────────────────────────────────────

const statusConfig: Record<string, { label: string; bg: string; text: string; ring: string; full: string }> = {
  present:  { label: 'P', bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-300', full: 'Present' },
  absent:   { label: 'A', bg: 'bg-red-100',     text: 'text-red-700',     ring: 'ring-red-300',     full: 'Absent' },
  late:     { label: 'L', bg: 'bg-amber-100',   text: 'text-amber-700',   ring: 'ring-amber-300',   full: 'Late' },
  half_day: { label: 'H', bg: 'bg-orange-100',  text: 'text-orange-700',  ring: 'ring-orange-300',  full: 'Half Day' },
  excused:  { label: 'E', bg: 'bg-blue-100',    text: 'text-blue-700',    ring: 'ring-blue-300',    full: 'Excused' },
};

function ParentAttendancePage({ studentId, childName }: { studentId: string; childName: string }) {
  const today = new Date();
  const [month, setMonth] = useState(today.toISOString().substring(0, 7));
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

  // Build calendar grid
  const [year, mon] = month.split('-').map(Number);
  const firstDay = new Date(year, mon - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, mon, 0).getDate();

  const recordMap: Record<number, string> = {};
  records.forEach(r => {
    const day = new Date(r.date).getUTCDate();
    recordMap[day] = r.status;
  });

  const present = records.filter(r => r.status === 'present').length;
  const absent  = records.filter(r => r.status === 'absent').length;
  const late    = records.filter(r => r.status === 'late').length;
  const total   = records.length;
  const rate    = total > 0 ? Math.round((present / total) * 100) : 0;

  const prevMonth = () => {
    const d = new Date(`${month}-01`);
    d.setMonth(d.getMonth() - 1);
    setMonth(d.toISOString().substring(0, 7));
  };
  const nextMonth = () => {
    const d = new Date(`${month}-01`);
    d.setMonth(d.getMonth() + 1);
    if (d <= today) setMonth(d.toISOString().substring(0, 7));
  };

  const monthLabel = new Date(`${month}-01`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">{childName}&apos;s Attendance</h1>
        <p className="text-sm text-surface-400 mt-0.5">Monthly attendance record</p>
      </div>

      {/* Summary */}
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

      {/* Calendar */}
      <div className="card p-6">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-surface-100 text-surface-400 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15,18 9,12 15,6"/></svg>
          </button>
          <h3 className="text-sm font-semibold text-gray-900">{monthLabel}</h3>
          <button
            onClick={nextMonth}
            disabled={month >= today.toISOString().substring(0, 7)}
            className="p-2 rounded-lg hover:bg-surface-100 text-surface-400 transition-colors disabled:opacity-30"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9,18 15,12 9,6"/></svg>
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-surface-400 py-1">{d}</div>
          ))}
        </div>

        {/* Calendar cells */}
        {loading ? (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl bg-surface-100 animate-pulse"/>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`}/>)}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(mon).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const isToday = dateStr === today.toISOString().split('T')[0];
              const status = recordMap[day];
              const cfg = status ? statusConfig[status] : null;

              return (
                <div
                  key={day}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 relative
                    ${cfg ? `${cfg.bg} ring-1 ${cfg.ring}` : 'bg-surface-50'}
                    ${isToday ? 'ring-2 ring-brand-400' : ''}
                  `}
                >
                  <span className={`text-xs font-semibold ${cfg ? cfg.text : 'text-surface-400'}`}>{day}</span>
                  {cfg && <span className={`text-[9px] font-bold ${cfg.text}`}>{cfg.label}</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-surface-100">
          {Object.entries(statusConfig).map(([key, cfg]) => (
            <span key={key} className="flex items-center gap-1.5 text-xs text-surface-500">
              <span className={`w-5 h-5 rounded-md ${cfg.bg} ${cfg.text} flex items-center justify-center text-[9px] font-bold`}>{cfg.label}</span>
              {cfg.full}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Admin / Teacher view ─────────────────────────────────────────────────────

function AdminAttendancePage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [overview, setOverview] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadResult, setUploadResult] = useState<{ saved: number; skipped: number; errors: string[] } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [refreshKey] = useState(0);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // ── Bulk CSV helpers ──────────────────────────────────────────────────────

  const downloadCSV = (action: 'template' | 'export') => {
    const url = `/api/attendance/bulk?action=${action}&class_id=${selectedClass}&date=${date}`;
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', '');
    // Attach auth header by fetching and creating an object URL
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        a.href = URL.createObjectURL(blob);
        a.download = action === 'template' ? `attendance-template-${date}.csv` : `attendance-${date}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    const form = new FormData();
    form.append('file', file);
    form.append('class_id', selectedClass);
    const res = await fetch('/api/attendance/bulk', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json();
    setUploadResult(data);
    setUploading(false);
    e.target.value = '';

    if (data.saved > 0) {
      // Fetch fresh data directly — avoids any stale-closure / effect-scheduler issues
      const [classRes, overviewRes] = await Promise.all([
        fetch(`/api/attendance?class_id=${selectedClass}&date=${date}`, {
          headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
        }),
        fetch(`/api/attendance?date=${date}`, {
          headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
        }),
      ]);
      const [classData, overviewData] = await Promise.all([classRes.json(), overviewRes.json()]);
      setStudents((classData.students || []).map((s: any) => ({ ...s, status: s.status || 'present' })));
      setOverview(overviewData.classes || []);
    }
  };

  useEffect(() => {
    fetch('/api/classes', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setClasses(d.classes || []));
  }, [token]);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/attendance?date=${date}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const data = await res.json();
    setOverview(data.classes || []);
    setLoading(false);
  }, [date, token]);

  useEffect(() => { fetchOverview(); }, [fetchOverview, refreshKey]);

  const fetchClassAttendance = useCallback(async () => {
    if (!selectedClass) return;
    const res = await fetch(`/api/attendance?class_id=${selectedClass}&date=${date}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const data = await res.json();
    setStudents((data.students || []).map((s: any) => ({ ...s, status: s.status || 'present' })));
  }, [selectedClass, date, token]);

  useEffect(() => { fetchClassAttendance(); }, [fetchClassAttendance, refreshKey]);

  const markAll = (status: string) => setStudents(prev => prev.map(s => ({ ...s, status })));

  const toggleStatus = (studentId: string) => {
    setStudents(prev => prev.map(s => {
      if (s.student_id !== studentId) return s;
      const cycle = ['present', 'absent', 'late'];
      return { ...s, status: cycle[(cycle.indexOf(s.status) + 1) % cycle.length] };
    }));
  };

  const saveAttendance = async () => {
    setSaving(true);
    setMessage('');
    const records = students.map(s => ({ student_id: s.student_id, status: s.status }));
    const res = await fetch('/api/attendance', {
      method: 'POST', headers,
      body: JSON.stringify({ records, date, class_id: selectedClass }),
    });
    if (res.ok) { setMessage('Attendance saved successfully!'); fetchOverview(); }
    setSaving(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const statusColors: Record<string, string> = {
    present: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    absent:  'bg-red-100 text-red-700 border-red-200',
    late:    'bg-amber-100 text-amber-700 border-amber-200',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Attendance</h1>
          <p className="text-sm text-surface-400 mt-0.5">Mark and view daily attendance</p>
        </div>
        <input type="date" className="input-field max-w-[180px]" value={date} onChange={e => setDate(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="card p-4 h-24 animate-pulse bg-surface-100"/>)
        ) : overview.map((cls) => {
          const total   = parseInt(cls.total)   || 0;
          const present = parseInt(cls.present) || 0;
          const rate    = total > 0 ? Math.round((present / total) * 100) : 0;
          return (
            <button key={cls.class_id} onClick={() => setSelectedClass(cls.class_id)}
              className={`card p-4 text-left transition-all hover:shadow-card-hover ${selectedClass === cls.class_id ? 'ring-2 ring-brand-400' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-display font-semibold text-gray-900">{cls.grade} - {cls.section}</span>
                <span className={`text-lg font-bold ${rate >= 80 ? 'text-emerald-600' : rate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{rate}%</span>
              </div>
              <div className="flex gap-3 text-xs text-surface-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"/>P: {cls.present}</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400"/>A: {cls.absent}</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"/>L: {cls.late}</span>
              </div>
            </button>
          );
        })}
      </div>

      {selectedClass && (
        <div className="card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Mark Attendance</h3>
              <p className="text-xs text-surface-400 mt-0.5">
                {classes.find(c => c.id === selectedClass)?.grade} - {classes.find(c => c.id === selectedClass)?.section} · {date}
              </p>
            </div>

            {/* Action buttons row */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Manual quick-mark */}
              <button onClick={() => markAll('present')} className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-100 font-medium transition-colors">All Present</button>
              <button onClick={() => markAll('absent')}  className="text-xs bg-red-50    text-red-700    px-3 py-1.5 rounded-lg hover:bg-red-100    font-medium transition-colors">All Absent</button>

              {/* Divider */}
              <span className="w-px h-5 bg-surface-200 hidden sm:block"/>

              {/* CSV actions */}
              <button
                onClick={() => downloadCSV('template')}
                title="Download blank CSV with student list"
                className="text-xs flex items-center gap-1.5 bg-surface-50 border border-surface-200 text-surface-600 px-3 py-1.5 rounded-lg hover:bg-surface-100 font-medium transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Template
              </button>

              <button
                onClick={() => downloadCSV('export')}
                title="Export current attendance as CSV"
                className="text-xs flex items-center gap-1.5 bg-surface-50 border border-surface-200 text-surface-600 px-3 py-1.5 rounded-lg hover:bg-surface-100 font-medium transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Export
              </button>

              {/* Upload */}
              <label className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer
                ${uploading ? 'bg-surface-100 text-surface-400 border-surface-200' : 'bg-brand-50 border-brand-200 text-brand-700 hover:bg-brand-100'}`}>
                {uploading ? (
                  <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Uploading…</>
                ) : (
                  <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>Upload CSV</>
                )}
                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={uploading} />
              </label>
            </div>
          </div>

          {/* Upload result banner */}
          {uploadResult && (
            <div className={`mb-4 p-3 rounded-xl text-xs ${uploadResult.errors.length > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200'}`}>
              <p className={`font-semibold ${uploadResult.saved === 0 ? 'text-red-700' : uploadResult.errors.length > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {uploadResult.saved === 0
                  ? `Nothing saved — ${uploadResult.skipped} row${uploadResult.skipped !== 1 ? 's' : ''} failed validation`
                  : `${uploadResult.saved} records saved${uploadResult.skipped > 0 ? `, ${uploadResult.skipped} skipped` : ''}`}
              </p>
              {uploadResult.errors.length > 0 && (
                <ul className="mt-1.5 space-y-0.5 text-amber-600 max-h-24 overflow-y-auto">
                  {uploadResult.errors.map((e, i) => <li key={i}>• {e}</li>)}
                </ul>
              )}
              <button onClick={() => setUploadResult(null)} className="mt-1.5 text-surface-400 hover:text-surface-600 underline">dismiss</button>
            </div>
          )}
          {students.length === 0 ? (
            <p className="text-sm text-surface-400 py-8 text-center">No approved students in this class.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {students.map(s => (
                <button key={s.student_id} onClick={() => toggleStatus(s.student_id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${statusColors[s.status]}`}
                >
                  <div className="w-8 h-8 rounded-full bg-white/60 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {s.first_name[0]}{s.last_name[0]}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">{s.first_name} {s.last_name}</p>
                    <p className="text-[10px] opacity-70">{s.admission_no}</p>
                  </div>
                  <span className="text-xs font-bold uppercase">{s.status}</span>
                </button>
              ))}
            </div>
          )}
          {students.length > 0 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-surface-100">
              {message && <span className="text-sm text-emerald-600 font-medium animate-fade-in">{message}</span>}
              <div className="ml-auto">
                <button onClick={saveAttendance} disabled={saving} className="btn-primary">
                  {saving ? 'Saving...' : 'Save Attendance'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page: role-aware ────────────────────────────────────────────────────

export default function AttendancePage() {
  const [role, setRole] = useState<string | null>(null);
  const [activeChild, setActiveChild] = useState<any>(null);

  useEffect(() => {
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

  // React to child switch
  useEffect(() => {
    const handler = (e: Event) => setActiveChild((e as CustomEvent).detail);
    window.addEventListener('activeChildChanged', handler);
    return () => window.removeEventListener('activeChildChanged', handler);
  }, []);

  if (role === null) return null;

  if (role === 'parent') {
    if (!activeChild) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-3">
          <p className="text-gray-900 font-semibold">No child selected</p>
          <p className="text-sm text-surface-400">Select a child from the top bar to view attendance.</p>
        </div>
      );
    }
    return (
      <ParentAttendancePage
        studentId={activeChild.id}
        childName={`${activeChild.first_name} ${activeChild.last_name}`}
      />
    );
  }

  return <AdminAttendancePage />;
}
