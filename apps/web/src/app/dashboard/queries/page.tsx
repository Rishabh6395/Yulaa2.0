'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type AttachMeta = { name: string; url: string; type: string; size: number };

type QReply = {
  id: string; message: string; user_name: string; user_id: string;
  created_at: string; attachments: AttachMeta[];
};

type SupportQ = {
  id: string; ticket_no: string;
  raised_by_id: string; raised_by_name: string; raised_by_role: string;
  school_name?: string;
  query_type: string | null; priority: string;
  subject: string; description: string; status: string;
  attachments: AttachMeta[]; created_at: string; updated_at: string;
  replies: QReply[];
};

// ── Config ────────────────────────────────────────────────────────────────────

const PRIORITY: Record<string, { dot: string; badge: string; label: string }> = {
  urgent: { dot: 'bg-red-500',    badge: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',       label: 'Urgent' },
  high:   { dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400', label: 'High' },
  normal: { dot: 'bg-blue-400',   badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',   label: 'Normal' },
  low:    { dot: 'bg-gray-400',   badge: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',      label: 'Low' },
};

const STATUS: Record<string, { badge: string; label: string }> = {
  open:        { badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',     label: 'Open' },
  in_progress: { badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',         label: 'In Progress' },
  resolved:    { badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400', label: 'Resolved' },
};

const CATEGORIES     = ['Academic', 'Fee', 'Transport', 'Attendance', 'Behaviour', 'Technical', 'HR', 'Infrastructure', 'Policy', 'Other'];
const ADMIN_CATS     = ['Technical Support', 'Platform Issue', 'Policy Query', 'Billing', 'Feature Request', 'Other'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function relTime(d: string) {
  const m = Math.floor((Date.now() - +new Date(d)) / 60000);
  if (m < 60)       return `${m}m ago`;
  if (m < 1440)     return `${Math.floor(m / 60)}h ago`;
  if (m < 10080)    return `${Math.floor(m / 1440)}d ago`;
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function fullDate(d: string) {
  return new Date(d).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function fmtBytes(b: number) {
  if (b < 1024) return `${b}B`;
  if (b < 1048576) return `${(b / 1024).toFixed(0)}KB`;
  return `${(b / 1048576).toFixed(1)}MB`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ s }: { s: string }) {
  const c = STATUS[s] ?? STATUS.open;
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${c.badge}`}>{c.label}</span>;
}

function PriorityDot({ p }: { p: string }) {
  return <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY[p]?.dot ?? 'bg-blue-400'}`}/>;
}

function PriorityBadge({ p }: { p: string }) {
  const c = PRIORITY[p] ?? PRIORITY.normal;
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${c.badge}`}>{c.label}</span>;
}

function RoleChip({ role }: { role: string }) {
  return (
    <span className="text-[10px] bg-surface-100 dark:bg-gray-700 text-surface-500 dark:text-gray-400 px-1.5 py-0.5 rounded capitalize">
      {role.replace('_', ' ')}
    </span>
  );
}

function AttachChip({ a, small }: { a: AttachMeta; small?: boolean }) {
  const isImg = a.type?.startsWith('image/');
  return (
    <a
      href={a.url} target="_blank" rel="noopener noreferrer"
      download={a.url?.startsWith('data:') ? a.name : undefined}
      className={`inline-flex items-center gap-1 rounded-lg border border-surface-200 dark:border-gray-700 bg-surface-50 dark:bg-gray-800/80 hover:bg-surface-100 dark:hover:bg-gray-700 transition-colors ${small ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'}`}
    >
      {isImg
        ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/></svg>
        : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
      }
      <span className="max-w-[100px] truncate text-gray-700 dark:text-gray-300">{a.name}</span>
      {!small && a.size > 0 && <span className="text-surface-400 flex-shrink-0">{fmtBytes(a.size)}</span>}
    </a>
  );
}

function Thread({ q, userId }: { q: SupportQ; userId: string }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [q.replies.length]);

  const Bubble = ({ isMe, name, msg, date, attaches }: {
    isMe: boolean; name: string; msg: string; date: string; attaches: AttachMeta[];
  }) => (
    <div className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${isMe ? 'bg-brand-100 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300' : 'bg-surface-200 dark:bg-gray-700 text-surface-600 dark:text-gray-300'}`}>
        {name.charAt(0).toUpperCase()}
      </div>
      <div className={`max-w-[78%] space-y-1 ${isMe ? 'items-end' : ''}`}>
        {msg && (
          <div className={`px-4 py-2.5 text-sm rounded-2xl ${isMe ? 'bg-brand-500 text-white rounded-tr-sm' : 'bg-surface-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-sm'} whitespace-pre-wrap`}>
            {msg}
          </div>
        )}
        {attaches.length > 0 && (
          <div className={`flex flex-wrap gap-1.5 ${isMe ? 'justify-end' : ''}`}>
            {attaches.map((a, i) => <AttachChip key={i} a={a} small />)}
          </div>
        )}
        <p className={`text-[10px] text-surface-400 px-1 ${isMe ? 'text-right' : ''}`}>
          {name} · {fullDate(date)}
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 py-2">
      <Bubble
        isMe={q.raised_by_id === userId}
        name={q.raised_by_name}
        msg={q.description}
        date={q.created_at}
        attaches={q.attachments}
      />
      {q.replies.map(r => (
        <Bubble key={r.id}
          isMe={r.user_id === userId}
          name={r.user_name}
          msg={r.message}
          date={r.created_at}
          attaches={r.attachments ?? []}
        />
      ))}
      <div ref={endRef}/>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function QueriesPage() {
  const [queries,     setQueries]     = useState<SupportQ[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadErr,     setLoadErr]     = useState('');
  const [selected,    setSelected]    = useState<SupportQ | null>(null);
  const [tab,         setTab]         = useState<'inbox' | 'mine'>('inbox');
  const [statusFlt,   setStatusFlt]   = useState('all');
  const [search,      setSearch]      = useState('');
  const [showNew,     setShowNew]     = useState(false);
  const [mobileView,  setMobileView]  = useState<'list' | 'detail'>('list');

  const [replyText,   setReplyText]   = useState('');
  const [replyAtts,   setReplyAtts]   = useState<AttachMeta[]>([]);
  const [uploading,   setUploading]   = useState(false);
  const [replying,    setReplying]    = useState(false);
  const [actioning,   setActioning]   = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [nForm,      setNForm]      = useState({ subject: '', description: '', query_type: '', priority: 'normal' });
  const [nAtts,      setNAtts]      = useState<AttachMeta[]>([]);
  const [nUploading, setNUploading] = useState(false);
  const [nError,     setNError]     = useState('');
  const [nSave,      setNSave]      = useState(false);
  const nFileRef = useRef<HTMLInputElement>(null);

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const user    = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
  const role    = user?.primaryRole ?? '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const isAdmin    = role === 'school_admin';
  const isSuperAdm = role === 'super_admin';
  const canRaise   = !isSuperAdm;

  // ── Data loading ─────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    try {
      const res  = await fetch('/api/queries', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setQueries(data.queries ?? []);
    } catch { setLoadErr('Failed to load queries. Please retry.'); }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (selected) {
      const fresh = queries.find(q => q.id === selected.id);
      if (fresh) setSelected(fresh);
    }
  }, [queries]);

  // ── Filtered list ─────────────────────────────────────────────────────────────

  const inbox  = queries.filter(q => q.raised_by_id !== user.id);
  const mine   = queries.filter(q => q.raised_by_id === user.id);
  const source = isAdmin ? (tab === 'inbox' ? inbox : mine) : queries;
  const shown  = source
    .filter(q => statusFlt === 'all' || q.status === statusFlt)
    .filter(q => {
      if (!search) return true;
      const s = search.toLowerCase();
      return q.subject.toLowerCase().includes(s) || q.ticket_no.toLowerCase().includes(s) || q.raised_by_name.toLowerCase().includes(s);
    });

  const openCount = (isAdmin ? inbox : queries).filter(q => q.status === 'open').length;

  // ── File upload ───────────────────────────────────────────────────────────────

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    for (const f of Array.from(files)) {
      const fd = new FormData(); fd.append('file', f);
      try {
        const res  = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
        const data = await res.json();
        if (res.ok) setReplyAtts(prev => [...prev, { name: data.name, url: data.url, type: data.type, size: data.size }]);
      } catch {}
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  // ── Reply ─────────────────────────────────────────────────────────────────────

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || (!replyText.trim() && replyAtts.length === 0)) return;
    setReplying(true);
    await fetch('/api/queries', {
      method: 'PATCH', headers,
      body: JSON.stringify({ action: 'reply', id: selected.id, message: replyText.trim(), attachments: replyAtts }),
    });
    setReplyText(''); setReplyAtts([]);
    setReplying(false);
    await load();
  };

  // ── Status actions ────────────────────────────────────────────────────────────

  const doAction = async (action: 'resolve' | 'reopen') => {
    if (!selected) return;
    setActioning(action);
    await fetch('/api/queries', {
      method: 'PATCH', headers,
      body: JSON.stringify({ action, id: selected.id }),
    });
    setActioning(null);
    await load();
  };

  // ── New query ─────────────────────────────────────────────────────────────────

  const handleNFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setNUploading(true);
    for (const f of Array.from(files)) {
      const fd = new FormData(); fd.append('file', f);
      try {
        const res  = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
        const data = await res.json();
        if (res.ok) setNAtts(prev => [...prev, { name: data.name, url: data.url, type: data.type, size: data.size }]);
      } catch {}
    }
    setNUploading(false);
    if (nFileRef.current) nFileRef.current.value = '';
  };

  const handleNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setNError('');
    if (!nForm.subject.trim() || !nForm.description.trim()) { setNError('Subject and description are required.'); return; }
    setNSave(true);
    try {
      const res  = await fetch('/api/queries', { method: 'POST', headers, body: JSON.stringify({ ...nForm, attachments: nAtts }) });
      const data = await res.json();
      if (!res.ok) { setNError(data.error || 'Failed'); }
      else { setShowNew(false); setNForm({ subject: '', description: '', query_type: '', priority: 'normal' }); setNAtts([]); await load(); }
    } catch { setNError('Network error'); }
    setNSave(false);
  };

  const pick = (q: SupportQ) => { setSelected(q); setReplyText(''); setReplyAtts([]); setMobileView('detail'); };
  const cats = isAdmin ? ADMIN_CATS : CATEGORIES;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col lg:flex-row rounded-2xl overflow-hidden border border-surface-100 dark:border-gray-800 bg-white dark:bg-gray-900"
      style={{ height: 'calc(100vh - 6.5rem)' }}
    >
      {/* ═══════════════════ LEFT PANEL ═══════════════════ */}
      <div className={`w-full lg:w-80 xl:w-96 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-surface-100 dark:border-gray-800 flex flex-col overflow-hidden ${mobileView === 'detail' ? 'hidden lg:flex' : 'flex'}`}>

        {/* Header */}
        <div className="p-4 border-b border-surface-100 dark:border-gray-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {isSuperAdm ? 'School Admin Queries' : isAdmin ? 'Support Inbox' : 'My Queries'}
              </h1>
              {openCount > 0 && (
                <p className="text-[11px] text-surface-400 mt-0.5">{openCount} open</p>
              )}
            </div>
            {canRaise && (
              <button onClick={() => setShowNew(true)} className="btn btn-primary text-xs px-3 py-1.5">+ New Query</button>
            )}
          </div>

          {/* Tabs — school_admin only */}
          {isAdmin && (
            <div className="flex bg-surface-50 dark:bg-gray-800/60 rounded-lg p-0.5">
              {(['inbox', 'mine'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors ${tab === t ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100' : 'text-surface-400 dark:text-gray-500'}`}
                >
                  {t === 'inbox' ? 'Inbox' : 'My Queries'}
                  {(() => {
                    const cnt = (t === 'inbox' ? inbox : mine).filter(q => q.status === 'open').length;
                    return cnt > 0 ? (
                      <span className={`text-[9px] font-bold px-1 py-0.5 rounded-full ${t === 'inbox' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{cnt}</span>
                    ) : null;
                  })()}
                </button>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input className="input pl-8 py-1.5 text-sm" placeholder="Search tickets…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {/* Status filter */}
          <div className="flex gap-1 overflow-x-auto">
            {[{ k: 'all', l: 'All' }, { k: 'open', l: 'Open' }, { k: 'in_progress', l: 'In Progress' }, { k: 'resolved', l: 'Resolved' }].map(({ k, l }) => (
              <button key={k} onClick={() => setStatusFlt(k)}
                className={`px-2 py-1 text-[11px] font-medium rounded-md whitespace-nowrap transition-colors flex-shrink-0 ${
                  statusFlt === k
                    ? 'bg-brand-100 dark:bg-brand-950/60 text-brand-700 dark:text-brand-400'
                    : 'bg-surface-100 dark:bg-gray-700/60 text-surface-500 dark:text-gray-400 hover:bg-surface-200'
                }`}
              >{l}</button>
            ))}
          </div>
        </div>

        {/* Ticket list */}
        <div className="flex-1 overflow-y-auto divide-y divide-surface-50 dark:divide-gray-800/50">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 space-y-2 animate-pulse">
                <div className="flex gap-2"><div className="h-3 bg-surface-100 dark:bg-gray-700 rounded w-24"/><div className="h-3 bg-surface-100 dark:bg-gray-700 rounded w-12"/></div>
                <div className="h-3 bg-surface-100 dark:bg-gray-700 rounded w-3/4"/>
                <div className="h-2.5 bg-surface-50 dark:bg-gray-800 rounded w-1/2"/>
              </div>
            ))
          ) : loadErr ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-sm text-red-500">{loadErr}</p>
              <button onClick={load} className="text-xs text-brand-500 underline">Retry</button>
            </div>
          ) : shown.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <p className="text-2xl">📋</p>
              <p className="text-sm text-surface-400">No tickets found.</p>
              {canRaise && <button onClick={() => setShowNew(true)} className="text-xs text-brand-500 underline">Raise a query</button>}
            </div>
          ) : (
            shown.map(q => {
              const isActive = selected?.id === q.id;
              const isUnread = q.status === 'open' && q.replies.length === 0;
              return (
                <button key={q.id} onClick={() => pick(q)}
                  className={`w-full text-left p-4 transition-all hover:bg-surface-50 dark:hover:bg-gray-800/30 ${isActive ? 'bg-brand-50 dark:bg-brand-950/20 border-l-[3px] border-l-brand-500' : 'border-l-[3px] border-l-transparent'}`}
                >
                  <div className="flex items-start gap-2">
                    <PriorityDot p={q.priority} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-mono text-surface-400 flex-shrink-0">{q.ticket_no}</span>
                        <StatusBadge s={q.status} />
                      </div>
                      <p className={`text-[13px] leading-snug truncate ${isUnread ? 'font-semibold text-gray-900 dark:text-gray-100' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
                        {q.subject}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] text-surface-400 truncate">{q.raised_by_name}</span>
                        <RoleChip role={q.raised_by_role} />
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right space-y-1">
                      <p className="text-[10px] text-surface-400 whitespace-nowrap">{relTime(q.created_at)}</p>
                      {q.replies.length > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-brand-500 dark:text-brand-400 justify-end">
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                          {q.replies.length}
                        </span>
                      )}
                    </div>
                  </div>
                  {q.school_name && (
                    <p className="text-[10px] text-brand-500 dark:text-brand-400 mt-1 truncate">{q.school_name}</p>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ═══════════════════ RIGHT PANEL ═══════════════════ */}
      <div className={`flex-1 flex flex-col overflow-hidden ${mobileView === 'list' ? 'hidden lg:flex' : 'flex'}`}>
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-surface-50 dark:bg-gray-800 flex items-center justify-center">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-300 dark:text-gray-600">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">Select a ticket</p>
            <p className="text-sm text-surface-400">Choose a query from the list to view the conversation thread.</p>
          </div>
        ) : (
          <>
            {/* Ticket header */}
            <div className="p-5 border-b border-surface-100 dark:border-gray-800">
              <button onClick={() => { setMobileView('list'); setSelected(null); }}
                className="lg:hidden flex items-center gap-1 text-xs text-brand-500 font-medium mb-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15,18 9,12 15,6"/></svg>
                All tickets
              </button>

              <div className="flex items-start gap-3 flex-wrap">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-mono font-bold bg-surface-100 dark:bg-gray-700 text-surface-500 dark:text-gray-400 px-2 py-0.5 rounded-md">
                      {selected.ticket_no}
                    </span>
                    <StatusBadge s={selected.status} />
                    <PriorityBadge p={selected.priority} />
                    {selected.query_type && (
                      <span className="text-[10px] bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-md font-medium">
                        {selected.query_type}
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-snug">{selected.subject}</h2>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-surface-400">
                    <span>By <span className="font-medium text-gray-700 dark:text-gray-300">{selected.raised_by_name}</span></span>
                    <RoleChip role={selected.raised_by_role} />
                    <span>·</span>
                    <span>{fullDate(selected.created_at)}</span>
                    {selected.school_name && (
                      <><span>·</span><span className="text-brand-600 dark:text-brand-400 font-medium">{selected.school_name}</span></>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {/* Admin / super_admin can resolve open/in_progress tickets */}
                  {(isAdmin || isSuperAdm) && selected.status !== 'resolved' && (
                    <button onClick={() => doAction('resolve')} disabled={!!actioning}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 font-medium transition-colors disabled:opacity-50">
                      {actioning === 'resolve'
                        ? <svg width="12" height="12" className="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                        : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>
                      }
                      Resolve
                    </button>
                  )}
                  {/* Original requester can reopen resolved ticket */}
                  {selected.raised_by_id === user.id && selected.status === 'resolved' && (
                    <button onClick={() => doAction('reopen')} disabled={!!actioning}
                      className="text-xs px-3 py-1.5 rounded-xl border border-surface-200 dark:border-gray-700 text-surface-500 hover:bg-surface-50 font-medium transition-colors disabled:opacity-50">
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Conversation thread */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <Thread q={selected} userId={user.id} />
            </div>

            {/* Reply footer */}
            {selected.status !== 'resolved' ? (
              <div className="border-t border-surface-100 dark:border-gray-800 p-4 space-y-2">
                {replyAtts.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-2.5 bg-surface-50 dark:bg-gray-800/50 rounded-xl border border-surface-100 dark:border-gray-700">
                    {replyAtts.map((a, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <AttachChip a={a} small />
                        <button onClick={() => setReplyAtts(p => p.filter((_, j) => j !== i))}
                          className="w-4 h-4 rounded-full bg-surface-200 dark:bg-gray-600 text-surface-500 hover:bg-red-100 hover:text-red-600 text-[10px] flex items-center justify-center transition-colors">×</button>
                      </div>
                    ))}
                  </div>
                )}
                <form onSubmit={handleReply} className="flex items-end gap-2">
                  <input ref={fileRef} type="file" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} title="Attach files"
                    className="w-9 h-9 flex-shrink-0 rounded-xl border border-surface-200 dark:border-gray-700 flex items-center justify-center text-surface-400 hover:text-brand-600 hover:border-brand-300 dark:hover:border-brand-700 transition-colors disabled:opacity-50">
                    {uploading
                      ? <svg width="14" height="14" className="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.47"/></svg>
                    }
                  </button>
                  <textarea className="input flex-1 text-sm resize-none min-h-[40px]" rows={2}
                    placeholder={isAdmin || isSuperAdm ? 'Write your reply to the requester…' : 'Write a message or follow-up…'}
                    value={replyText} onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && (replyText.trim() || replyAtts.length)) handleReply(e as any); }}
                  />
                  <button type="submit" disabled={replying || (!replyText.trim() && replyAtts.length === 0)}
                    className="w-9 h-[60px] flex-shrink-0 rounded-xl bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center transition-colors disabled:opacity-40">
                    {replying
                      ? <svg width="14" height="14" className="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></svg>
                    }
                  </button>
                </form>
                <p className="text-[10px] text-surface-400">Ctrl+Enter to send · All file types supported</p>
              </div>
            ) : (
              <div className="border-t border-surface-100 dark:border-gray-800 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>
                  <span className="text-sm font-medium">This query has been resolved.</span>
                </div>
                {selected.raised_by_id === user.id && (
                  <button onClick={() => doAction('reopen')} className="text-xs text-brand-500 hover:underline font-medium">
                    Reopen
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══════════════════ NEW QUERY MODAL ═══════════════════ */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-surface-100 dark:border-gray-800 flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Raise a Query</h2>
                <p className="text-xs text-surface-400 mt-0.5">
                  {isAdmin ? 'Your query will be escalated to Super Admin.' : 'Your query will be sent to School Admin.'}
                </p>
              </div>
              <button onClick={() => { setShowNew(false); setNAtts([]); setNError(''); }} className="text-surface-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleNew} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Category</label>
                  <select className="input text-sm" value={nForm.query_type} onChange={e => setNForm(f => ({ ...f, query_type: e.target.value }))}>
                    <option value="">— Select —</option>
                    {cats.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Priority</label>
                  <select className="input text-sm" value={nForm.priority} onChange={e => setNForm(f => ({ ...f, priority: e.target.value }))}>
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Subject *</label>
                <input required className="input" value={nForm.subject} onChange={e => setNForm(f => ({ ...f, subject: e.target.value }))} placeholder="Brief summary of your query…" />
              </div>
              <div>
                <label className="label">Description *</label>
                <textarea required className="input" rows={4} value={nForm.description} onChange={e => setNForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe in detail…" />
              </div>
              <div>
                <label className="label">Attachments <span className="text-surface-400 font-normal">(optional)</span></label>
                <input ref={nFileRef} type="file" multiple className="hidden" onChange={e => handleNFiles(e.target.files)} />
                {nAtts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2 p-2.5 bg-surface-50 dark:bg-gray-800/50 rounded-xl border border-surface-100 dark:border-gray-700">
                    {nAtts.map((a, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <AttachChip a={a} small />
                        <button type="button" onClick={() => setNAtts(p => p.filter((_, j) => j !== i))}
                          className="w-4 h-4 rounded-full bg-surface-200 dark:bg-gray-600 text-surface-500 hover:bg-red-100 hover:text-red-600 text-[10px] flex items-center justify-center transition-colors">×</button>
                      </div>
                    ))}
                  </div>
                )}
                <button type="button" onClick={() => nFileRef.current?.click()} disabled={nUploading}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-surface-300 dark:border-gray-600 text-sm text-surface-400 hover:border-brand-400 hover:text-brand-600 dark:hover:border-brand-600 dark:hover:text-brand-400 transition-colors w-full justify-center disabled:opacity-50">
                  {nUploading
                    ? <svg width="14" height="14" className="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.47"/></svg>
                  }
                  {nUploading ? 'Uploading…' : 'Attach files'}
                </button>
              </div>
              {nError && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2">{nError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowNew(false); setNAtts([]); setNError(''); }} className="btn btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={nSave || nUploading} className="btn btn-primary flex-1">{nSave ? 'Submitting…' : 'Submit Query'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
