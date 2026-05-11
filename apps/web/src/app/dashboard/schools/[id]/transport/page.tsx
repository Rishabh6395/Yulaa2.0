'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

interface Stop { name: string; time?: string; }
interface Route {
  id: string; name: string; driverName?: string | null; driverPhone?: string | null;
  vehicleNo?: string | null; capacity?: number | null;
  morningDeparture?: string | null; eveningDeparture?: string | null;
  stops?: Stop[] | null;
}
interface Bus { id: string; busNumber: string; capacity?: number | null; gpsEnabled: boolean; isActive: boolean; }
interface Ride {
  id: string; direction: string; status: string; createdAt: string;
  route: { id: string; name: string };
  bus?: { busNumber: string } | null;
  employee: { firstName: string; lastName: string };
  _count: { rideStudents: number };
}

function headers() {
  const t = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` };
}

function statusBadge(status: string) {
  const m: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300',
  };
  return `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${m[status] ?? 'bg-surface-100 text-surface-500'}`;
}

function BusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 6v6M15 6v6M2 12h19.6M18 18h2a1 1 0 0 0 1-1v-5H3v5a1 1 0 0 0 1 1h2"/>
      <path d="M4 12V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5"/>
      <circle cx="7" cy="18" r="1.5"/><circle cx="17" cy="18" r="1.5"/>
    </svg>
  );
}

export default function SchoolTransportPage() {
  const params = useParams<{ id: string }>();
  const schoolId = params.id;

  const [tab, setTab]         = useState<'overview' | 'routes' | 'buses'>('overview');
  const [routes, setRoutes]   = useState<Route[]>([]);
  const [buses, setBuses]     = useState<Bus[]>([]);
  const [rides, setRides]     = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  // Route form
  const EMPTY_ROUTE = { name: '', driverName: '', driverPhone: '', vehicleNo: '', capacity: '', morningDeparture: '', eveningDeparture: '', stopsRaw: '' };
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [editingRoute, setEditingRoute]   = useState<Route | null>(null);
  const [routeForm, setRouteForm]         = useState({ ...EMPTY_ROUTE });
  const [routeSaving, setRouteSaving]     = useState(false);

  // Bus form
  const EMPTY_BUS = { busNumber: '', capacity: '', gpsEnabled: false, gpsDeviceId: '' };
  const [showBusForm, setShowBusForm] = useState(false);
  const [editingBus, setEditingBus]   = useState<Bus | null>(null);
  const [busForm, setBusForm]         = useState({ ...EMPTY_BUS });
  const [busSaving, setBusSaving]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rd, bd, rideD] = await Promise.all([
        fetch(`/api/transport?school_id=${schoolId}`, { headers: headers() }).then(r => r.json()),
        fetch(`/api/transport/buses?school_id=${schoolId}`, { headers: headers() }).then(r => r.json()),
        fetch(`/api/transport/rides?school_id=${schoolId}&limit=10`, { headers: headers() }).then(r => r.json()),
      ]);
      setRoutes(rd.routes ?? []);
      setBuses(bd.buses ?? []);
      setRides(rideD.rides ?? []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [schoolId]);

  useEffect(() => { load(); }, [load]);

  // ── Route ops ─────────────────────────────────────────────────────────────

  function parseStops(raw: string): Stop[] {
    return raw.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
      const m = l.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
      return m ? { name: m[1].trim(), time: m[2].trim() } : { name: l };
    });
  }

  async function saveRoute() {
    if (!routeForm.name.trim()) { setError('Route name required'); return; }
    setRouteSaving(true); setError('');
    try {
      const body = {
        ...(editingRoute ? { id: editingRoute.id } : {}),
        schoolId,
        name: routeForm.name, driverName: routeForm.driverName || null,
        driverPhone: routeForm.driverPhone || null, vehicleNo: routeForm.vehicleNo || null,
        capacity: routeForm.capacity ? Number(routeForm.capacity) : null,
        morningDeparture: routeForm.morningDeparture || null,
        eveningDeparture: routeForm.eveningDeparture || null,
        stops: routeForm.stopsRaw.trim() ? parseStops(routeForm.stopsRaw) : null,
      };
      const res = await fetch('/api/transport', { method: editingRoute ? 'PATCH' : 'POST', headers: headers(), body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Save failed');
      await load(); setShowRouteForm(false);
    } catch (e: any) { setError(e.message); }
    finally { setRouteSaving(false); }
  }

  async function deleteRoute(id: string) {
    if (!confirm('Delete this route?')) return;
    const res = await fetch(`/api/transport?id=${id}`, { method: 'DELETE', headers: headers() });
    if (res.ok) setRoutes(prev => prev.filter(r => r.id !== id));
    else { const d = await res.json(); setError(d.message || 'Delete failed'); }
  }

  // ── Bus ops ───────────────────────────────────────────────────────────────

  async function saveBus() {
    if (!busForm.busNumber.trim()) { setError('Bus number required'); return; }
    setBusSaving(true); setError('');
    try {
      const body = {
        ...(editingBus ? { id: editingBus.id } : {}),
        schoolId, busNumber: busForm.busNumber,
        capacity: busForm.capacity ? Number(busForm.capacity) : null,
        gpsEnabled: busForm.gpsEnabled, gpsDeviceId: busForm.gpsDeviceId || null,
      };
      const res = await fetch('/api/transport/buses', { method: editingBus ? 'PATCH' : 'POST', headers: headers(), body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Save failed');
      await load(); setShowBusForm(false);
    } catch (e: any) { setError(e.message); }
    finally { setBusSaving(false); }
  }

  async function deleteBus(id: string) {
    if (!confirm('Remove this bus?')) return;
    await fetch(`/api/transport/buses?id=${id}`, { method: 'DELETE', headers: headers() });
    setBuses(prev => prev.filter(b => b.id !== id));
  }

  const activeRides = rides.filter(r => r.status === 'active').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Transport</h1>
        <p className="text-sm text-surface-400 mt-0.5">Routes, buses, and ride monitoring for this school.</p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error} <button className="ml-2 underline" onClick={() => setError('')}>Dismiss</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Routes', value: routes.length, color: 'text-brand-600' },
          { label: 'Buses', value: buses.length, color: 'text-blue-600' },
          { label: 'Active Rides', value: activeRides, color: 'text-emerald-600' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-surface-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-surface-200 dark:border-gray-700">
        {(['overview', 'routes', 'buses'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${tab === t ? 'border-brand-600 text-brand-600' : 'border-transparent text-surface-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Recent Rides</h3>
          {loading ? <div className="text-sm text-surface-400">Loading...</div> : rides.length === 0 ? (
            <div className="card p-8 text-center text-sm text-surface-400">No rides recorded yet.</div>
          ) : (
            <div className="space-y-2">
              {rides.map(r => (
                <div key={r.id} className="card p-4 flex items-center gap-4">
                  <div className="text-blue-500"><BusIcon /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{r.route.name}</div>
                    <div className="text-xs text-surface-400">
                      {r.employee.firstName} {r.employee.lastName} · {r._count.rideStudents} students
                      {r.bus && ` · Bus ${r.bus.busNumber}`}
                      {' · '}{new Date(r.createdAt).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                  <span className={statusBadge(r.status)}>{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Routes */}
      {tab === 'routes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Routes</h3>
            <button onClick={() => { setEditingRoute(null); setRouteForm({ ...EMPTY_ROUTE }); setShowRouteForm(true); }} className="btn btn-primary text-sm">+ Add Route</button>
          </div>
          {loading ? <div className="text-sm text-surface-400">Loading...</div> : routes.length === 0 ? (
            <div className="card p-8 text-center text-sm text-surface-400">No routes configured.</div>
          ) : (
            <div className="space-y-2">
              {routes.map(r => {
                const stops: Stop[] = Array.isArray(r.stops) ? r.stops : [];
                return (
                  <div key={r.id} className="card p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{r.name}</div>
                        <div className="text-xs text-surface-400 mt-0.5">
                          {r.vehicleNo && <span className="mr-2">{r.vehicleNo}</span>}
                          {r.driverName && <span className="mr-2">Driver: {r.driverName}</span>}
                          {stops.length > 0 && <span>{stops.length} stops</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => {
                          setEditingRoute(r);
                          setRouteForm({
                            name: r.name, driverName: r.driverName ?? '', driverPhone: r.driverPhone ?? '',
                            vehicleNo: r.vehicleNo ?? '', capacity: r.capacity != null ? String(r.capacity) : '',
                            morningDeparture: r.morningDeparture ?? '', eveningDeparture: r.eveningDeparture ?? '',
                            stopsRaw: Array.isArray(r.stops) ? r.stops.map((s: Stop) => s.time ? `${s.name} (${s.time})` : s.name).join('\n') : '',
                          });
                          setShowRouteForm(true);
                        }} className="text-xs text-brand-600 font-medium">Edit</button>
                        <button onClick={() => deleteRoute(r.id)} className="text-xs text-red-500">Delete</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Route Form Modal */}
          {showRouteForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-surface-200 dark:border-gray-700">
                <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 dark:border-gray-700">
                  <h3 className="font-display font-bold text-gray-900 dark:text-gray-100">{editingRoute ? 'Edit Route' : 'Add Route'}</h3>
                  <button onClick={() => setShowRouteForm(false)} className="text-surface-400 hover:text-gray-600"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                </div>
                <div className="overflow-y-auto flex-1 px-6 py-5 space-y-3">
                  <div><label className="label">Route Name *</label><input className="input" value={routeForm.name} onChange={e => setRouteForm(f => ({ ...f, name: e.target.value }))} placeholder="Route A – North"/></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="label">Driver Name</label><input className="input" value={routeForm.driverName} onChange={e => setRouteForm(f => ({ ...f, driverName: e.target.value }))} placeholder="Full name"/></div>
                    <div><label className="label">Driver Phone</label><input className="input" value={routeForm.driverPhone} onChange={e => setRouteForm(f => ({ ...f, driverPhone: e.target.value }))} placeholder="+91 XXXXX"/></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="label">Vehicle No.</label><input className="input" value={routeForm.vehicleNo} onChange={e => setRouteForm(f => ({ ...f, vehicleNo: e.target.value }))} placeholder="MH01AB1234"/></div>
                    <div><label className="label">Capacity</label><input className="input" type="number" value={routeForm.capacity} onChange={e => setRouteForm(f => ({ ...f, capacity: e.target.value }))} placeholder="40"/></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="label">Morning Departure</label><input className="input" value={routeForm.morningDeparture} onChange={e => setRouteForm(f => ({ ...f, morningDeparture: e.target.value }))} placeholder="07:00"/></div>
                    <div><label className="label">Evening Departure</label><input className="input" value={routeForm.eveningDeparture} onChange={e => setRouteForm(f => ({ ...f, eveningDeparture: e.target.value }))} placeholder="16:30"/></div>
                  </div>
                  <div>
                    <label className="label">Stops (one per line)</label>
                    <textarea className="input min-h-[80px] text-xs font-mono" value={routeForm.stopsRaw} onChange={e => setRouteForm(f => ({ ...f, stopsRaw: e.target.value }))} placeholder={"Main Gate (07:05)\nCity Square (07:20)\nSchool (07:45)"}/>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-surface-100 dark:border-gray-700 flex gap-3 justify-end">
                  <button className="btn btn-ghost" onClick={() => setShowRouteForm(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={saveRoute} disabled={routeSaving}>{routeSaving ? 'Saving…' : editingRoute ? 'Save Changes' : 'Create Route'}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Buses */}
      {tab === 'buses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Buses & Vehicles</h3>
            <button onClick={() => { setEditingBus(null); setBusForm({ ...EMPTY_BUS }); setShowBusForm(true); }} className="btn btn-primary text-sm">+ Add Bus</button>
          </div>
          {loading ? <div className="text-sm text-surface-400">Loading...</div> : buses.length === 0 ? (
            <div className="card p-8 text-center text-sm text-surface-400">No buses added yet.</div>
          ) : (
            <div className="space-y-2">
              {buses.map(b => (
                <div key={b.id} className="card p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-500"><BusIcon /></div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">Bus {b.busNumber}</div>
                    <div className="text-xs text-surface-400">{b.capacity ? `${b.capacity} seats · ` : ''}{b.gpsEnabled ? 'GPS enabled' : 'No GPS'}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingBus(b); setBusForm({ busNumber: b.busNumber, capacity: b.capacity != null ? String(b.capacity) : '', gpsEnabled: b.gpsEnabled, gpsDeviceId: '' }); setShowBusForm(true); }} className="text-xs text-brand-600 font-medium">Edit</button>
                    <button onClick={() => deleteBus(b.id)} className="text-xs text-red-500">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bus Form Modal */}
          {showBusForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-surface-200 dark:border-gray-700">
                <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 dark:border-gray-700">
                  <h3 className="font-display font-bold text-gray-900 dark:text-gray-100">{editingBus ? 'Edit Bus' : 'Add Bus'}</h3>
                  <button onClick={() => setShowBusForm(false)} className="text-surface-400 hover:text-gray-600"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                </div>
                <div className="px-6 py-5 space-y-4">
                  <div><label className="label">Bus / Vehicle Number *</label><input className="input" value={busForm.busNumber} onChange={e => setBusForm(f => ({ ...f, busNumber: e.target.value }))} placeholder="Bus 12 / MH01AB1234"/></div>
                  <div><label className="label">Capacity (seats)</label><input className="input" type="number" value={busForm.capacity} onChange={e => setBusForm(f => ({ ...f, capacity: e.target.value }))} placeholder="40"/></div>
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-gray-800 dark:text-gray-200">GPS Tracking Enabled</span>
                    <div onClick={() => setBusForm(f => ({ ...f, gpsEnabled: !f.gpsEnabled }))} className={`w-10 h-5 rounded-full cursor-pointer relative transition-colors ${busForm.gpsEnabled ? 'bg-brand-500' : 'bg-surface-300 dark:bg-gray-600'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${busForm.gpsEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                  </label>
                  {busForm.gpsEnabled && <div><label className="label">GPS Device ID</label><input className="input" value={busForm.gpsDeviceId} onChange={e => setBusForm(f => ({ ...f, gpsDeviceId: e.target.value }))} placeholder="Device IMEI / serial"/></div>}
                </div>
                <div className="px-6 py-4 border-t border-surface-100 dark:border-gray-700 flex gap-3 justify-end">
                  <button className="btn btn-ghost" onClick={() => setShowBusForm(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={saveBus} disabled={busSaving}>{busSaving ? 'Saving…' : editingBus ? 'Save' : 'Add Bus'}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
