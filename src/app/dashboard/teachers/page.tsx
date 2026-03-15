'use client';

import { useState, useEffect } from 'react';

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  useEffect(() => {
    fetch('/api/teachers', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setTeachers(d.teachers || []); setLoading(false); });
  }, [token]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Teachers</h1>
        <p className="text-sm text-surface-400 mt-0.5">{teachers.length} teaching staff members</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="card p-5 h-36 animate-pulse bg-surface-100"/>)}
        </div>
      ) : teachers.length === 0 ? (
        <div className="card p-12 text-center"><p className="text-surface-400">No teachers found.</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teachers.map((t) => (
            <div key={t.id} className="card-hover p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 font-bold flex-shrink-0">
                  {t.first_name[0]}{t.last_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900">{t.first_name} {t.last_name}</h3>
                  <p className="text-xs text-surface-400 mt-0.5">{t.employee_id}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {t.subjects?.map((s: string, i: number) => (
                      <span key={i} className="text-[10px] bg-brand-50 text-brand-600 px-2 py-0.5 rounded-md font-medium">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-surface-100 space-y-1">
                <p className="text-xs text-surface-400 flex items-center gap-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  {t.email}
                </p>
                {t.phone && (
                  <p className="text-xs text-surface-400 flex items-center gap-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    {t.phone}
                  </p>
                )}
                {t.qualification && <p className="text-xs text-surface-400">{t.qualification}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
