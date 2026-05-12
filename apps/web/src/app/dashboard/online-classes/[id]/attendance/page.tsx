'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type StudentRow = {
  id: string;
  firstName: string;
  lastName: string;
  admissionNo: string;
  attendance: { status: string; markedByTeacher: boolean } | null;
};

export default function OnlineClassAttendancePage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;

  const [students,  setStudents]  = useState<StudentRow[]>([]);
  const [marks,     setMarks]     = useState<Record<string, 'present' | 'absent'>>({});
  const [ocTitle,   setOcTitle]   = useState('');
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    setLoading(true);
    fetch(`/api/online-classes/attendance?online_class_id=${classId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        setStudents(d.students ?? []);
        setOcTitle(d.onlineClass?.title ?? '');
        const initial: Record<string, 'present' | 'absent'> = {};
        (d.students ?? []).forEach((s: StudentRow) => {
          initial[s.id] = (s.attendance?.status as any) ?? 'present';
        });
        setMarks(initial);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggleAll = (status: 'present' | 'absent') => {
    const all: Record<string, 'present' | 'absent'> = {};
    students.forEach(s => { all[s.id] = status; });
    setMarks(all);
  };

  const handleSave = async () => {
    setSaving(true);
    const attendance = Object.entries(marks).map(([student_id, status]) => ({ student_id, status }));
    await fetch('/api/online-classes/attendance', {
      method: 'POST', headers,
      body: JSON.stringify({ online_class_id: classId, attendance }),
    });
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const present = Object.values(marks).filter(v => v === 'present').length;

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/dashboard/online-classes')} className="text-surface-400 hover:text-gray-700 dark:hover:text-gray-300">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15,18 9,12 15,6"/></svg>
        </button>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Online Attendance</h1>
          {ocTitle && <p className="text-sm text-surface-400">{ocTitle}</p>}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="card p-4 animate-pulse h-14 bg-surface-100 dark:bg-gray-800" />)}
        </div>
      ) : students.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-surface-400 text-sm">No students found for this class.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-surface-400">{present}/{students.length} present</p>
            <div className="flex gap-2">
              <button onClick={() => toggleAll('present')} className="text-xs text-emerald-600 font-medium hover:underline">All Present</button>
              <span className="text-surface-300">·</span>
              <button onClick={() => toggleAll('absent')} className="text-xs text-red-500 font-medium hover:underline">All Absent</button>
            </div>
          </div>

          <div className="card divide-y divide-surface-100 dark:divide-gray-700 overflow-hidden">
            {students.map((s, i) => (
              <div key={s.id} className={`flex items-center justify-between px-4 py-3 ${i % 2 === 0 ? '' : 'bg-surface-50/50 dark:bg-gray-800/20'}`}>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.firstName} {s.lastName}</p>
                  <p className="text-xs text-surface-400">{s.admissionNo}</p>
                </div>
                <div className="flex gap-2">
                  {(['present', 'absent'] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => setMarks(m => ({ ...m, [s.id]: status }))}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${marks[s.id] === status
                        ? status === 'present'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-red-500 text-white'
                        : 'bg-surface-100 dark:bg-gray-700 text-surface-500 hover:bg-surface-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {status === 'present' ? 'Present' : 'Absent'}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving} className="btn btn-primary">
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Attendance'}
            </button>
            <button onClick={() => router.push('/dashboard/online-classes')} className="btn btn-secondary">Back</button>
          </div>
        </>
      )}
    </div>
  );
}
