'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

interface Stop { name: string; time?: string; }
interface Route {
  id: string; name: string; driverName?: string | null; driverPhone?: string | null;
  vehicleNo?: string | null; capacity?: number | null;
  morningDeparture?: string | null; eveningDeparture?: string | null;
  stops?: Stop[] | null;
}
interface Bus { id: string; busNumber: string; capacity?: number | null; gpsEnabled: boolean; isActive: boolean; }
interface Student {
  id: string; firstName: string; lastName: string; admissionNo?: string;
  class?: { grade?: string; section?: string } | null;
}
interface RideStudent {
  id: string; studentId: string; pickupStatus: string; dropStatus: string;
  notifiedAt?: string | null;
  student: { id: string; firstName: string; lastName: string; class?: { grade: string; section?: string } | null };
}
interface Ride {
  id: string; direction: string; status: string; emergencyContact?: string | null;
  departureTime?: string | null; arrivalTime?: string | null; gpsEnabled: boolean;
  createdAt: string;
  route: { id: string; name: string; stops?: Stop[] | null };
  bus?: { id: string; busNumber: string; gpsEnabled: boolean } | null;
  employee: { firstName: string; lastName: string };
  rideStudents: RideStudent[];
  _count?: { rideStudents: number };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function headers() {
  const t = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` };
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    active:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300',
  };
  return `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${map[status] ?? 'bg-surface-100 text-surface-500'}`;
}

// ── Bus Icon ─────────────────────────────────────────────────────────────────
function BusIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 6v6M15 6v6M2 12h19.6M18 18h2a1 1 0 0 0 1-1v-5H3v5a1 1 0 0 0 1 1h2"/>
      <path d="M4 12V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5"/>
      <circle cx="7" cy="18" r="1.5"/><circle cx="17" cy="18" r="1.5"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVE RIDE VIEW
// ─────────────────────────────────────────────────────────────────────────────

function ActiveRideView({ ride: initialRide, onBack, onRefresh }: {
  ride: Ride; onBack: () => void; onRefresh: () => void;
}) {
  const [ride, setRide] = useState<Ride>(initialRide);
  const [busy, setBusy] = useState(false);

  async function doAction(action: string, extra: Record<string, any> = {}) {
    setBusy(true);
    try {
      const res = await fetch(`/api/transport/rides/${ride.id}`, {
        method: 'PATCH', headers: headers(),
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      if (data.ride) setRide((r) => ({ ...r, ...data.ride }));
      onRefresh();
    } catch (e: any) { alert(e.message); }
    finally { setBusy(false); }
  }

  async function toggleStudent(type: 'pickup' | 'drop', studentId: string, current: string) {
    const next = current === 'pending' ? (type === 'pickup' ? 'picked' : 'dropped') : 'pending';
    await doAction(type === 'pickup' ? 'student_pickup' : 'student_drop', { studentId, status: next });
    setRide(r => ({
      ...r,
      rideStudents: r.rideStudents.map(rs =>
        rs.studentId === studentId
          ? { ...rs, [type === 'pickup' ? 'pickupStatus' : 'dropStatus']: next }
          : rs,
      ),
    }));
  }

  const isActive = ride.status === 'active';
  const isPending = ride.status === 'pending';
  const stops: Stop[] = Array.isArray(ride.route?.stops) ? ride.route.stops : [];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-surface-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15,18 9,12 15,6"/></svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-display font-bold text-gray-900 dark:text-gray-100">{ride.route.name}</h2>
            <span className={statusBadge(ride.status)}>{ride.status}</span>
            <span className="text-xs bg-surface-100 dark:bg-gray-700 text-surface-500 px-2 py-0.5 rounded-full capitalize">{ride.direction}</span>
          </div>
          <p className="text-sm text-surface-400 mt-0.5">
            {ride.bus ? `Bus ${ride.bus.busNumber} · ` : ''}
            Operated by {ride.employee.firstName} {ride.employee.lastName}
            {ride.departureTime && ` · Departed ${new Date(ride.departureTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
          </p>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{ride.rideStudents.length}</div>
          <div className="text-xs text-surface-400 mt-0.5">Students</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">
            {ride.rideStudents.filter(rs => rs.pickupStatus === 'picked').length}
          </div>
          <div className="text-xs text-surface-400 mt-0.5">Picked Up</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-red-500">
            {ride.rideStudents.filter(rs => rs.pickupStatus === 'absent').length}
          </div>
          <div className="text-xs text-surface-400 mt-0.5">Absent</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{ride.emergencyContact || '—'}</div>
          <div className="text-xs text-surface-400 mt-0.5">Emergency</div>
        </div>
      </div>

      {/* Action buttons */}
      {(isPending || isActive) && (
        <div className="flex gap-3 flex-wrap">
          {isPending && (
            <button
              onClick={() => doAction('depart')}
              disabled={busy}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 dark:shadow-none transition-all disabled:opacity-60"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="5,12 12,5 19,12"/><polyline points="5,19 12,12 19,19"/></svg>
              {busy ? 'Departing...' : 'BUS DEPARTED'}
            </button>
          )}
          {isActive && (
            <button
              onClick={() => { if (confirm('Mark ride as completed?')) doAction('complete'); }}
              disabled={busy}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-60"
            >
              Mark Complete
            </button>
          )}
          <button
            onClick={() => { if (confirm('Cancel this ride?')) doAction('cancel'); }}
            disabled={busy}
            className="px-5 py-2.5 text-red-500 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors disabled:opacity-60"
          >
            Cancel Ride
          </button>
        </div>
      )}

      {/* Student List */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-surface-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Students on Board</h3>
          <span className="text-xs text-surface-400">{ride.rideStudents.length} students</span>
        </div>
        <div className="divide-y divide-surface-100 dark:divide-gray-700">
          {ride.rideStudents.map(rs => (
            <div key={rs.id} className="px-5 py-3 flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-sm font-bold text-brand-700 dark:text-brand-300 flex-shrink-0">
                {rs.student.firstName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {rs.student.firstName} {rs.student.lastName}
                </div>
                {rs.student.class && (
                  <div className="text-xs text-surface-400">{rs.student.class.grade}{rs.student.class.section ?? ''}</div>
                )}
              </div>
              {isActive && (
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleStudent('pickup', rs.studentId, rs.pickupStatus)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${rs.pickupStatus === 'picked' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40' : rs.pickupStatus === 'absent' ? 'bg-red-100 text-red-600 dark:bg-red-900/40' : 'bg-surface-100 dark:bg-gray-700 text-surface-500'}`}
                  >
                    {rs.pickupStatus === 'picked' ? 'Picked' : rs.pickupStatus === 'absent' ? 'Absent' : 'Pickup?'}
                  </button>
                  <button
                    onClick={() => toggleStudent('drop', rs.studentId, rs.dropStatus)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${rs.dropStatus === 'dropped' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40' : 'bg-surface-100 dark:bg-gray-700 text-surface-500'}`}
                  >
                    {rs.dropStatus === 'dropped' ? 'Dropped' : 'Drop?'}
                  </button>
                </div>
              )}
              {!isActive && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${rs.pickupStatus === 'picked' ? 'bg-emerald-100 text-emerald-700' : rs.pickupStatus === 'absent' ? 'bg-red-100 text-red-600' : 'bg-surface-100 text-surface-400'}`}>
                  {rs.pickupStatus}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Stops */}
      {stops.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Route Stops</h3>
          <div className="relative pl-4 space-y-2">
            <div className="absolute left-1.5 top-1 bottom-1 w-px bg-surface-200 dark:bg-gray-700" />
            {stops.map((s, i) => (
              <div key={i} className="relative flex items-center gap-3">
                <div className="absolute -left-2.5 w-2.5 h-2.5 rounded-full bg-brand-500 border-2 border-white dark:border-gray-800" />
                <span className="text-sm text-gray-900 dark:text-gray-100 pl-2">{s.name}</span>
                {s.time && <span className="text-xs text-surface-400 ml-auto">{s.time}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// START RIDE FLOW
// ─────────────────────────────────────────────────────────────────────────────

function StartRideFlow({ schoolId, onCreated }: { schoolId?: string; onCreated: (ride: Ride) => void }) {
  const [routes, setRoutes]       = useState<Route[]>([]);
  const [buses, setBuses]         = useState<Bus[]>([]);
  const [students, setStudents]   = useState<Student[]>([]);
  const [loadingStudents, setLS]  = useState(false);

  const [routeId,     setRouteId]     = useState('');
  const [busId,       setBusId]       = useState('');
  const [direction,   setDirection]   = useState('morning');
  const [emergency,   setEmergency]   = useState('');
  const [selected,    setSelected]    = useState<Set<string>>(new Set());
  const [search,      setSearch]      = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  const schoolParam = schoolId ? `?school_id=${schoolId}` : '';

  useEffect(() => {
    const h = headers();
    Promise.all([
      fetch(`/api/transport${schoolParam}`, { headers: h }).then(r => r.json()),
      fetch(`/api/transport/buses${schoolParam}`, { headers: h }).then(r => r.json()),
    ]).then(([rd, bd]) => {
      setRoutes(rd.routes ?? []);
      setBuses(bd.buses ?? []);
    });
  }, [schoolParam]);

  useEffect(() => {
    if (!routeId) { setStudents([]); return; }
    setLS(true);
    const sp = new URLSearchParams();
    sp.set('status', 'active');
    sp.set('limit', '200');
    if (schoolId) sp.set('schoolId', schoolId);
    fetch(`/api/students?${sp}`, { headers: headers() })
      .then(r => r.json())
      .then(d => setStudents(d.students ?? []))
      .catch(() => setStudents([]))
      .finally(() => setLS(false));
  }, [routeId, schoolId]);

  const classes = [...new Set(students.map(s => s.class?.grade).filter(Boolean))].sort() as string[];

  const filtered = students.filter(s => {
    const name = `${s.firstName} ${s.lastName}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || (s.admissionNo ?? '').includes(search);
    const matchClass = !classFilter || s.class?.grade === classFilter;
    return matchSearch && matchClass;
  });

  function toggleStudent(id: string) {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  function selectAll() {
    setSelected(new Set(filtered.map(s => s.id)));
  }
  function clearAll() { setSelected(new Set()); }

  async function startRide() {
    if (!routeId) { setError('Select a route'); return; }
    if (selected.size === 0) { setError('Select at least one student'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/transport/rides', {
        method: 'POST', headers: headers(),
        body: JSON.stringify({
          routeId, busId: busId || null, direction, emergencyContact: emergency || null,
          studentIds: [...selected], schoolId: schoolId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create ride');
      onCreated(data.ride);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl">
      <div>
        <h2 className="text-xl font-display font-bold text-gray-900 dark:text-gray-100">Start New Ride</h2>
        <p className="text-sm text-surface-400 mt-0.5">Select route, students, and begin the journey.</p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error} <button className="ml-2 underline" onClick={() => setError('')}>Dismiss</button>
        </div>
      )}

      {/* Route + Bus */}
      <div className="card p-5 space-y-4">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Trip Details</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Route *</label>
            <select className="input" value={routeId} onChange={e => { setRouteId(e.target.value); setSelected(new Set()); }}>
              <option value="">— Select Route —</option>
              {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Direction</label>
            <select className="input" value={direction} onChange={e => setDirection(e.target.value)}>
              <option value="morning">Morning (To School)</option>
              <option value="evening">Evening (From School)</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Bus (optional)</label>
            <select className="input" value={busId} onChange={e => setBusId(e.target.value)}>
              <option value="">— No bus —</option>
              {buses.map(b => <option key={b.id} value={b.id}>Bus {b.busNumber}{b.capacity ? ` (${b.capacity} seats)` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Emergency Contact</label>
            <input className="input" type="tel" placeholder="+91 XXXXX XXXXX" value={emergency} onChange={e => setEmergency(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Student Selection */}
      {routeId && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-100 dark:border-gray-700 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                Select Students <span className="text-surface-400 font-normal">({selected.size} selected)</span>
              </h3>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-xs text-brand-600 hover:text-brand-700 font-medium">All</button>
                <span className="text-surface-300">|</span>
                <button onClick={clearAll} className="text-xs text-surface-400 hover:text-gray-600 font-medium">None</button>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                className="input flex-1 text-sm"
                placeholder="Search by name or admission no..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {classes.length > 0 && (
                <select className="input w-28 text-sm" value={classFilter} onChange={e => setClassFilter(e.target.value)}>
                  <option value="">All Grades</option>
                  {classes.map(c => <option key={c} value={c}>Grade {c}</option>)}
                </select>
              )}
            </div>
          </div>
          <div className="divide-y divide-surface-100 dark:divide-gray-700 max-h-72 overflow-y-auto">
            {loadingStudents ? (
              <div className="p-8 text-center text-sm text-surface-400">Loading students...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-sm text-surface-400">No students found.</div>
            ) : (
              filtered.map(s => (
                <label key={s.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-surface-50 dark:hover:bg-gray-700/30 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggleStudent(s.id)}
                    className="rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                  />
                  <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-xs font-bold text-brand-700 dark:text-brand-300">
                    {s.firstName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.firstName} {s.lastName}</div>
                    <div className="text-xs text-surface-400">
                      {s.class ? `Grade ${s.class.grade}${s.class.section ?? ''}` : ''}{s.admissionNo ? ` · ${s.admissionNo}` : ''}
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>
      )}

      {/* Start Button */}
      <button
        onClick={startRide}
        disabled={saving || !routeId || selected.size === 0}
        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-lg rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-none transition-all flex items-center justify-center gap-3"
      >
        <BusIcon size={22} />
        {saving ? 'Creating Ride...' : `Assign ${selected.size} Student${selected.size !== 1 ? 's' : ''} & Start`}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RIDES DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

function RidesDashboard({ role, onOpenRide, refresh }: {
  role: string; onOpenRide: (ride: Ride) => void; refresh: number;
}) {
  const [rides, setRides]     = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sp = filter ? `?status=${filter}&limit=30` : '?limit=30';
      const res = await fetch(`/api/transport/rides${sp}`, { headers: headers() });
      const data = await res.json();
      setRides(data.rides ?? []);
    } catch {}
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load, refresh]);

  const activeRides = rides.filter(r => r.status === 'active');
  const pendingRides = rides.filter(r => r.status === 'pending');
  const otherRides = rides.filter(r => !['active', 'pending'].includes(r.status));

  function RideCard({ r }: { r: Ride }) {
    return (
      <button
        onClick={() => onOpenRide(r)}
        className="card p-4 text-left w-full hover:shadow-md transition-shadow space-y-2"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="text-blue-500 dark:text-blue-400"><BusIcon size={18} /></div>
            <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{r.route.name}</span>
          </div>
          <span className={statusBadge(r.status)}>{r.status}</span>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-surface-400">
          <span className="capitalize">{r.direction}</span>
          {r.bus && <span>Bus {r.bus.busNumber}</span>}
          <span>{(r._count?.rideStudents ?? r.rideStudents?.length ?? 0)} students</span>
          {r.departureTime && <span>Departed {new Date(r.departureTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>}
          {r.emergencyContact && <span>Emergency: {r.emergencyContact}</span>}
        </div>
        <div className="text-xs text-surface-400">
          By {r.employee.firstName} {r.employee.lastName} · {new Date(r.createdAt).toLocaleDateString('en-IN')}
        </div>
      </button>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['', 'active', 'pending', 'completed', 'cancelled'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === s ? 'bg-brand-600 text-white' : 'bg-surface-100 dark:bg-gray-700 text-surface-500 dark:text-gray-400 hover:bg-surface-200'}`}
          >
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="card p-4 animate-pulse h-20 bg-surface-50 dark:bg-gray-800" />)}
        </div>
      ) : rides.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <div className="text-blue-400 flex justify-center"><BusIcon size={40} /></div>
          <p className="font-semibold text-gray-900 dark:text-gray-100">No rides found</p>
          <p className="text-sm text-surface-400">Start a new ride from the "Start Ride" tab.</p>
        </div>
      ) : (
        <>
          {activeRides.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Active Rides</h3>
              {activeRides.map(r => <RideCard key={r.id} r={r} />)}
            </div>
          )}
          {pendingRides.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 uppercase tracking-wider">Pending</h3>
              {pendingRides.map(r => <RideCard key={r.id} r={r} />)}
            </div>
          )}
          {otherRides.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">History</h3>
              {otherRides.map(r => <RideCard key={r.id} r={r} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

function RoutesManager() {
  const [routes, setRoutes]   = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<Route | null>(null);
  const [form, setForm]         = useState({ name: '', driverName: '', driverPhone: '', vehicleNo: '', capacity: '', morningDeparture: '', eveningDeparture: '', stopsRaw: '' });
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetch('/api/transport', { headers: headers() }).then(r => r.json());
      setRoutes(data.routes ?? []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openEdit(r: Route) {
    setEditing(r);
    setForm({
      name: r.name, driverName: r.driverName ?? '', driverPhone: r.driverPhone ?? '',
      vehicleNo: r.vehicleNo ?? '', capacity: r.capacity != null ? String(r.capacity) : '',
      morningDeparture: r.morningDeparture ?? '', eveningDeparture: r.eveningDeparture ?? '',
      stopsRaw: Array.isArray(r.stops) ? r.stops.map((s: Stop) => s.time ? `${s.name} (${s.time})` : s.name).join('\n') : '',
    });
    setShowForm(true);
  }

  function parseStops(raw: string): Stop[] {
    return raw.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
      const m = l.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
      return m ? { name: m[1].trim(), time: m[2].trim() } : { name: l };
    });
  }

  async function save() {
    if (!form.name.trim()) { setError('Route name required'); return; }
    setSaving(true); setError('');
    try {
      const body = {
        ...(editing ? { id: editing.id } : {}),
        name: form.name, driverName: form.driverName || null, driverPhone: form.driverPhone || null,
        vehicleNo: form.vehicleNo || null, capacity: form.capacity ? Number(form.capacity) : null,
        morningDeparture: form.morningDeparture || null, eveningDeparture: form.eveningDeparture || null,
        stops: form.stopsRaw.trim() ? parseStops(form.stopsRaw) : null,
      };
      const res = await fetch('/api/transport', { method: editing ? 'PATCH' : 'POST', headers: headers(), body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Save failed');
      await load();
      setShowForm(false);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function deleteRoute(id: string) {
    try {
      const res = await fetch(`/api/transport?id=${id}`, { method: 'DELETE', headers: headers() });
      if (!res.ok) throw new Error('Delete failed');
      setRoutes(prev => prev.filter(r => r.id !== id));
    } catch (e: any) { setError(e.message); }
    finally { setDeleteId(null); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Routes</h3>
        <button onClick={() => { setEditing(null); setForm({ name:'',driverName:'',driverPhone:'',vehicleNo:'',capacity:'',morningDeparture:'',eveningDeparture:'',stopsRaw:'' }); setShowForm(true); }} className="btn btn-primary text-sm">+ Add Route</button>
      </div>
      {error && <div className="text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-950/40 rounded-xl">{error}<button className="ml-2 underline" onClick={()=>setError('')}>Dismiss</button></div>}
      {loading ? <div className="text-sm text-surface-400">Loading...</div> : routes.length === 0 ? <div className="card p-8 text-center text-sm text-surface-400">No routes configured.</div> : (
        <div className="space-y-2">
          {routes.map(r => {
            const stops: Stop[] = Array.isArray(r.stops) ? r.stops : [];
            const isOpen = expanded === r.id;
            return (
              <div key={r.id} className="card overflow-hidden">
                <button className="w-full text-left p-4 flex items-center justify-between hover:bg-surface-50 dark:hover:bg-gray-700/30" onClick={() => setExpanded(isOpen ? null : r.id)}>
                  <div>
                    <div className="font-medium text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      {r.name}
                      {r.vehicleNo && <span className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-1.5 rounded">{r.vehicleNo}</span>}
                    </div>
                    <div className="text-xs text-surface-400 mt-0.5">
                      {r.driverName ?? 'No driver'} · {stops.length} stops
                      {r.morningDeparture && ` · AM ${r.morningDeparture}`}
                      {r.eveningDeparture && ` · PM ${r.eveningDeparture}`}
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-surface-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                {isOpen && (
                  <div className="border-t border-surface-100 dark:border-gray-700 p-4 space-y-3">
                    {stops.length > 0 && (
                      <div className="relative pl-4 space-y-1.5">
                        <div className="absolute left-1.5 top-1 bottom-1 w-px bg-surface-200 dark:bg-gray-700" />
                        {stops.map((s, i) => (
                          <div key={i} className="relative flex items-center gap-2">
                            <div className="absolute -left-2.5 w-2 h-2 rounded-full bg-brand-500 border-2 border-white dark:border-gray-800" />
                            <span className="text-xs text-gray-900 dark:text-gray-100 pl-2">{s.name}</span>
                            {s.time && <span className="text-xs text-surface-400 ml-auto">{s.time}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <button onClick={() => openEdit(r)} className="btn btn-secondary text-xs">Edit</button>
                      {deleteId === r.id ? (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-surface-400">Delete?</span>
                          <button onClick={() => deleteRoute(r.id)} className="text-red-500 font-medium hover:underline">Yes</button>
                          <button onClick={() => setDeleteId(null)} className="text-surface-400 hover:underline">No</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteId(r.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Route Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-surface-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 dark:border-gray-700">
              <h3 className="font-display font-bold text-gray-900 dark:text-gray-100">{editing ? 'Edit Route' : 'Add Route'}</h3>
              <button onClick={() => setShowForm(false)} className="text-surface-400 hover:text-gray-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-3">
              {error && <div className="text-xs text-red-600 p-2 bg-red-50 rounded-lg">{error}</div>}
              <div><label className="label">Route Name *</label><input className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Route A – North"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Driver Name</label><input className="input" value={form.driverName} onChange={e=>setForm(f=>({...f,driverName:e.target.value}))} placeholder="Full name"/></div>
                <div><label className="label">Driver Phone</label><input className="input" value={form.driverPhone} onChange={e=>setForm(f=>({...f,driverPhone:e.target.value}))} placeholder="+91 XXXXX"/></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Vehicle No.</label><input className="input" value={form.vehicleNo} onChange={e=>setForm(f=>({...f,vehicleNo:e.target.value}))} placeholder="MH01AB1234"/></div>
                <div><label className="label">Capacity</label><input className="input" type="number" value={form.capacity} onChange={e=>setForm(f=>({...f,capacity:e.target.value}))} placeholder="40"/></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Morning Departure</label><input className="input" value={form.morningDeparture} onChange={e=>setForm(f=>({...f,morningDeparture:e.target.value}))} placeholder="07:00"/></div>
                <div><label className="label">Evening Departure</label><input className="input" value={form.eveningDeparture} onChange={e=>setForm(f=>({...f,eveningDeparture:e.target.value}))} placeholder="16:30"/></div>
              </div>
              <div>
                <label className="label">Stops (one per line, optional time in parentheses)</label>
                <textarea className="input min-h-[80px] text-xs font-mono" value={form.stopsRaw} onChange={e=>setForm(f=>({...f,stopsRaw:e.target.value}))} placeholder={"Main Gate (07:05)\nCity Square (07:20)\nSchool (07:45)"}/>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-surface-100 dark:border-gray-700 flex gap-3 justify-end">
              <button className="btn btn-ghost" onClick={()=>setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Saving…':editing?'Save Changes':'Create Route'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BUSES MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

function BusesManager() {
  const [buses, setBuses]     = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<Bus | null>(null);
  const [form, setForm]         = useState({ busNumber: '', capacity: '', gpsEnabled: false, gpsDeviceId: '' });
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await fetch('/api/transport/buses', { headers: headers() }).then(r=>r.json()); setBuses(d.buses??[]); }
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!form.busNumber.trim()) { setError('Bus number required'); return; }
    setSaving(true); setError('');
    try {
      const body = { ...(editing ? { id: editing.id } : {}), busNumber: form.busNumber, capacity: form.capacity ? Number(form.capacity) : null, gpsEnabled: form.gpsEnabled, gpsDeviceId: form.gpsDeviceId || null };
      const res = await fetch('/api/transport/buses', { method: editing ? 'PATCH' : 'POST', headers: headers(), body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Save failed');
      await load(); setShowForm(false);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function deactivate(id: string) {
    if (!confirm('Remove this bus?')) return;
    await fetch(`/api/transport/buses?id=${id}`, { method: 'DELETE', headers: headers() });
    setBuses(prev => prev.filter(b => b.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Buses & Vehicles</h3>
        <button onClick={() => { setEditing(null); setForm({ busNumber:'', capacity:'', gpsEnabled:false, gpsDeviceId:'' }); setShowForm(true); }} className="btn btn-primary text-sm">+ Add Bus</button>
      </div>
      {error && <div className="text-sm text-red-600 p-3 bg-red-50 dark:bg-red-950/40 rounded-xl">{error}</div>}
      {loading ? <div className="text-sm text-surface-400">Loading...</div> : buses.length === 0 ? <div className="card p-8 text-center text-sm text-surface-400">No buses added yet.</div> : (
        <div className="space-y-2">
          {buses.map(b => (
            <div key={b.id} className="card p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-500 flex-shrink-0">
                <BusIcon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">Bus {b.busNumber}</div>
                <div className="text-xs text-surface-400">
                  {b.capacity ? `${b.capacity} seats · ` : ''}
                  {b.gpsEnabled ? 'GPS enabled' : 'GPS disabled'}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditing(b); setForm({ busNumber: b.busNumber, capacity: b.capacity != null ? String(b.capacity) : '', gpsEnabled: b.gpsEnabled, gpsDeviceId: '' }); setShowForm(true); }} className="text-xs text-brand-600 hover:text-brand-700 font-medium">Edit</button>
                <button onClick={() => deactivate(b.id)} className="text-xs text-red-500 hover:underline">Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-surface-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 dark:border-gray-700">
              <h3 className="font-display font-bold text-gray-900 dark:text-gray-100">{editing ? 'Edit Bus' : 'Add Bus'}</h3>
              <button onClick={() => setShowForm(false)} className="text-surface-400 hover:text-gray-600"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && <div className="text-xs text-red-600 p-2 bg-red-50 rounded-lg">{error}</div>}
              <div><label className="label">Bus / Vehicle Number *</label><input className="input" value={form.busNumber} onChange={e=>setForm(f=>({...f,busNumber:e.target.value}))} placeholder="Bus 12 / MH01AB1234"/></div>
              <div><label className="label">Capacity (seats)</label><input className="input" type="number" value={form.capacity} onChange={e=>setForm(f=>({...f,capacity:e.target.value}))} placeholder="40"/></div>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-800 dark:text-gray-200">GPS Tracking Enabled</span>
                <div onClick={() => setForm(f=>({...f,gpsEnabled:!f.gpsEnabled}))} className={`w-10 h-5 rounded-full cursor-pointer relative transition-colors ${form.gpsEnabled ? 'bg-brand-500' : 'bg-surface-300 dark:bg-gray-600'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.gpsEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
              </label>
              {form.gpsEnabled && <div><label className="label">GPS Device ID</label><input className="input" value={form.gpsDeviceId} onChange={e=>setForm(f=>({...f,gpsDeviceId:e.target.value}))} placeholder="Device serial / IMEI"/></div>}
            </div>
            <div className="px-6 py-4 border-t border-surface-100 dark:border-gray-700 flex gap-3 justify-end">
              <button className="btn btn-ghost" onClick={()=>setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Saving…':editing?'Save':'Add Bus'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PARENT VIEW
// ─────────────────────────────────────────────────────────────────────────────

function ParentTransportView() {
  const [items, setItems]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/transport/rides', { headers: headers() })
      .then(r => r.json())
      .then(d => setItems(d.rideStudents ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-surface-400 p-8 text-center">Loading...</div>;
  if (items.length === 0) return <div className="card p-12 text-center space-y-2"><div className="text-blue-400 flex justify-center"><BusIcon size={36} /></div><p className="font-semibold text-gray-900 dark:text-gray-100">No transport rides</p><p className="text-sm text-surface-400">Your child has not been assigned to any bus rides yet.</p></div>;

  return (
    <div className="space-y-4">
      {items.map((rs: any, i: number) => {
        const ride: Ride = rs.ride;
        const student = rs.student;
        return (
          <div key={i} className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">{ride.route.name}</div>
                <div className="text-xs text-surface-400">{student.firstName} {student.lastName} · {ride.direction}</div>
              </div>
              <span className={statusBadge(ride.status)}>{ride.status}</span>
            </div>
            {ride.status === 'active' && (
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-4 py-3">
                <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Bus is on the way</div>
                {ride.departureTime && <div className="text-xs text-emerald-600 dark:text-emerald-400">Departed at {new Date(ride.departureTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>}
                {ride.emergencyContact && <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Emergency: {ride.emergencyContact}</div>}
              </div>
            )}
            {ride.bus && ride.bus.gpsEnabled && ride.status === 'active' && (
              <div className="text-xs text-brand-600 font-medium">GPS tracking active</div>
            )}
            <div className="flex gap-3 text-xs text-surface-400">
              {ride.bus && <span>Bus: {ride.bus.busNumber}</span>}
              {ride.emergencyContact && <span>Emergency: {ride.emergencyContact}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function TransportPage() {
  const [role,   setRole]   = useState<string | null>(null);
  const [tab,    setTab]    = useState<'dashboard' | 'start' | 'routes' | 'buses'>('dashboard');
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try { const u = JSON.parse(userData); setRole(u.primaryRole); } catch {}
    }
  }, []);

  const isAdmin   = role === 'super_admin' || role === 'school_admin' || role === 'principal';
  const isTeacher = role === 'teacher' || role === 'employee' || role === 'hod';
  const isParent  = role === 'parent';

  if (isParent) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Transport</h1>
          <p className="text-sm text-surface-400 mt-0.5">Track your child's bus status.</p>
        </div>
        <ParentTransportView />
      </div>
    );
  }

  if (activeRide) {
    return (
      <div className="animate-fade-in">
        <ActiveRideView
          ride={activeRide}
          onBack={() => setActiveRide(null)}
          onRefresh={() => setRefresh(r => r + 1)}
        />
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'start', label: 'Start Ride' },
    ...(isAdmin ? [{ id: 'routes', label: 'Routes' }, { id: 'buses', label: 'Buses' }] : []),
  ] as { id: typeof tab; label: string }[];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Transport</h1>
        <p className="text-sm text-surface-400 mt-0.5">
          {isAdmin ? 'Manage routes, buses, and monitor all rides.' : 'Start a ride and track students.'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-surface-200 dark:border-gray-700">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t.id ? 'border-brand-600 text-brand-600 dark:text-brand-400' : 'border-transparent text-surface-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && (
        <RidesDashboard
          role={role ?? ''}
          onOpenRide={r => setActiveRide(r)}
          refresh={refresh}
        />
      )}
      {tab === 'start' && (
        <StartRideFlow
          onCreated={r => { setActiveRide(r); setTab('dashboard'); setRefresh(n => n + 1); }}
        />
      )}
      {tab === 'routes' && isAdmin && <RoutesManager />}
      {tab === 'buses'  && isAdmin && <BusesManager />}
    </div>
  );
}
