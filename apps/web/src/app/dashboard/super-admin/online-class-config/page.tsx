'use client';

import { useEffect, useState } from 'react';
import { ConfigHelp } from '@/components/ui/ConfigHelp';

type SchoolConfig = {
  id: string;
  name: string;
  online_class_enabled: boolean;
  course_enabled: boolean;
  allowed_platforms: string[];
};

const ALL_PLATFORMS = [
  { id: 'meet',  label: 'Google Meet' },
  { id: 'teams', label: 'Microsoft Teams' },
  { id: 'zoom',  label: 'Zoom' },
];

export default function OnlineClassConfigPage() {
  const [schools, setSchools] = useState<SchoolConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState<string | null>(null);

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    setLoading(true);
    fetch('/api/schools', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(async (d) => {
        const schoolList = d.schools ?? [];
        const configs = await Promise.all(
          schoolList.map((s: { id: string }) =>
            fetch(`/api/super-admin/online-class-config?school_id=${s.id}`, { headers: { Authorization: `Bearer ${token}` } })
              .then(r => r.json())
              .then(c => c.config)
              .catch(() => null)
          )
        );
        setSchools(configs.filter(Boolean));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const update = async (schoolId: string, patch: Record<string, unknown>) => {
    setSaving(schoolId);
    const res = await fetch('/api/super-admin/online-class-config', {
      method: 'PATCH', headers,
      body: JSON.stringify({ school_id: schoolId, ...patch }),
    });
    const data = await res.json();
    if (res.ok) {
      setSchools(prev => prev.map(s => s.id === schoolId ? { ...s, ...data.config } : s));
    }
    setSaving(null);
  };

  const togglePlatform = (school: SchoolConfig, platform: string) => {
    const current = school.allowed_platforms;
    const next = current.includes(platform)
      ? current.filter(p => p !== platform)
      : [...current, platform];
    update(school.id, { allowed_platforms: next });
  };

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-600'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
    </button>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Online Class Configuration</h1>
        <p className="text-sm text-surface-400 mt-0.5">Enable or disable online classes, courses, and platforms per school.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="card p-4 animate-pulse h-24 bg-surface-100 dark:bg-gray-800" />)}
        </div>
      ) : schools.length === 0 ? (
        <div className="card p-10 text-center"><p className="text-surface-400 text-sm">No schools found.</p></div>
      ) : (
        <div className="space-y-4">
          {schools.map(school => (
            <div key={school.id} className="card p-5 space-y-4">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">{school.name}</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-3 bg-surface-50 dark:bg-gray-800 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
                      Online Classes
                      <ConfigHelp text="When enabled, teachers can schedule and conduct live video sessions via the selected platforms. Students and parents see the class schedule and join links on their dashboards." />
                    </p>
                    <p className="text-xs text-surface-400">Live class sessions via meetings</p>
                  </div>
                  <Toggle
                    checked={school.online_class_enabled}
                    onChange={() => update(school.id, { online_class_enabled: !school.online_class_enabled })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-surface-50 dark:bg-gray-800 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
                      Course Marketplace
                      <ConfigHelp text="When enabled, teachers and external providers can publish paid or free courses. Students and parents can browse and enroll. Paid courses require payment gateway setup." />
                    </p>
                    <p className="text-xs text-surface-400">Paid / free course enrollments</p>
                  </div>
                  <Toggle
                    checked={school.course_enabled}
                    onChange={() => update(school.id, { course_enabled: !school.course_enabled })}
                  />
                </div>
              </div>

              {school.online_class_enabled && (
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                    Allowed Platforms
                    <ConfigHelp text="Only these video conferencing tools appear as options when a teacher schedules a live class. Select all platforms your school has institutional accounts for. At least one platform must be selected when Online Classes is enabled." />
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    {ALL_PLATFORMS.map(p => (
                      <label key={p.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${school.allowed_platforms.includes(p.id) ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40' : 'border-surface-200 dark:border-gray-700'}`}>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={school.allowed_platforms.includes(p.id)}
                          disabled={saving === school.id}
                          onChange={() => togglePlatform(school, p.id)}
                        />
                        <span className="text-sm">{p.label}</span>
                        {school.allowed_platforms.includes(p.id) && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-brand-500"><polyline points="20,6 9,17 4,12"/></svg>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {saving === school.id && <p className="text-xs text-surface-400">Saving…</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
