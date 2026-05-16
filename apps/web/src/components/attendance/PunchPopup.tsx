'use client';

import { useEffect, useState, useCallback } from 'react';

type PunchStatus = {
  punchEnabled: boolean;
  punchedIn:    boolean;
  punchedOut:   boolean;
  punchInTime:  string | null;
  punchOutTime: string | null;
};

const EMPLOYEE_ROLES = ['teacher', 'school_admin', 'principal', 'hod'];
const SKIP_KEY = 'punch_popup_skipped_date';

function fmt(t: string | null) {
  if (!t) return '';
  return new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function PunchPopup() {
  const [status,   setStatus]   = useState<PunchStatus | null>(null);
  const [visible,  setVisible]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [message,  setMessage]  = useState('');
  const [role,     setRole]     = useState('');

  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const r = payload.primaryRole || '';
      setRole(r);
      if (!EMPLOYEE_ROLES.includes(r)) return;
    } catch { return; }

    // Don't show if already skipped today
    if (localStorage.getItem(SKIP_KEY) === today) return;

    const token2 = localStorage.getItem('token');
    const res = await fetch('/api/attendance/punch-status', {
      headers: { Authorization: `Bearer ${token2}` },
    });
    if (!res.ok) return;
    const data: PunchStatus = await res.json();
    setStatus(data);
    if (data.punchEnabled) setVisible(true);
  }, [today]);

  useEffect(() => { load(); }, [load]);

  if (!visible || !status) return null;

  const skip = () => {
    localStorage.setItem(SKIP_KEY, today);
    setVisible(false);
  };

  const punch = async (action: 'punch_in' | 'punch_out') => {
    setLoading(true);
    setMessage('');
    const token = localStorage.getItem('token');
    const url   = action === 'punch_in' ? '/api/attendance/checkin' : '/api/attendance/checkout';
    const res   = await fetch(url, {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) {
      setMessage(action === 'punch_in' ? 'Punched in successfully!' : 'Punched out successfully!');
      // Refresh status
      const statusRes = await fetch('/api/attendance/punch-status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (statusRes.ok) setStatus(await statusRes.json());
    } else {
      setMessage(data.error || 'Something went wrong.');
    }
    setLoading(false);
  };

  const canPunchIn  = !status.punchedIn;
  const canPunchOut = status.punchedIn;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-display font-bold text-gray-900 dark:text-gray-100">Mark Attendance</h2>
            <p className="text-xs text-surface-400 mt-0.5">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <button
            onClick={skip}
            className="text-surface-400 hover:text-surface-600 dark:hover:text-gray-300 transition-colors text-lg leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Status row */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className={`rounded-xl p-3 border ${status.punchedIn ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' : 'bg-surface-50 dark:bg-gray-800 border-surface-100 dark:border-gray-700'}`}>
            <div className="text-2xl mb-1">{status.punchedIn ? '✅' : '🕐'}</div>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Punch In</p>
            <p className="text-xs text-surface-400 mt-0.5">
              {status.punchedIn ? fmt(status.punchInTime) : 'Not done'}
            </p>
          </div>
          <div className={`rounded-xl p-3 border ${status.punchedOut ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' : 'bg-surface-50 dark:bg-gray-800 border-surface-100 dark:border-gray-700'}`}>
            <div className="text-2xl mb-1">{status.punchedOut ? '✅' : '🕐'}</div>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Punch Out</p>
            <p className="text-xs text-surface-400 mt-0.5">
              {status.punchedOut ? fmt(status.punchOutTime) : 'Not done'}
            </p>
          </div>
        </div>

        {/* Message */}
        {message && (
          <p className={`text-xs text-center font-medium ${message.includes('successfully') ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
            {message}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {canPunchIn && (
            <button
              onClick={() => punch('punch_in')}
              disabled={loading}
              className="btn btn-primary w-full"
            >
              {loading ? 'Recording...' : '⏱ Punch In — I\'m here!'}
            </button>
          )}
          {canPunchOut && (
            <button
              onClick={() => punch('punch_out')}
              disabled={loading}
              className="btn btn-secondary w-full"
            >
              {loading ? 'Recording...' : '🚪 Punch Out'}
            </button>
          )}
          <button
            onClick={skip}
            className="text-xs text-surface-400 hover:text-surface-600 dark:hover:text-gray-300 transition-colors py-1"
          >
            Skip for today
          </button>
        </div>
      </div>
    </div>
  );
}
