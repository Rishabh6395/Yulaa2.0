'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

// ── types ──────────────────────────────────────────────────────────────────
interface AttachMeta { name: string; url: string; type: string; size: number }

interface Reply {
  id: string; message: string; user_name: string; user_id: string;
  created_at: string; attachments: AttachMeta[];
}

interface Query {
  id: string; ticket_no: string; school_id: string; school_name: string | null;
  raised_by_id: string; raised_by_role: string; raised_by_name: string;
  query_type: string | null; priority: string; subject: string;
  description: string; status: string; attachments: AttachMeta[];
  created_at: string; updated_at: string; replies: Reply[];
}

interface SlaPolicy { id: string; priority: string; response_hours: number; resolution_hours: number }

// ── constants ─────────────────────────────────────────────────────────────
const PRIORITY = {
  urgent: { dot: 'bg-red-500',    label: 'Urgent',   badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  high:   { dot: 'bg-orange-500', label: 'High',     badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  normal: { dot: 'bg-blue-500',   label: 'Normal',   badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  low:    { dot: 'bg-gray-400',   label: 'Low',      badge: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
} as const;

const STATUS = {
  open:        { label: 'Open',        cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  in_progress: { label: 'In Progress', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  resolved:    { label: 'Resolved',    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
} as const;

const SLA_PRIORITIES = ['urgent', 'high', 'normal', 'low'] as const;

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

function AttachChip({ a }: { a: AttachMeta }) {
  const isImg = a.type?.startsWith('image/');
  return (
    <a href={a.url} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium
        bg-surface-100 dark:bg-gray-700 text-brand-600 dark:text-brand-400
        hover:bg-surface-200 dark:hover:bg-gray-600 transition-colors border border-surface-200 dark:border-gray-600">
      {isImg
        ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
      {a.name.length > 24 ? a.name.slice(0, 21) + '…' : a.name}
    </a>
  );
}

// ── Thread ────────────────────────────────────────────────────────────────
function Thread({ query, currentUserId }: { query: Query; currentUserId: string }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [query.replies.length]);

  const initial = {
    id: '__desc', message: query.description, user_name: query.raised_by_name,
    user_id: query.raised_by_id, created_at: query.created_at,
    attachments: query.attachments,
  };
  const messages = [initial, ...query.replies];

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {messages.map((m) => {
        const isMe = m.user_id === currentUserId;
        return (
          <div key={m.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-xs font-semibold text-brand-700 dark:text-brand-300 shrink-0">
              {m.user_name.charAt(0).toUpperCase()}
            </div>
            <div className={`max-w-[72%] space-y-1 ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
              <div className={`text-[11px] text-surface-400 ${isMe ? 'text-right' : ''}`}>
                {m.user_name} · {timeAgo(m.created_at)}
              </div>
              {m.message && (
                <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words
                  ${isMe
                    ? 'bg-brand-600 text-white rounded-tr-sm'
                    : 'bg-surface-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-sm'}`}>
                  {m.message}
                </div>
              )}
              {m.attachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {m.attachments.map((a, i) => <AttachChip key={i} a={a} />)}
                </div>
              )}
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main page
// ═══════════════════════════════════════════════════════════════════════════
export default function SuperAdminQueriesPage() {
  const [activeTab, setActiveTab] = useState<'queries' | 'sla' | 'monitoring'>('queries');

  // ── queries state ──────────────────────────────────────────────────────
  const [queries, setQueries]       = useState<Query[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<Query | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentUserId, setCurrentUserId] = useState('');

  const [reply, setReply]           = useState('');
  const [replyAtts, setReplyAtts]   = useState<AttachMeta[]>([]);
  const [sending, setSending]       = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── SLA state ──────────────────────────────────────────────────────────
  const [policies, setPolicies]     = useState<SlaPolicy[]>([]);
  const [slaLoading, setSlaLoading] = useState(false);
  const [slaEdit, setSlaEdit]       = useState<Record<string, { response: string; resolution: string }>>({});
  const [slaSaving, setSlaSaving]   = useState<string | null>(null);

  // ── load queries ───────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/queries');
      const d = await r.json();
      setQueries(d.queries ?? []);
      // extract current user from first query we authored (fallback)
      const me = (d.queries ?? []).find((q: Query) => q.raised_by_id);
      if (me) setCurrentUserId(me.raised_by_id); // will be overridden below
    } catch {}
    setLoading(false);
  }, []);

  // also get current user id from profile endpoint
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d?.id) setCurrentUserId(d.id); }).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── load SLA ───────────────────────────────────────────────────────────
  const loadSla = useCallback(async () => {
    setSlaLoading(true);
    try {
      const r = await fetch('/api/queries/sla');
      const d = await r.json();
      const list: SlaPolicy[] = d.policies ?? [];
      setPolicies(list);
      const edits: Record<string, { response: string; resolution: string }> = {};
      SLA_PRIORITIES.forEach(p => {
        const found = list.find(x => x.priority === p);
        edits[p] = { response: String(found?.response_hours ?? (p === 'urgent' ? 4 : p === 'high' ? 8 : p === 'normal' ? 24 : 48)), resolution: String(found?.resolution_hours ?? (p === 'urgent' ? 24 : p === 'high' ? 48 : p === 'normal' ? 72 : 120)) };
      });
      setSlaEdit(edits);
    } catch {}
    setSlaLoading(false);
  }, []);

  useEffect(() => { if (activeTab === 'sla') loadSla(); }, [activeTab, loadSla]);

  // ── filtered queries ───────────────────────────────────────────────────
  const filtered = queries.filter(q => {
    if (statusFilter !== 'all' && q.status !== statusFilter) return false;
    if (search && !q.subject.toLowerCase().includes(search.toLowerCase()) &&
        !q.ticket_no.toLowerCase().includes(search.toLowerCase()) &&
        !(q.school_name ?? '').toLowerCase().includes(search.toLowerCase()) &&
        !q.raised_by_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // ── reply ──────────────────────────────────────────────────────────────
  async function handleFiles(files: FileList | null) {
    if (!files) return;
    for (const f of Array.from(files)) {
      const fd = new FormData(); fd.append('file', f);
      try {
        const r = await fetch('/api/upload', { method: 'POST', body: fd });
        const d = await r.json();
        if (d.url) setReplyAtts(a => [...a, { name: d.name, url: d.url, type: d.type, size: d.size }]);
      } catch {}
    }
  }

  async function sendReply() {
    if (!selected || (!reply.trim() && replyAtts.length === 0)) return;
    setSending(true);
    try {
      const r = await fetch('/api/queries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reply', id: selected.id, message: reply.trim(), attachments: replyAtts }),
      });
      if (r.ok) {
        setReply(''); setReplyAtts([]);
        await load();
        setSelected(q => queries.find(x => x.id === q?.id) ?? q);
      }
    } catch {}
    setSending(false);
  }

  async function resolveQuery() {
    if (!selected) return;
    await fetch('/api/queries', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resolve', id: selected.id }),
    });
    await load();
    setSelected(q => queries.find(x => x.id === q?.id) ?? q);
  }

  async function saveSla(priority: string) {
    setSlaSaving(priority);
    try {
      await fetch('/api/queries/sla', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priority,
          response_hours:   Number(slaEdit[priority]?.response)   || 24,
          resolution_hours: Number(slaEdit[priority]?.resolution) || 72,
        }),
      });
      await loadSla();
    } catch {}
    setSlaSaving(null);
  }

  // keep selected in sync after reload
  useEffect(() => {
    if (selected) setSelected(queries.find(q => q.id === selected.id) ?? null);
  }, [queries]);

  // ── stats for monitoring ───────────────────────────────────────────────
  const openCount    = queries.filter(q => q.status === 'open').length;
  const inProgCount  = queries.filter(q => q.status === 'in_progress').length;
  const resolvedCount = queries.filter(q => q.status === 'resolved').length;
  const bySchool = queries.reduce<Record<string, { name: string; open: number; total: number }>>((acc, q) => {
    const key = q.school_id;
    if (!acc[key]) acc[key] = { name: q.school_name ?? q.school_id, open: 0, total: 0 };
    acc[key].total++;
    if (q.status !== 'resolved') acc[key].open++;
    return acc;
  }, {});

  const TABS = [
    { key: 'queries',    label: 'School Admin Queries' },
    { key: 'sla',        label: 'SLA Rules' },
    { key: 'monitoring', label: 'Monitoring' },
  ] as const;

  return (
    <div className="h-full flex flex-col">
      {/* page header */}
      <div className="shrink-0 px-4 pt-4 pb-0">
        <h1 className="text-xl font-display font-bold text-gray-900 dark:text-gray-100">Query Management</h1>
        <p className="text-sm text-surface-400 mt-0.5 mb-3">Centralized helpdesk for all school admin queries.</p>
        <div className="flex gap-0 border-b border-surface-200 dark:border-gray-700">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === t.key
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-surface-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              {t.label}
              {t.key === 'queries' && openCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-brand-600 text-white">{openCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB: Queries ─────────────────────────────────────────────── */}
      {activeTab === 'queries' && (
        <div className="flex-1 flex overflow-hidden">
          {/* left panel */}
          <div className={`w-80 xl:w-96 shrink-0 flex flex-col border-r border-surface-200 dark:border-gray-700 overflow-hidden ${mobileView === 'detail' ? 'hidden md:flex' : 'flex'}`}>
            {/* search + filter */}
            <div className="p-3 space-y-2 border-b border-surface-200 dark:border-gray-700 shrink-0">
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input className="input pl-8 text-sm" placeholder="Search ticket, school, name…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {(['all', 'open', 'in_progress', 'resolved'] as const).map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${statusFilter === s
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'border-surface-300 dark:border-gray-600 text-surface-500 hover:border-brand-400'}`}>
                    {s === 'all' ? 'All' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* list */}
            <div className="flex-1 overflow-y-auto divide-y divide-surface-100 dark:divide-gray-800">
              {loading ? (
                <div className="p-6 text-center text-sm text-surface-400">Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="p-6 text-center text-sm text-surface-400">No queries found.</div>
              ) : filtered.map(q => {
                const p = PRIORITY[q.priority as keyof typeof PRIORITY] ?? PRIORITY.normal;
                const s = STATUS[q.status as keyof typeof STATUS] ?? STATUS.open;
                return (
                  <button key={q.id} onClick={() => { setSelected(q); setMobileView('detail'); }}
                    className={`w-full text-left px-3 py-3 hover:bg-surface-50 dark:hover:bg-gray-800 transition-colors ${selected?.id === q.id ? 'bg-brand-50 dark:bg-brand-900/20 border-l-2 border-brand-600' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${p.dot}`} />
                      <span className="text-xs font-mono text-surface-400">{q.ticket_no}</span>
                      <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-medium ${s.cls}`}>{s.label}</span>
                    </div>
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-1">{q.subject}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs text-surface-500">{q.raised_by_name}</span>
                      {q.school_name && <span className="text-xs text-surface-400">· {q.school_name}</span>}
                      <span className="ml-auto text-[10px] text-surface-400">{timeAgo(q.created_at)}</span>
                    </div>
                    {q.replies.length > 0 && (
                      <div className="text-[10px] text-surface-400 mt-0.5">{q.replies.length} {q.replies.length === 1 ? 'reply' : 'replies'}</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* right panel */}
          <div className={`flex-1 flex flex-col overflow-hidden ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>
            {!selected ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <svg className="w-12 h-12 text-surface-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <p className="text-sm text-surface-400">Select a query to view the conversation</p>
              </div>
            ) : (
              <>
                {/* header */}
                <div className="shrink-0 px-4 py-3 border-b border-surface-200 dark:border-gray-700">
                  <div className="flex items-start gap-2">
                    <button onClick={() => setMobileView('list')} className="md:hidden p-1 rounded hover:bg-surface-100 dark:hover:bg-gray-700 shrink-0 mt-0.5">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-mono text-surface-400">{selected.ticket_no}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${(STATUS[selected.status as keyof typeof STATUS] ?? STATUS.open).cls}`}>
                          {(STATUS[selected.status as keyof typeof STATUS] ?? STATUS.open).label}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${(PRIORITY[selected.priority as keyof typeof PRIORITY] ?? PRIORITY.normal).badge}`}>
                          {(PRIORITY[selected.priority as keyof typeof PRIORITY] ?? PRIORITY.normal).label}
                        </span>
                        {selected.query_type && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-100 dark:bg-gray-700 text-surface-600 dark:text-gray-300">{selected.query_type}</span>
                        )}
                      </div>
                      <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-snug">{selected.subject}</h2>
                      <div className="text-xs text-surface-400 mt-0.5">
                        {selected.raised_by_name} ({selected.raised_by_role})
                        {selected.school_name && ` · ${selected.school_name}`}
                        {' · '}{new Date(selected.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    {selected.status !== 'resolved' && (
                      <button onClick={resolveQuery}
                        className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors">
                        Resolve
                      </button>
                    )}
                  </div>
                </div>

                {/* thread */}
                <Thread query={selected} currentUserId={currentUserId} />

                {/* reply footer */}
                {selected.status !== 'resolved' && (
                  <div className="shrink-0 border-t border-surface-200 dark:border-gray-700 p-3 space-y-2">
                    {replyAtts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {replyAtts.map((a, i) => (
                          <div key={i} className="flex items-center gap-1">
                            <AttachChip a={a} />
                            <button onClick={() => setReplyAtts(x => x.filter((_, j) => j !== i))} className="text-surface-400 hover:text-red-500 text-sm">×</button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 items-end">
                      <textarea
                        className="input flex-1 resize-none text-sm min-h-[60px]"
                        placeholder="Type your reply…"
                        value={reply}
                        onChange={e => setReply(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); }}}
                      />
                      <div className="flex flex-col gap-1.5">
                        <button onClick={() => fileRef.current?.click()}
                          className="p-2 rounded-lg border border-surface-200 dark:border-gray-600 hover:bg-surface-100 dark:hover:bg-gray-700 text-surface-500 transition-colors" title="Attach files">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                        </button>
                        <button onClick={sendReply} disabled={sending || (!reply.trim() && replyAtts.length === 0)}
                          className="p-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                        </button>
                      </div>
                      <input ref={fileRef} type="file" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: SLA Rules ───────────────────────────────────────────── */}
      {activeTab === 'sla' && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-2xl space-y-4">
            <p className="text-sm text-surface-500">Configure response and resolution time targets per priority level. These apply globally across all schools.</p>
            {slaLoading ? (
              <div className="text-sm text-surface-400 py-8 text-center">Loading…</div>
            ) : (
              <div className="card divide-y divide-surface-100 dark:divide-gray-700">
                {SLA_PRIORITIES.map(p => {
                  const pr = PRIORITY[p];
                  return (
                    <div key={p} className="p-4 flex items-center gap-4">
                      <div className="flex items-center gap-2 w-24 shrink-0">
                        <span className={`w-2.5 h-2.5 rounded-full ${pr.dot}`} />
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 capitalize">{pr.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-surface-400 w-20 shrink-0">Response (h)</label>
                        <input type="number" min={1} max={168}
                          className="input w-20 text-sm"
                          value={slaEdit[p]?.response ?? ''}
                          onChange={e => setSlaEdit(x => ({ ...x, [p]: { ...x[p], response: e.target.value } }))}
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-surface-400 w-24 shrink-0">Resolution (h)</label>
                        <input type="number" min={1} max={720}
                          className="input w-20 text-sm"
                          value={slaEdit[p]?.resolution ?? ''}
                          onChange={e => setSlaEdit(x => ({ ...x, [p]: { ...x[p], resolution: e.target.value } }))}
                        />
                      </div>
                      <button onClick={() => saveSla(p)} disabled={slaSaving === p}
                        className="ml-auto btn btn-secondary text-xs px-3 py-1.5 shrink-0">
                        {slaSaving === p ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="text-xs text-surface-400 space-y-1">
              <p><strong>Response SLA</strong> — time from ticket creation to first staff reply.</p>
              <p><strong>Resolution SLA</strong> — time from ticket creation to resolved status.</p>
              <p>Overdue tickets are highlighted in the queries list.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Monitoring ─────────────────────────────────────────── */}
      {activeTab === 'monitoring' && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-3xl space-y-5">
            {/* summary cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Open',        count: openCount,     cls: 'border-amber-300 dark:border-amber-700',    txt: 'text-amber-600 dark:text-amber-400' },
                { label: 'In Progress', count: inProgCount,   cls: 'border-blue-300 dark:border-blue-700',      txt: 'text-blue-600 dark:text-blue-400' },
                { label: 'Resolved',    count: resolvedCount, cls: 'border-emerald-300 dark:border-emerald-700', txt: 'text-emerald-600 dark:text-emerald-400' },
              ].map(s => (
                <div key={s.label} className={`card p-4 border-t-2 ${s.cls}`}>
                  <div className={`text-2xl font-bold ${s.txt}`}>{s.count}</div>
                  <div className="text-xs text-surface-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* by school */}
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">By School</h3>
              {Object.keys(bySchool).length === 0 ? (
                <p className="text-sm text-surface-400">No queries yet.</p>
              ) : (
                <div className="divide-y divide-surface-100 dark:divide-gray-700">
                  {Object.values(bySchool).sort((a, b) => b.open - a.open).map(s => (
                    <div key={s.name} className="py-2 flex items-center gap-3">
                      <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{s.name}</span>
                      <span className="text-xs text-surface-400">{s.total} total</span>
                      {s.open > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">{s.open} open</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* priority breakdown */}
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">By Priority</h3>
              <div className="space-y-2">
                {SLA_PRIORITIES.map(p => {
                  const count  = queries.filter(q => q.priority === p).length;
                  const pct    = queries.length ? Math.round((count / queries.length) * 100) : 0;
                  const pr     = PRIORITY[p];
                  return (
                    <div key={p} className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 w-20 shrink-0">
                        <span className={`w-2 h-2 rounded-full ${pr.dot}`} />
                        <span className="text-xs text-gray-700 dark:text-gray-300 capitalize">{pr.label}</span>
                      </div>
                      <div className="flex-1 bg-surface-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div className={`h-full rounded-full ${pr.dot}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-surface-400 w-12 text-right">{count} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
