'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [current,  setCurrent]  = useState('');
  const [newPass,  setNewPass]  = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [isMust,   setIsMust]   = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (!raw) { router.push('/login'); return; }
    const user = JSON.parse(raw);
    setIsMust(!!user.mustResetPassword);
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 8) return setError('New password must be at least 8 characters');
    if (newPass !== confirm) return setError('Passwords do not match');
    setSaving(true); setError('');

    const token = localStorage.getItem('token');
    const res = await fetch('/api/auth/change-password', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ currentPassword: current, newPassword: newPass }),
    });

    if (!res.ok) {
      const d = await res.json();
      setError(d.error || 'Failed to change password');
      setSaving(false);
      return;
    }

    // Update stored user flag
    const raw = localStorage.getItem('user');
    if (raw) {
      const user = JSON.parse(raw);
      user.mustResetPassword = false;
      localStorage.setItem('user', JSON.stringify(user));
    }
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white shadow-glow-brand">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
          </div>
          <span className="font-display font-bold text-xl text-brand-800 dark:text-brand-300">Yulaa</span>
        </div>

        <div className="card p-8 space-y-6">
          <div>
            <h1 className="text-xl font-display font-bold text-gray-900 dark:text-gray-100">
              {isMust ? 'Set Your Password' : 'Change Password'}
            </h1>
            {isMust && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-1 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 rounded-lg">
                For security, please set a new password before continuing.
                {' '}Your current password is your registered phone number.
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Current Password</label>
              <input type="password" className="input-field" required value={current} onChange={e => setCurrent(e.target.value)} placeholder={isMust ? 'Your phone number' : ''}/>
            </div>
            <div>
              <label className="label">New Password</label>
              <input type="password" className="input-field" required minLength={8} value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="At least 8 characters"/>
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input type="password" className="input-field" required value={confirm} onChange={e => setConfirm(e.target.value)}/>
            </div>
            <button type="submit" disabled={saving} className="btn-primary w-full">
              {saving ? 'Saving…' : 'Set New Password'}
            </button>
            {!isMust && (
              <button type="button" onClick={() => router.back()} className="btn-secondary w-full">Cancel</button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
