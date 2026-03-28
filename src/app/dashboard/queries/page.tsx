'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useApi } from '@/hooks/useApi';

const REPLY_ROLES   = ['school_admin', 'super_admin', 'hod', 'principal'];
const REOPEN_ROLES  = ['parent', 'student', 'school_admin', 'super_admin', 'hod', 'principal'];

export default function QueriesPage() {
  const [showAddModal,    setShowAddModal]    = useState(false);
  const [showReplyModal,  setShowReplyModal]  = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [selectedQuery,   setSelectedQuery]   = useState<any>(null);
  const [form,     setForm]     = useState({ subject: '', message: '', priority: 'normal' });
  const [reply,    setReply]    = useState('');
  const [reopenComment, setReopenComment] = useState('');
  const [saving,    setSaving]    = useState(false);
  const [replying,  setReplying]  = useState(false);
  const [reopening, setReopening] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const user    = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
  const canReply   = REPLY_ROLES.includes(user.primaryRole);
  const canReopen  = REOPEN_ROLES.includes(user.primaryRole);
  const isSubmitter = ['parent', 'student'].includes(user.primaryRole);

  const { data, isLoading, mutate } = useApi<{ queries: any[] }>('/api/queries');
  const queries = data?.queries ?? [];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/queries', { method: 'POST', headers, body: JSON.stringify(form) });
    if (res.ok) {
      setShowAddModal(false);
      setForm({ subject: '', message: '', priority: 'normal' });
      mutate();
    }
    setSaving(false);
  };

  const openReply = (q: any) => { setSelectedQuery(q); setReply(''); setShowReplyModal(true); };
  const openReopen = (q: any) => { setSelectedQuery(q); setReopenComment(''); setShowReopenModal(true); };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim() || !selectedQuery) return;
    setReplying(true);
    await fetch('/api/queries', {
      method: 'PATCH', headers,
      body: JSON.stringify({ id: selectedQuery.id, response: reply, status: 'in_progress' }),
    });
    setShowReplyModal(false);
    setReply('');
    mutate();
    setReplying(false);
  };

  const handleConfirmResolve = async (q: any) => {
    setConfirming(true);
    await fetch('/api/queries', {
      method: 'PATCH', headers,
      body: JSON.stringify({ action: 'confirm_resolve', id: q.id }),
    });
    mutate();
    setConfirming(false);
  };

  const handleReopen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuery) return;
    setReopening(true);
    await fetch('/api/queries', {
      method: 'PATCH', headers,
      body: JSON.stringify({ action: 'reopen', id: selectedQuery.id, reopen_comment: reopenComment }),
    });
    setShowReopenModal(false);
    setReopenComment('');
    mutate();
    setReopening(false);
  };

  const statusMap:   Record<string, string> = { open: 'badge-warning', in_progress: 'badge-info', resolved: 'badge-success', closed: 'badge-neutral' };
  const priorityMap: Record<string, string> = { low: 'text-surface-400', normal: 'text-blue-600', high: 'text-amber-600', urgent: 'text-red-600' };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Queries & Support</h1>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">Communication with school administration</p>
        </div>
        {!canReply && (
          <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Query
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card p-5 h-20 animate-pulse bg-surface-100"/>)}</div>
      ) : queries.length === 0 ? (
        <div className="card p-12 text-center"><p className="text-surface-400">No queries yet.</p></div>
      ) : (
        <div className="space-y-3">
          {queries.map((q) => {
            const isResolvable = ['resolved', 'closed'].includes(q.status);
            return (
              <div key={q.id} className="card-hover p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{q.subject}</h3>
                      <span className={statusMap[q.status]}>{q.status.replace('_', ' ')}</span>
                      <span className={`text-[10px] font-bold uppercase ${priorityMap[q.priority] ?? priorityMap.normal}`}>{q.priority}</span>
                    </div>
                    <p className="text-sm text-surface-400 line-clamp-2">{q.message}</p>
                    {q.response && (
                      <div className="mt-2 p-2.5 rounded-lg bg-brand-50 dark:bg-brand-950/40 border border-brand-100 dark:border-brand-900">
                        <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 mb-0.5">Admin Reply</p>
                        <p className="text-xs text-gray-700 dark:text-gray-300">{q.response}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-surface-400">
                      <span>By {q.raised_by_name}</span>
                      {q.student_name && <span>Re: {q.student_name}</span>}
                      <span>{new Date(q.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {/* Reply — admin roles only */}
                    {canReply && (
                      <button
                        onClick={() => openReply(q)}
                        className="text-xs bg-brand-50 text-brand-600 border border-brand-200 px-3 py-1.5 rounded-lg hover:bg-brand-100 font-medium transition-colors flex items-center gap-1.5"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 21 1.9-5.7A8.5 8.5 0 1 1 5.8 17.8z"/></svg>
                        Reply
                      </button>
                    )}

                    {/* Confirm Resolved — submitter confirms after admin replies */}
                    {isSubmitter && q.response && q.status === 'in_progress' && (
                      <button
                        onClick={() => handleConfirmResolve(q)}
                        disabled={confirming}
                        className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-100 font-medium transition-colors flex items-center gap-1.5"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>
                        Mark Resolved
                      </button>
                    )}

                    {/* Reopen — for resolved/closed queries, OR when submitter isn't satisfied with in_progress response */}
                    {canReopen && (isResolvable || (isSubmitter && q.response && q.status === 'in_progress')) && (
                      <button
                        onClick={() => openReopen(q)}
                        className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100 font-medium transition-colors flex items-center gap-1.5"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>
                        {isResolvable ? 'Reopen' : 'Not Resolved'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Query Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Raise a Query">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="label">Subject *</label>
            <input className="input-field" required value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} placeholder="What's this about?"/>
          </div>
          <div>
            <label className="label">Message *</label>
            <textarea className="input-field" rows={4} required value={form.message} onChange={e => setForm({...form, message: e.target.value})} placeholder="Describe your query in detail..."/>
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="input-field" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Submitting...' : 'Submit Query'}</button>
          </div>
        </form>
      </Modal>

      {/* Reply Modal */}
      <Modal open={showReplyModal} onClose={() => setShowReplyModal(false)} title={`Reply to: ${selectedQuery?.subject || ''}`}>
        <form onSubmit={handleReply} className="space-y-4">
          <div className="p-3 rounded-xl bg-surface-50 dark:bg-gray-800 border border-surface-200 dark:border-gray-700">
            <p className="text-xs text-surface-400 mb-1">Original query by {selectedQuery?.raised_by_name}</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{selectedQuery?.message}</p>
          </div>
          <div>
            <label className="label">Your Reply *</label>
            <textarea className="input-field" rows={4} required value={reply} onChange={e => setReply(e.target.value)} placeholder="Type your response..."/>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowReplyModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={replying} className="btn-primary flex-1">{replying ? 'Sending...' : 'Send Reply'}</button>
          </div>
        </form>
      </Modal>

      {/* Reopen Modal */}
      <Modal open={showReopenModal} onClose={() => setShowReopenModal(false)} title={`Reopen: ${selectedQuery?.subject || ''}`}>
        <form onSubmit={handleReopen} className="space-y-4">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              This query is marked as <span className="font-bold">{selectedQuery?.status}</span>. Reopening will set status back to Open.
            </p>
          </div>
          <div>
            <label className="label">Reason for Reopening</label>
            <textarea className="input-field" rows={3} value={reopenComment}
              onChange={e => setReopenComment(e.target.value)}
              placeholder="Why are you reopening this query? (optional)"/>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowReopenModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={reopening}
              className="flex-1 py-2 px-4 rounded-xl bg-amber-500 text-white hover:bg-amber-600 font-medium text-sm transition-colors">
              {reopening ? 'Reopening...' : 'Reopen Query'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
