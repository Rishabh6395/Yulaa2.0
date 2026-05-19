'use client';

import { useEffect, useState, useCallback } from 'react';

type PunchStatus = {
  punchEnabled: boolean;
  punchedIn:    boolean;
  punchedOut:   boolean;
  punchInTime:  string | null;
  punchOutTime: string | null;
};

const EMPLOYEE_ROLES = ['teacher', 'school_admin', 'principal', 'hod', 'employee'];

function fmt(t: string | null) {
  if (!t) return '';
  return new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function PunchPopup() {
  const [status,  setStatus]  = useState<PunchStatus | null>(null);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!EMPLOYEE_ROLES.includes(payload.primaryRole || '')) return;
    } catch { return; }

    try {
      const res = await fetch('/api/attendance/punch-status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data: PunchStatus = await res.json();
      setStatus(data);
      if (data.punchEnabled) setVisible(true);
    } catch { /* ignore network errors */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!visible || !status) return null;

  const close = () => setVisible(false);

  const punch = async (action: 'punch_in' | 'punch_out') => {
    setLoading(true);
    setMessage('');
    const token = localStorage.getItem('token');
    const url   = action === 'punch_in' ? '/api/attendance/checkin' : '/api/attendance/checkout';
    try {
      const res  = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        setMessage(action === 'punch_in' ? 'Punched in! Have a great day.' : 'Punched out successfully!');
        // Refresh status after punch
        const statusRes = await fetch('/api/attendance/punch-status', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (statusRes.ok) setStatus(await statusRes.json());
      } else {
        setMessage(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setMessage('Network error. Please try again.');
    }
    setLoading(false);
  };

  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-display font-bold text-gray-900 dark:text-gray-100">Mark Attendance</h2>
            <p className="text-xs text-surface-400 mt-0.5">{dateStr}</p>
          </div>
          <button
            onClick={close}
            className="text-surface-400 hover:text-surface-600 dark:hover:text-gray-300 transition-colors text-xl leading-none mt-0.5"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Status cards */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className={`rounded-xl p-3 border transition-colors ${status.punchedIn ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' : 'bg-surface-50 dark:bg-gray-800 border-surface-100 dark:border-gray-700'}`}>
            <div className="text-2xl mb-1">{status.punchedIn ? '✅' : '🕐'}</div>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Punch In</p>
            <p className="text-xs text-surface-400 mt-0.5">
              {status.punchedIn ? fmt(status.punchInTime) : 'Not done yet'}
            </p>
          </div>
          <div className={`rounded-xl p-3 border transition-colors ${status.punchedOut ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' : 'bg-surface-50 dark:bg-gray-800 border-surface-100 dark:border-gray-700'}`}>
            <div className="text-2xl mb-1">{status.punchedOut ? '✅' : '🕐'}</div>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Punch Out</p>
            <p className="text-xs text-surface-400 mt-0.5">
              {status.punchedOut ? fmt(status.punchOutTime) : 'Not done yet'}
            </p>
          </div>
        </div>

        {/* Feedback message */}
        {message && (
          <p className={`text-xs text-center font-medium px-2 ${message.includes('successfully') || message.includes('great day') ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
            {message}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          {/* Punch In — disabled + message if already done */}
          {status.punchedIn ? (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-50 dark:bg-gray-800 border border-surface-100 dark:border-gray-700 text-xs text-surface-400">
              <span className="text-emerald-500">✓</span>
              <span>Punched in at {fmt(status.punchInTime)}</span>
            </div>
          ) : (
            <button
              onClick={() => punch('punch_in')}
              disabled={loading}
              className="btn btn-primary w-full"
            >
              {loading ? 'Recording...' : '⏱ Punch In — I\'m here!'}
            </button>
          )}

          {/* Punch Out — always available after punch in; show even if not yet punched in */}
          <button
            onClick={() => punch('punch_out')}
            disabled={loading}
            className={`btn w-full ${status.punchedIn ? 'btn-secondary' : 'btn-secondary opacity-70'}`}
          >
            {loading ? 'Recording...' : status.punchedOut ? `🚪 Update Punch Out (last: ${fmt(status.punchOutTime)})` : '🚪 Punch Out'}
          </button>

          <button
            onClick={close}
            className="text-xs text-surface-400 hover:text-surface-600 dark:hover:text-gray-300 transition-colors py-1 text-center"
          >
            Skip / Close
          </button>
        </div>

        {status.punchedOut && (
          <p className="text-[11px] text-center text-surface-400">
            You can punch out multiple times — only your last punch-out is recorded.
          </p>
        )}
      </div>
    </div>
  );
}
