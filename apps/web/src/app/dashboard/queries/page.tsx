'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import PageError from '@/components/ui/PageError';
import { useApi } from '@/hooks/useApi';
import { useFormConfig } from '@/hooks/useFormConfig';

// ── Constants ──────────────────────────────────────────────────────────────────

const PARENT_QUERY_TYPES = [
  'Fee Related', 'Academic', 'Transport', 'Attendance',
  'Admission', 'Homework', 'Complaint', 'Other',
];

const STATUS_BADGE: Record<string, string> = {
  open:        'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  resolved:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
};

function fmtDate(d: any) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtTime(d: any) {
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

// ── Reply thread ───────────────────────────────────────────────────────────────

function ReplyThread({ replies, raisedByName, description }: {
  replies: any[]; raisedByName: string; description: string;
}) {
  return (
    <div className="space-y-3">
      {/* Original query bubble */}
      <div className="flex gap-3">
        <div className="w-7 h-7 rounded-full bg-surface-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-surface-500 shrink-0 mt-0.5">
          {raisedByName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="bg-surface-50 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
            {description}
          </div>
          <p className="text-[10px] text-surface-400 mt-1 ml-1">{raisedByName}</p>
        </div>
      </div>

      {/* Reply bubbles */}
      {replies.map((r, i) => (
        <div key={i} className="flex gap-3">
          <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-950/50 flex items-center justify-center text-xs font-bold text-brand-600 dark:text-brand-400 shrink-0 mt-0.5">
            {r.user_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="bg-brand-50 dark:bg-brand-950/30 border border-brand-100 dark:border-brand-900 rounded-xl px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
              {r.message}
            </div>
            <p className="text-[10px] text-surface-400 mt-1 ml-1">
              {r.user_name} · {fmtDate(r.created_at)} {fmtTime(r.created_at)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function QueriesPage() {
  const [showNewModal,    setShowNewModal]    = useState(false);
  const [detailQuery,     setDetailQuery]     = useState<any>(null);
  const [form,            setForm]            = useState({ subject: '', description: '', query_type: '' });
  const [replyMsg,        setReplyMsg]        = useState('');
  const [saving,          setSaving]          = useState(false);
  const [replying,        setReplying]        = useState(false);
  const [formError,       setFormError]       = useState('');

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const user    = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
  const role    = user.primaryRole ?? '';

  const isParent       = role === 'parent';
  const isSchoolAdmin  = role === 'school_admin';
  const isSuperAdmin   = role === 'super_admin';
  const canRaise       = isParent || isSchoolAdmin;   // both can raise queries
  const canReply       = isSchoolAdmin || isSuperAdmin; // admins reply

  const { data, isLoading, error, mutate } = useApi<{ queries: any[] }>('/api/queries');
  const queries = data?.queries ?? [];
  const fc = useFormConfig('query_form');

  // ── Submit new query ─────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.subject.trim() || !form.description.trim()) {
      setFormError('Subject and description are required.');
      return;
    }
    setSaving(true);
    try {
      const res  = await fetch('/api/queries', { method: 'POST', headers, body: JSON.stringify(form) });
      const body = await res.json();
      if (!res.ok) { setFormError(body.error || 'Failed to submit'); setSaving(false); return; }
      setShowNewModal(false);
      setForm({ subject: '', description: '', query_type: '' });
      mutate();
    } catch { setFormError('Network error'); }
    setSaving(false);
  };

  // ── Reply ────────────────────────────────────────────────────────────────────

  const handleReply = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!replyMsg.trim() || !detailQuery) return;
    setReplying(true);
    const res = await fetch('/api/queries', {
      method: 'PATCH', headers,
      body: JSON.stringify({ action: 'reply', id: detailQuery.id, message: replyMsg }),
    });
    if (res.ok) {
      setReplyMsg('');
      mutate();
      // Refresh detail view from updated list
      const updated = await fetch('/api/queries', { headers: { Authorization: `Bearer ${token}` } });
      const d = await updated.json();
      const refreshed = (d.queries ?? []).find((q: any) => q.id === detailQuery.id);
      if (refreshed) setDetailQuery(refreshed);
    }
    setReplying(false);
  };

  // ── Resolve / Reopen ─────────────────────────────────────────────────────────

  const handleAction = async (action: 'resolve' | 'reopen', q: any) => {
    await fetch('/api/queries', {
      method: 'PATCH', headers,
      body: JSON.stringify({ action, id: q.id }),
    });
    mutate();
    if (detailQuery?.id === q.id) setDetailQuery(null);
  };

  // ── Routing hint text ────────────────────────────────────────────────────────

  const routingHint = isParent
    ? 'Your query will be sent directly to the School Admin.'
    : isSchoolAdmin
      ? 'Your query will be forwarded to the Super Admin.'
      : '';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">
            {isSuperAdmin ? 'School Admin Queries' : 'Queries & Support'}
          </h1>
          <p className="text-sm text-surface-400 mt-0.5">
            {isSuperAdmin
              ? 'Queries raised by school administrators across all schools'
              : isSchoolAdmin
                ? 'Manage parent queries and raise your own to Super Admin'
                : 'Raise a query to the school administration'}
          </p>
        </div>
        {canRaise && (
          <button onClick={() => { setForm({ subject: '', description: '', query_type: '' }); setFormError(''); setShowNewModal(true); }}
            className="btn-primary flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Raise Query
          </button>
        )}
      </div>

      {/* Query list */}
      {error ? (
        <PageError message="Failed to load queries — please try again." onRetry={() => mutate()} />
      ) : isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card p-5 h-20 animate-pulse bg-surface-100 dark:bg-gray-700/40"/>)}</div>
      ) : queries.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <div className="text-4xl">📋</div>
          <p className="text-surface-400 text-sm">No queries yet.</p>
          {canRaise && (
            <button onClick={() => setShowNewModal(true)} className="btn-primary text-sm">Raise your first query</button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {queries.map((q) => {
            const isOwn   = q.raised_by_id === user.id;
            const hasReply = q.replies?.length > 0;
            return (
              <div key={q.id} className="card p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setDetailQuery(q)}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0 space-y-1">
                    {/* Ticket + status row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold bg-surface-100 dark:bg-gray-700 text-surface-500 dark:text-gray-400 px-2 py-0.5 rounded">
                        {q.ticket_no}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-md capitalize ${STATUS_BADGE[q.status] ?? STATUS_BADGE.open}`}>
                        {q.status.replace('_', ' ')}
                      </span>
                      {q.query_type && (
                        <span className="text-xs bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-md">
                          {q.query_type}
                        </span>
                      )}
                      {hasReply && (
                        <span className="text-xs text-brand-600 dark:text-brand-400 flex items-center gap-1">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 21 1.9-5.7A8.5 8.5 0 1 1 5.8 17.8z"/></svg>
                          {q.replies.length} {q.replies.length === 1 ? 'reply' : 'replies'}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-snug">{q.subject}</h3>
                    <p className="text-xs text-surface-400 line-clamp-1">{q.description}</p>
                    <div className="flex items-center gap-3 text-[11px] text-surface-400">
                      <span>By {q.raised_by_name}</span>
                      <span>·</span>
                      <span>{fmtDate(q.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                    {/* Admin: reply */}
                    {canReply && q.status !== 'resolved' && (
                      <button onClick={() => setDetailQuery(q)}
                        className="text-xs bg-brand-50 dark:bg-brand-950/30 text-brand-600 border border-brand-200 dark:border-brand-800 px-3 py-1.5 rounded-lg hover:bg-brand-100 font-medium transition-colors">
                        Reply
                      </button>
                    )}
                    {/* Submitter: mark resolved */}
                    {isOwn && q.status === 'in_progress' && hasReply && (
                      <button onClick={() => handleAction('resolve', q)}
                        className="text-xs bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-lg hover:bg-emerald-100 font-medium transition-colors">
                        Mark Solved
                      </button>
                    )}
                    {/* Submitter: reopen */}
                    {isOwn && q.status === 'resolved' && (
                      <button onClick={() => handleAction('reopen', q)}
                        className="text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-700 border border-amber-200 dark:border-amber-800 px-3 py-1.5 rounded-lg hover:bg-amber-100 font-medium transition-colors">
                        Reopen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── New Query Modal ───────────────────────────────────────────────────── */}
      <Modal open={showNewModal} onClose={() => setShowNewModal(false)} title="Raise a Query">
        <form onSubmit={handleSubmit} className="space-y-4">
          {routingHint && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl text-sm text-blue-700 dark:text-blue-300">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {routingHint}
            </div>
          )}

          {/* Category / Query Type — visibility + label driven by form config */}
          {fc.visible('category') && (isParent || fc.visible('category')) && (
            <div>
              <label className="label">
                {fc.label('category')}
                {fc.required('category') && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <select className="input-field" value={form.query_type}
                disabled={!fc.editable('category')}
                required={fc.required('category')}
                onChange={e => setForm(f => ({ ...f, query_type: e.target.value }))}>
                <option value="">— Select type —</option>
                {PARENT_QUERY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}

          {/* Subject */}
          {fc.visible('subject') && (
            <div>
              <label className="label">
                {fc.label('subject')}
                {fc.required('subject') || !fc.required('subject') /* always required by default */
                  ? <span className="text-red-500 ml-0.5">*</span> : null}
              </label>
              <input className="input-field"
                required
                readOnly={!fc.editable('subject')}
                placeholder="Brief summary of your query…"
                value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
            </div>
          )}

          {/* Message / Description */}
          {fc.visible('message') && (
            <div>
              <label className="label">
                {fc.label('message')}
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <textarea className="input-field" rows={5} required
                readOnly={!fc.editable('message')}
                placeholder="Describe your query in detail…"
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          )}

          {/* Attachment note */}
          <div className="flex items-center gap-2 px-3 py-2 bg-surface-50 dark:bg-gray-800 rounded-xl border border-surface-200 dark:border-gray-700 text-xs text-surface-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.47"/></svg>
            Attachments can be added after submission via reply. File upload coming soon.
          </div>

          {formError && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2">{formError}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowNewModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Submitting…' : 'Submit Query'}</button>
          </div>
        </form>
      </Modal>

      {/* ── Detail / Reply Modal ──────────────────────────────────────────────── */}
      {detailQuery && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-surface-100 dark:border-gray-800 flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold bg-surface-100 dark:bg-gray-700 text-surface-500 dark:text-gray-400 px-2 py-0.5 rounded">
                    {detailQuery.ticket_no}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-md capitalize ${STATUS_BADGE[detailQuery.status] ?? STATUS_BADGE.open}`}>
                    {detailQuery.status.replace('_', ' ')}
                  </span>
                  {detailQuery.query_type && (
                    <span className="text-xs bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-md">
                      {detailQuery.query_type}
                    </span>
                  )}
                </div>
                <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-base leading-snug truncate">{detailQuery.subject}</h2>
                <p className="text-xs text-surface-400">
                  Raised by <span className="font-medium text-gray-700 dark:text-gray-300">{detailQuery.raised_by_name}</span>
                  {' · '}{fmtDate(detailQuery.created_at)}
                </p>
              </div>
              <button onClick={() => setDetailQuery(null)}
                className="text-surface-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors shrink-0 mt-0.5">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Thread */}
            <div className="flex-1 overflow-y-auto p-5">
              <ReplyThread
                replies={detailQuery.replies ?? []}
                raisedByName={detailQuery.raised_by_name}
                description={detailQuery.description}
              />
            </div>

            {/* Footer: reply + actions */}
            <div className="p-5 border-t border-surface-100 dark:border-gray-800 space-y-3">
              {/* Reply input — shown for admins and also for requester if they want to follow up */}
              {detailQuery.status !== 'resolved' && (
                <form onSubmit={handleReply} className="flex gap-3">
                  <input className="input-field flex-1 text-sm"
                    placeholder={canReply ? 'Write your reply…' : 'Add follow-up message…'}
                    value={replyMsg}
                    onChange={e => setReplyMsg(e.target.value)}
                  />
                  <button type="submit" disabled={replying || !replyMsg.trim()}
                    className="btn-primary text-sm px-4 disabled:opacity-60">
                    {replying ? '…' : 'Send'}
                  </button>
                </form>
              )}

              {/* Submitter actions */}
              {detailQuery.raised_by_id === user.id && (
                <div className="flex gap-2">
                  {detailQuery.status === 'in_progress' && detailQuery.replies?.length > 0 && (
                    <button onClick={() => handleAction('resolve', detailQuery)}
                      className="text-xs bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-lg hover:bg-emerald-100 font-medium transition-colors">
                      Mark as Solved
                    </button>
                  )}
                  {detailQuery.status === 'resolved' && (
                    <button onClick={() => handleAction('reopen', detailQuery)}
                      className="text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-700 border border-amber-200 dark:border-amber-800 px-3 py-1.5 rounded-lg hover:bg-amber-100 font-medium transition-colors">
                      Reopen Query
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
