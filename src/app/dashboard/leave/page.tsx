'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { useApi } from '@/hooks/useApi';

export default function LeavePage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm]   = useState({ leave_type: 'sick', start_date: '', end_date: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [activeChild, setActiveChild] = useState<any>(null);

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const user    = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
  const isAdmin  = ['school_admin', 'super_admin'].includes(user.primaryRole);
  const isParent = user.primaryRole === 'parent';

  // Load active child for parent
  useEffect(() => {
    if (!isParent) return;
    const stored = localStorage.getItem('activeChild');
    if (stored) setActiveChild(JSON.parse(stored));
  }, [isParent]);

  useEffect(() => {
    const handler = (e: Event) => setActiveChild((e as CustomEvent).detail);
    window.addEventListener('activeChildChanged', handler);
    return () => window.removeEventListener('activeChildChanged', handler);
  }, []);

  const { data, isLoading, mutate } = useApi<{ leaves: any[] }>('/api/leave');
  const leaves = data?.leaves ?? [];

  const handleApproval = async (id: string, status: string) => {
    await fetch('/api/leave', { method: 'PATCH', headers, body: JSON.stringify({ id, status }) });
    mutate();
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      const payload: any = { ...form };
      if (isParent && activeChild) payload.student_id = activeChild.id;
      const res = await fetch('/api/leave', { method: 'POST', headers, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.error || 'Failed to submit leave request'); setSaving(false); return; }
      setShowAddModal(false);
      setForm({ leave_type: 'sick', start_date: '', end_date: '', reason: '' });
      setSaveError('');
      mutate();
    } catch {
      setSaveError('Network error. Please try again.');
    }
    setSaving(false);
  };

  const statusMap: Record<string, string> = { pending: 'badge-warning', approved: 'badge-success', rejected: 'badge-danger' };
  const typeMap:   Record<string, string> = { sick: '🤒', personal: '👤', family: '👨‍👩‍👧', vacation: '✈️', other: '📋' };

  // Parent must have an active child selected
  if (isParent && !activeChild) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-3">
        <p className="text-gray-900 dark:text-gray-100 font-semibold">No child selected</p>
        <p className="text-sm text-surface-400">Select a child from the top bar to apply or view leave.</p>
      </div>
    );
  }

  const childName = activeChild ? `${activeChild.first_name} ${activeChild.last_name}` : '';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Leave Requests</h1>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">
            {isParent ? `Leave applications for ${childName}` : 'Manage leave applications'}
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {isParent ? `Apply Leave for ${childName}` : 'Apply Leave'}
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Requester</th>
                {!isParent && <th>Student</th>}
                <th>Type</th>
                <th>Duration</th>
                <th>Reason</th>
                <th>Status</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: isAdmin ? 7 : 6 }).map((_, j) => (
                    <td key={j}><div className="h-4 bg-surface-100 rounded animate-pulse w-16"/></td>
                  ))}</tr>
                ))
              ) : leaves.length === 0 ? (
                <tr><td colSpan={isAdmin ? 7 : 6} className="text-center py-8 text-surface-400">No leave requests</td></tr>
              ) : leaves.map((l) => (
                <tr key={l.id}>
                  <td className="font-medium text-gray-900 dark:text-gray-100">{l.requester_name}</td>
                  {!isParent && <td>{l.student_name || '—'}</td>}
                  <td>
                    <span className="flex items-center gap-1.5 text-sm">
                      {typeMap[l.leave_type] || '📋'} <span className="capitalize">{l.leave_type}</span>
                    </span>
                  </td>
                  <td className="text-xs">
                    {new Date(l.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – {new Date(l.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </td>
                  <td className="text-xs text-surface-400 max-w-[200px] truncate">{l.reason || '—'}</td>
                  <td><span className={statusMap[l.status]}>{l.status}</span></td>
                  {isAdmin && (
                    <td>
                      {l.status === 'pending' && (
                        <div className="flex gap-1.5">
                          <button onClick={() => handleApproval(l.id, 'approved')} className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg hover:bg-emerald-100 font-medium transition-colors">Approve</button>
                          <button onClick={() => handleApproval(l.id, 'rejected')} className="text-xs bg-red-50 text-red-700 px-2.5 py-1 rounded-lg hover:bg-red-100 font-medium transition-colors">Reject</button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title={isParent ? `Apply Leave for ${childName}` : 'Apply for Leave'}>
        <form onSubmit={handleAdd} className="space-y-4">
          {isParent && activeChild && (
            <div className="p-3 rounded-xl bg-brand-50 dark:bg-brand-950/40 border border-brand-100 dark:border-brand-900">
              <p className="text-xs text-brand-600 dark:text-brand-400 font-medium">
                Applying leave for: <span className="font-bold">{childName}</span>
              </p>
            </div>
          )}
          <div>
            <label className="label">Leave Type</label>
            <select className="input-field" value={form.leave_type} onChange={e => setForm({...form, leave_type: e.target.value})}>
              <option value="sick">Sick Leave</option>
              <option value="personal">Personal</option>
              <option value="family">Family</option>
              <option value="vacation">Vacation</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date *</label>
              <input type="date" className="input-field" required value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})}/>
            </div>
            <div>
              <label className="label">End Date *</label>
              <input type="date" className="input-field" required value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})}/>
            </div>
          </div>
          <div>
            <label className="label">Reason</label>
            <textarea className="input-field" rows={3} value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} placeholder="Reason for leave..."/>
          </div>
          {saveError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{saveError}</p>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Submitting...' : 'Submit'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
