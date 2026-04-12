'use client';

import { useState, useEffect } from 'react';

// ─── Attendance modes ───────────────────────────────────────────────────────────

const MODES = [
  {
    id:       'class',
    label:    'Class-wise',
    icon:     '🏫',
    desc:     'Teacher marks attendance per class period with subject-wise breakdown',
    badge:    'Subject columns enabled',
    badgeCls: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400',
  },
  {
    id:       'daily',
    label:    'Daily Roll-call',
    icon:     '📋',
    desc:     'Single daily attendance per student — only School In / School Out',
    badge:    'School In / Out only',
    badgeCls: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400',
  },
  {
    id:       'card',
    label:    'ID Card Scan',
    icon:     '💳',
    desc:     'Students tap RFID/barcode card to mark presence',
    badge:    'Hardware required',
    badgeCls: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400',
  },
  {
    id:       'face',
    label:    'Face Recognition',
    icon:     '🤖',
    desc:     'Automated attendance via facial recognition camera',
    badge:    'Hardware required',
    badgeCls: 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400',
  },
];

const COLOR_CODES = [
  { status: 'Present',  color: 'bg-emerald-500', label: 'Present = Green'    },
  { status: 'Absent',   color: 'bg-red-500',     label: 'Absent = Red'       },
  { status: 'Half Day', color: 'bg-yellow-400',  label: 'Half Day = Yellow'  },
  { status: 'Week Off', color: 'bg-sky-400',     label: 'Week Off = Sky Blue'},
  { status: 'Holiday',  color: 'bg-indigo-400',  label: 'Holiday = Indigo'   },
];

// ─── Toggle component ───────────────────────────────────────────────────────────

function Toggle({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 shrink-0 w-10 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 ${checked ? 'bg-brand-500' : 'bg-surface-200 dark:bg-gray-700'}`}
      >
        <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
      <div>
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
        {desc && <p className="text-xs text-surface-400 mt-0.5">{desc}</p>}
      </div>
    </label>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function AttendanceConfigPage({ params }: { params: { id: string } }) {
  // Attendance mode
  const [mode, setMode] = useState('class');

  // Geo controls
  const [geoTagging, setGeoTagging] = useState(false);
  const [geoFencing, setGeoFencing] = useState(false);
  const [latitude,   setLatitude]   = useState('');
  const [longitude,  setLongitude]  = useState('');
  const [radius,     setRadius]     = useState('500');

  // Integration
  const [idCardEnabled, setIdCardEnabled] = useState(false);
  const [faceEnabled,   setFaceEnabled]   = useState(false);
  const [idCardApiUrl,  setIdCardApiUrl]  = useState('');
  const [faceApiUrl,    setFaceApiUrl]    = useState('');
  const [idCardApiKey,  setIdCardApiKey]  = useState('');
  const [faceApiKey,    setFaceApiKey]    = useState('');

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState('');

  // ── Load existing config ──────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`/api/super-admin/schools/${params.id}/attendance-config`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        if (d.attendanceMode)        setMode(d.attendanceMode);
        if (d.geoTaggingEnabled)     setGeoTagging(d.geoTaggingEnabled);
        if (d.geoFencingEnabled)     setGeoFencing(d.geoFencingEnabled);
        if (d.latitude  != null)     setLatitude(String(d.latitude));
        if (d.longitude != null)     setLongitude(String(d.longitude));
        if (d.geoFenceRadius)        setRadius(String(d.geoFenceRadius));
        if (d.idCardIntegrationEnabled) setIdCardEnabled(d.idCardIntegrationEnabled);
        if (d.faceRecognitionEnabled)   setFaceEnabled(d.faceRecognitionEnabled);
        const cfg = d.integrationConfig ?? {};
        if (cfg.idCardApiUrl) setIdCardApiUrl(cfg.idCardApiUrl);
        if (cfg.idCardApiKey) setIdCardApiKey(cfg.idCardApiKey);
        if (cfg.faceApiUrl)   setFaceApiUrl(cfg.faceApiUrl);
        if (cfg.faceApiKey)   setFaceApiKey(cfg.faceApiKey);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.id]);

  // Mutual exclusion: enabling one geo mode disables the other
  const handleGeoTagging = (v: boolean) => { setGeoTagging(v); if (v) setGeoFencing(false); };
  const handleGeoFencing = (v: boolean) => { setGeoFencing(v); if (v) setGeoTagging(false); };

  // ── Save ──────────────────────────────────────────────────────────────────────
  async function save() {
    setSaving(true); setError(''); setSaved(false);
    const token = localStorage.getItem('token');

    const payload: Record<string, unknown> = {
      attendanceMode:           mode,
      geoTaggingEnabled:        geoTagging,
      geoFencingEnabled:        geoFencing,
      latitude:                 latitude  ? parseFloat(latitude)  : null,
      longitude:                longitude ? parseFloat(longitude) : null,
      geoFenceRadius:           radius    ? parseFloat(radius)    : 500,
      idCardIntegrationEnabled: idCardEnabled,
      faceRecognitionEnabled:   faceEnabled,
      integrationConfig: {
        idCardApiUrl,
        idCardApiKey,
        faceApiUrl,
        faceApiKey,
      },
    };

    const res = await fetch(`/api/super-admin/schools/${params.id}/attendance-config`, {
      method:  'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || 'Failed to save configuration');
    }
    setSaving(false);
  }

  const selectedMode = MODES.find(m => m.id === mode);

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Attendance Configuration</h1>
        <p className="text-sm text-surface-400 mt-0.5">All settings sync automatically to this school on save.</p>
      </div>

      {/* ── Student Capture Mode ──────────────────────────────────────────────── */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Student Capture Mode</h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-xl bg-surface-100 dark:bg-gray-800 animate-pulse"/>)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${mode === m.id ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30' : 'border-surface-200 dark:border-gray-700 hover:border-brand-300'}`}
              >
                <div className="text-2xl mb-2">{m.icon}</div>
                <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">{m.label}</div>
                <div className="text-xs text-surface-400 mt-0.5 mb-2">{m.desc}</div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.badgeCls}`}>{m.badge}</span>
              </button>
            ))}
          </div>
        )}
        {selectedMode && (
          <div className="p-3 rounded-xl bg-surface-50 dark:bg-gray-800/50 border border-surface-100 dark:border-gray-700 text-xs text-surface-500 dark:text-gray-400 flex items-start gap-2">
            <svg width="14" height="14" className="shrink-0 mt-0.5 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>
              {mode === 'class' && 'Class-wise mode shows P / A / L / H / E buttons per student with subject-wise columns. Teachers mark attendance per class period.'}
              {mode === 'daily' && 'Daily Roll-call mode shows only School In and School Out. One simple daily record per student — no subject breakdown.'}
              {mode === 'card'  && 'ID Card Scan requires RFID/barcode hardware. Configure the integration endpoint below.'}
              {mode === 'face'  && 'Face Recognition requires camera hardware and the face recognition API. Configure the endpoint below.'}
            </span>
          </div>
        )}
      </div>

      {/* ── Geo Controls ─────────────────────────────────────────────────────────── */}
      <div className="card p-6 space-y-6">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Geo Controls — Teacher Punch</h2>
          <p className="text-xs text-surface-400 mt-0.5">Control where teachers can punch in / out from. Only one mode can be active at a time.</p>
        </div>

        <div className="space-y-4">
          <Toggle
            checked={geoTagging}
            onChange={handleGeoTagging}
            label="Geo Tagging (allow from anywhere)"
            desc="When ON, teachers can punch from any location. No location restriction is applied."
          />
          <Toggle
            checked={geoFencing}
            onChange={handleGeoFencing}
            label="Geo Fencing (restrict to school perimeter)"
            desc="When ON, punches outside the defined school radius are blocked with an error."
          />
        </div>

        {geoFencing && (
          <div className="space-y-4 pt-2 border-t border-surface-100 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">School Geo-fence Centre</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  className="input-field"
                  placeholder="e.g. 28.6139"
                  value={latitude}
                  onChange={e => setLatitude(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  className="input-field"
                  placeholder="e.g. 77.2090"
                  value={longitude}
                  onChange={e => setLongitude(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="label">Allowed Radius (metres)</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={50}
                  max={5000}
                  className="input-field w-36"
                  value={radius}
                  onChange={e => setRadius(e.target.value)}
                />
                <span className="text-sm text-surface-400">metres from school centre</span>
              </div>
              <p className="text-xs text-surface-400 mt-1">Punches beyond this radius will be blocked with an error message.</p>
            </div>
          </div>
        )}

        {!geoTagging && !geoFencing && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
            <svg width="14" height="14" className="shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            No geo control is active. Teachers can punch from anywhere without location validation.
          </div>
        )}
      </div>

      {/* ── Integration Settings ──────────────────────────────────────────────── */}
      <div className="card p-6 space-y-6">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Integration Settings</h2>
          <p className="text-xs text-surface-400 mt-0.5">Configure hardware integrations for automated attendance capture.</p>
        </div>

        {/* ID Card Scan */}
        <div className="space-y-4">
          <Toggle
            checked={idCardEnabled}
            onChange={setIdCardEnabled}
            label="ID Card Scan (RFID / Barcode)"
            desc="Enable RFID or barcode card scanning for student attendance."
          />
          {idCardEnabled && (
            <div className="ml-13 space-y-3 pl-6 border-l-2 border-brand-200 dark:border-brand-800">
              <div>
                <label className="label">Card Reader API Endpoint</label>
                <input type="url" className="input-field" placeholder="https://reader.example.com/api/scan" value={idCardApiUrl} onChange={e => setIdCardApiUrl(e.target.value)} />
              </div>
              <div>
                <label className="label">API Key / Token</label>
                <input type="password" className="input-field" placeholder="sk-••••••••" value={idCardApiKey} onChange={e => setIdCardApiKey(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        {/* Face Recognition */}
        <div className="space-y-4">
          <Toggle
            checked={faceEnabled}
            onChange={setFaceEnabled}
            label="Face Recognition"
            desc="Enable camera-based facial recognition for automated attendance."
          />
          {faceEnabled && (
            <div className="ml-13 space-y-3 pl-6 border-l-2 border-brand-200 dark:border-brand-800">
              <div>
                <label className="label">Face Recognition API Endpoint</label>
                <input type="url" className="input-field" placeholder="https://face.example.com/api/recognize" value={faceApiUrl} onChange={e => setFaceApiUrl(e.target.value)} />
              </div>
              <div>
                <label className="label">API Key / Token</label>
                <input type="password" className="input-field" placeholder="sk-••••••••" value={faceApiKey} onChange={e => setFaceApiKey(e.target.value)} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Attendance Color Codes ───────────────────────────────────────────── */}
      <div className="card p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Attendance Color Codes</h2>
          <p className="text-xs text-surface-400 mt-0.5">Standard color coding applied across all attendance calendars.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {COLOR_CODES.map(c => (
            <div key={c.status} className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-gray-800/50 border border-surface-100 dark:border-gray-700">
              <div className={`w-5 h-5 rounded-full ${c.color} shrink-0`} />
              <span className="text-sm text-gray-700 dark:text-gray-300">{c.label}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-surface-400">Color codes are system-defined and applied automatically across all role views.</p>
      </div>

      {/* ── Save ─────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving || loading} className="btn-primary">
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
        {saved && <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Saved! Configuration synced to school.</span>}
        {error && <span className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</span>}
      </div>
    </div>
  );
}
