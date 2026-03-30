'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { TEMPLATE_PLACEHOLDERS } from '@/services/template.service';
import { TEMPLATE_TYPES } from '@/services/default-templates';

export default function LetterTemplatesPage() {
  const [templates,   setTemplates]   = useState<any[]>([]);
  const [activeId,    setActiveId]    = useState<string | null>(null);
  const [html,        setHtml]        = useState('');
  const [name,        setName]        = useState('');
  const [type,        setType]        = useState('fee_invoice');
  const [saving,      setSaving]      = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [msg,         setMsg]         = useState<{ kind: string; text: string } | null>(null);
  const [warnings,    setWarnings]    = useState<string[]>([]);
  const [builtIn,     setBuiltIn]     = useState<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchTemplates = useCallback(async () => {
    const res = await fetch(`/api/letter-templates?type=${type}`, { headers: { Authorization: `Bearer ${token}` } });
    const d = await res.json();
    setTemplates(d.templates ?? []);
    setBuiltIn(d.builtInDefault ?? null);
  }, [token, type]);

  const loadHtml = useCallback(async (id: string) => {
    setLoading(true);
    const res = await fetch('/api/letter-templates', {
      method: 'POST', headers,
      body: JSON.stringify({ action: 'get_html', id }),
    });
    const d = await res.json();
    setHtml(d.htmlContent ?? '');
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const selectTemplate = async (id: string, tName: string) => {
    setActiveId(id);
    setName(id === '__default__' ? 'My Custom Template' : tName);
    setWarnings([]);
    setMsg(null);
    await loadHtml(id);
  };

  const newTemplate = () => {
    setActiveId(null);
    setName('');
    setHtml('');
    setWarnings([]);
    setMsg(null);
  };

  const insertPlaceholder = (key: string) => {
    const ta = textareaRef.current;
    if (!ta) { setHtml(h => h + `@@${key}@@`); return; }
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const tag   = `@@${key}@@`;
    const next  = html.slice(0, start) + tag + html.slice(end);
    setHtml(next);
    // Restore cursor after the inserted text
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + tag.length, start + tag.length);
    });
  };

  const handleSave = async () => {
    if (!name.trim()) { setMsg({ kind: 'error', text: 'Template name is required' }); return; }
    if (!html.trim()) { setMsg({ kind: 'error', text: 'HTML content is required' }); return; }
    setSaving(true); setMsg(null); setWarnings([]);
    const payload: any = { name, templateType: type, htmlContent: html };
    if (activeId && activeId !== '__default__') payload.id = activeId;
    const res  = await fetch('/api/letter-templates', { method: 'POST', headers, body: JSON.stringify(payload) });
    const d    = await res.json();
    setSaving(false);
    if (!res.ok) { setMsg({ kind: 'error', text: d.error || 'Failed to save' }); return; }
    setMsg({ kind: 'success', text: 'Template saved!' });
    setWarnings(d.warnings ?? []);
    setActiveId(d.template?.id ?? activeId);
    fetchTemplates();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    await fetch('/api/letter-templates', { method: 'DELETE', headers, body: JSON.stringify({ id }) });
    if (activeId === id) newTemplate();
    fetchTemplates();
  };

  const handlePreview = () => {
    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  // Group placeholders by category
  const groups = TEMPLATE_PLACEHOLDERS.reduce<Record<string, typeof TEMPLATE_PLACEHOLDERS[number][]>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {} as any);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">Letter &amp; Invoice Templates</h1>
          <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5">Customize PDF templates per school using dynamic placeholders</p>
        </div>
        <button onClick={newTemplate} className="btn-primary flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Template
        </button>
      </div>

      <div className="flex gap-6">
        {/* Template list */}
        <div className="w-56 shrink-0 space-y-2">
          <div className="mb-3">
            <label className="label text-xs">Type</label>
            <select className="input-field text-sm" value={type} onChange={e => setType(e.target.value)}>
              {TEMPLATE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {builtIn && (
            <button onClick={() => selectTemplate('__default__', builtIn.name)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${activeId === '__default__' ? 'bg-brand-50 dark:bg-brand-950/30 border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300' : 'border-surface-200 dark:border-gray-700 text-surface-500 hover:border-brand-200'}`}>
              <div className="flex items-center gap-2">
                <span className="text-base">&#128196;</span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-xs">System Default</p>
                  <p className="text-[10px] text-surface-400">Fee Invoice</p>
                </div>
              </div>
            </button>
          )}
          {templates.map(t => (
            <div key={t.id}
              className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border cursor-pointer transition-all ${activeId === t.id ? 'bg-brand-50 dark:bg-brand-950/30 border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300' : 'border-surface-200 dark:border-gray-700 text-surface-500 hover:border-brand-200'}`}
              onClick={() => selectTemplate(t.id, t.name)}>
              <span className="text-base shrink-0">&#9998;&#65039;</span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-semibold">{t.name}</p>
                <p className="text-[10px] text-surface-400 capitalize">{t.templateType?.replace('_', ' ')}</p>
              </div>
              <button onClick={e => { e.stopPropagation(); handleDelete(t.id); }}
                className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-surface-300 hover:text-red-500 transition-all">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ))}
        </div>

        {/* Editor */}
        <div className="flex-1 min-w-0 space-y-4">
          {!activeId && !html ? (
            <div className="card p-12 text-center text-surface-400 dark:text-gray-500">
              <div className="text-5xl mb-4">&#128221;</div>
              <p className="font-semibold mb-1">Select a template to edit</p>
              <p className="text-sm">Or click &ldquo;New Template&rdquo; to start from scratch</p>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="flex items-center gap-3 flex-wrap">
                <input className="input-field flex-1 min-w-48" placeholder="Template name *" value={name} onChange={e => setName(e.target.value)} />
                <button onClick={handlePreview} className="btn-secondary flex items-center gap-1.5 text-sm">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  Preview HTML
                </button>
                <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-1.5 text-sm">
                  {saving ? 'Saving\u2026' : 'Save Template'}
                </button>
              </div>

              {/* Messages */}
              {msg && (
                <div className={`px-4 py-2 rounded-xl text-sm font-medium ${msg.kind === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'}`}>
                  {msg.text}
                </div>
              )}
              {warnings.length > 0 && (
                <div className="px-4 py-2 rounded-xl text-sm bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400">
                  &#9888;&#65039; {warnings.join(' \u00b7 ')}
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {/* HTML editor */}
                <div className="xl:col-span-2">
                  <label className="label mb-1.5 flex items-center gap-2">
                    HTML Template
                    {activeId === '__default__' && <span className="text-[10px] bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">Loaded from system default &mdash; save to create your custom copy</span>}
                  </label>
                  {loading ? (
                    <div className="h-96 rounded-xl bg-surface-50 dark:bg-gray-800/40 animate-pulse" />
                  ) : (
                    <textarea
                      ref={textareaRef}
                      className="input-field font-mono text-xs leading-relaxed w-full"
                      style={{ height: '520px', resize: 'vertical' }}
                      value={html}
                      onChange={e => setHtml(e.target.value)}
                      placeholder="Paste or write your HTML template here..."
                      spellCheck={false}
                    />
                  )}
                </div>

                {/* Placeholder reference */}
                <div className="space-y-3">
                  <p className="label">Available Placeholders</p>
                  <p className="text-xs text-surface-400 dark:text-gray-500">Click any placeholder to insert it at the cursor position</p>
                  {Object.entries(groups).map(([cat, items]) => (
                    <div key={cat}>
                      <p className="text-[10px] font-bold text-surface-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">{cat}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(items as any[]).map((p: any) => (
                          <button key={p.key} onClick={() => insertPlaceholder(p.key)}
                            title={p.label}
                            className="px-2 py-1 rounded-lg text-[11px] font-mono bg-surface-50 dark:bg-gray-800/60 border border-surface-200 dark:border-gray-700 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/30 hover:border-brand-300 transition-colors">
                            @@{p.key}@@
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
