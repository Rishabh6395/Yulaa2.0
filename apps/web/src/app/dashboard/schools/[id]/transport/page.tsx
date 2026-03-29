'use client';

import { useState } from 'react';

const ROUTES_MOCK = [
  { id: '1', name: 'Route A – North', stops: 5, students: 22, driver: 'Rajan Kumar', vehicleNo: 'MH01AB1234' },
  { id: '2', name: 'Route B – South', stops: 4, students: 18, driver: 'Suresh Yadav', vehicleNo: 'MH01CD5678' },
];

export default function TransportConfigPage({ params }: { params: { id: string } }) {
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [trackingProvider, setTrackingProvider] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [notifyPickup, setNotifyPickup] = useState(true);
  const [notifyDrop, setNotifyDrop] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Transport Configuration</h1>
        <p className="text-sm text-surface-400 mt-0.5">Bus routes, GPS integration and parent notifications.</p>
      </div>

      {/* Routes Overview */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Routes</h2>
          <button className="btn btn-secondary text-sm">+ Add Route</button>
        </div>
        {ROUTES_MOCK.length === 0 ? (
          <p className="text-sm text-surface-400 text-center py-4">No routes configured.</p>
        ) : (
          <div className="space-y-3">
            {ROUTES_MOCK.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-gray-700/40">
                <div>
                  <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{r.name}</div>
                  <div className="text-xs text-surface-400 mt-0.5">{r.stops} stops · {r.students} students · {r.vehicleNo}</div>
                  <div className="text-xs text-surface-400">Driver: {r.driver}</div>
                </div>
                <button className="text-xs text-brand-600 hover:text-brand-700 font-medium">Edit</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* GPS Integration */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">GPS Tracking Integration</h2>
            <p className="text-xs text-surface-400 mt-0.5">Enable real-time bus location tracking</p>
          </div>
          <div onClick={() => setGpsEnabled(v => !v)} className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${gpsEnabled ? 'bg-brand-500' : 'bg-surface-300 dark:bg-gray-600'} relative`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${gpsEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </div>

        {gpsEnabled && (
          <div className="space-y-3">
            <div>
              <label className="label">Tracking Provider</label>
              <select className="input" value={trackingProvider} onChange={e => setTrackingProvider(e.target.value)}>
                <option value="">— Select —</option>
                <option value="google_maps">Google Maps Platform</option>
                <option value="mapbox">Mapbox</option>
                <option value="traccar">Traccar (self-hosted)</option>
                <option value="custom">Custom API</option>
              </select>
            </div>
            <div>
              <label className="label">API Key</label>
              <input className="input" type="password" placeholder="Enter GPS provider API key" value={apiKey} onChange={e => setApiKey(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Parent Notifications</h2>
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm text-gray-800 dark:text-gray-200">Notify when bus picks up child</span>
          <div onClick={() => setNotifyPickup(v => !v)} className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${notifyPickup ? 'bg-brand-500' : 'bg-surface-300 dark:bg-gray-600'} relative`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifyPickup ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </label>
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm text-gray-800 dark:text-gray-200">Notify when bus drops off child</span>
          <div onClick={() => setNotifyDrop(v => !v)} className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${notifyDrop ? 'bg-brand-500' : 'bg-surface-300 dark:bg-gray-600'} relative`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifyDrop ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="btn btn-primary">
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
        {saved && <span className="text-sm text-emerald-600 font-medium">Saved!</span>}
      </div>
    </div>
  );
}
