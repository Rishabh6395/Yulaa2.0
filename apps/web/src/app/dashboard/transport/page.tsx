'use client';

import { useState, useEffect, useCallback } from 'react';

interface Stop {
  name: string;
  time?: string;
}

interface Route {
  id: string;
  name: string;
  driverName: string | null;
  driverPhone: string | null;
  vehicleNo: string | null;
  capacity: number | null;
  morningDeparture: string | null;
  eveningDeparture: string | null;
  stops: Stop[] | null;
  createdAt: string;
}

const EMPTY_FORM = {
  name: '',
  driverName: '',
  driverPhone: '',
  vehicleNo: '',
  capacity: '',
  morningDeparture: '',
  eveningDeparture: '',
  stopsRaw: '',
};

export default function TransportPage() {
  const [routes, setRoutes]         = useState<Route[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState<Route | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm]             = useState({ ...EMPTY_FORM });
  const [deleteId, setDeleteId]     = useState<string | null>(null);

  const fetchRoutes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/transport');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load');
      setRoutes(data.routes ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRoutes(); }, [fetchRoutes]);

  function openAdd() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  }

  function openEdit(r: Route) {
    setEditing(r);
    setForm({
      name:             r.name,
      driverName:       r.driverName       ?? '',
      driverPhone:      r.driverPhone      ?? '',
      vehicleNo:        r.vehicleNo        ?? '',
      capacity:         r.capacity != null ? String(r.capacity) : '',
      morningDeparture: r.morningDeparture ?? '',
      eveningDeparture: r.eveningDeparture ?? '',
      stopsRaw: Array.isArray(r.stops)
        ? r.stops.map((s: Stop) => s.time ? `${s.name} (${s.time})` : s.name).join('\n')
        : '',
    });
    setShowModal(true);
  }

  function parseStops(raw: string): Stop[] {
    return raw
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const m = line.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
        return m ? { name: m[1].trim(), time: m[2].trim() } : { name: line };
      });
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Route name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const body = {
        ...(editing ? { id: editing.id } : {}),
        name:             form.name,
        driverName:       form.driverName       || null,
        driverPhone:      form.driverPhone       || null,
        vehicleNo:        form.vehicleNo        || null,
        capacity:         form.capacity         ? Number(form.capacity) : null,
        morningDeparture: form.morningDeparture || null,
        eveningDeparture: form.eveningDeparture || null,
        stops:            form.stopsRaw.trim() ? parseStops(form.stopsRaw) : null,
      };
      const res = await fetch('/api/transport', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Save failed');
      await fetchRoutes();
      setShowModal(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/transport?id=${id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      setRoutes(prev => prev.filter(r => r.id !== id));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeleteId(null);
    }
  }

  function field(label: string, key: keyof typeof form, opts?: { type?: string; placeholder?: string; hint?: string }) {
    return (
      <div>
        <label className="block text-xs font-medium text-surface-500 dark:text-gray-400 mb-1">{label}</label>
        <input
          type={opts?.type ?? 'text'}
          className="input w-full"
          placeholder={opts?.placeholder}
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        />
        {opts?.hint && <p className="text-xs text-surface-400 mt-1">{opts.hint}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Transport</h1>
          <p className="text-sm text-surface-400 mt-0.5">Manage bus routes, drivers, and stops</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Route</button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
          <button className="ml-3 underline" onClick={() => setError('')}>Dismiss</button>
        </div>
      )}

      {/* Route list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-surface-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
              <div className="h-3 bg-surface-100 dark:bg-gray-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : routes.length === 0 ? (
        <div className="card p-12 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-blue-400">
              <path d="M8 6v6M15 6v6M2 12h19.6M18 18h2a1 1 0 0 0 1-1v-5H3v5a1 1 0 0 0 1 1h2"/>
              <path d="M4 12V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5"/>
              <circle cx="7" cy="18" r="1.5"/><circle cx="17" cy="18" r="1.5"/>
            </svg>
          </div>
          <div>
            <p className="text-lg font-display font-bold text-gray-900 dark:text-gray-100">No routes yet</p>
            <p className="text-sm text-surface-400 mt-1">Add your first bus route to get started.</p>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Route</button>
        </div>
      ) : (
        <div className="space-y-3">
          {routes.map(r => {
            const isOpen = expandedId === r.id;
            const stops: Stop[] = Array.isArray(r.stops) ? r.stops : [];
            return (
              <div key={r.id} className="card overflow-hidden">
                <button
                  className="w-full text-left p-5 flex items-start justify-between gap-4 hover:bg-surface-50 dark:hover:bg-gray-700/30 transition-colors"
                  onClick={() => setExpandedId(isOpen ? null : r.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{r.name}</span>
                      {r.vehicleNo && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-medium border border-blue-200 dark:border-blue-800">
                          {r.vehicleNo}
                        </span>
                      )}
                      {r.capacity && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-100 dark:bg-gray-700 text-surface-500 dark:text-gray-400 text-xs">
                          {r.capacity} seats
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-surface-400">
                      {r.driverName  && <span>Driver: {r.driverName}</span>}
                      {r.driverPhone && <span>{r.driverPhone}</span>}
                      {r.morningDeparture && <span>AM: {r.morningDeparture}</span>}
                      {r.eveningDeparture && <span>PM: {r.eveningDeparture}</span>}
                      {stops.length > 0 && <span>{stops.length} stop{stops.length !== 1 ? 's' : ''}</span>}
                    </div>
                  </div>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className={`mt-1 flex-shrink-0 text-surface-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {isOpen && (
                  <div className="border-t border-surface-100 dark:border-gray-700 px-5 py-4 space-y-4">
                    {/* Stops */}
                    {stops.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">Stops</p>
                        <div className="relative pl-4">
                          {/* vertical line */}
                          <div className="absolute left-1.5 top-1 bottom-1 w-px bg-surface-200 dark:bg-gray-700" />
                          {stops.map((s, i) => (
                            <div key={i} className="relative flex items-center gap-3 mb-2 last:mb-0">
                              <div className="absolute -left-2.5 w-2.5 h-2.5 rounded-full bg-brand-500 border-2 border-white dark:border-gray-800 flex-shrink-0" />
                              <span className="text-sm text-gray-900 dark:text-gray-100 pl-2">{s.name}</span>
                              {s.time && <span className="text-xs text-surface-400 ml-auto">{s.time}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        className="btn btn-secondary text-sm"
                        onClick={() => openEdit(r)}
                      >
                        Edit Route
                      </button>
                      {deleteId === r.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-surface-400">Delete?</span>
                          <button className="text-xs text-red-500 font-medium hover:underline" onClick={() => handleDelete(r.id)}>Yes</button>
                          <button className="text-xs text-surface-400 hover:underline" onClick={() => setDeleteId(null)}>No</button>
                        </div>
                      ) : (
                        <button
                          className="text-sm text-red-500 dark:text-red-400 hover:underline"
                          onClick={() => setDeleteId(r.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-surface-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 dark:border-gray-700">
              <h2 className="text-lg font-display font-bold text-gray-900 dark:text-gray-100">
                {editing ? 'Edit Route' : 'Add Route'}
              </h2>
              <button
                className="text-surface-400 hover:text-gray-600 dark:hover:text-gray-300"
                onClick={() => setShowModal(false)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              {field('Route Name *', 'name', { placeholder: 'e.g. Route A – North Side' })}

              <div className="grid grid-cols-2 gap-3">
                {field('Driver Name', 'driverName', { placeholder: 'Full name' })}
                {field('Driver Phone', 'driverPhone', { placeholder: '+91 XXXXX XXXXX' })}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {field('Vehicle No.', 'vehicleNo', { placeholder: 'MH01AB1234' })}
                {field('Capacity (seats)', 'capacity', { type: 'number', placeholder: '40' })}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {field('Morning Departure', 'morningDeparture', { placeholder: '07:00' })}
                {field('Evening Departure', 'eveningDeparture', { placeholder: '16:30' })}
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-500 dark:text-gray-400 mb-1">Stops</label>
                <textarea
                  className="input w-full min-h-[100px] resize-y font-mono text-xs"
                  placeholder={"One stop per line.\nOptionally add time in parentheses:\nMain Gate (07:05)\nCity Square (07:20)"}
                  value={form.stopsRaw}
                  onChange={e => setForm(f => ({ ...f, stopsRaw: e.target.value }))}
                />
                <p className="text-xs text-surface-400 mt-1">Format: Stop Name (HH:MM) — time is optional</p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-surface-100 dark:border-gray-700 flex gap-3 justify-end">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Route'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
