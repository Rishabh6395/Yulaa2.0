'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/useApi';

const STATUS_COLORS: Record<string, string> = {
  submitted:    'badge-warning',
  under_review: 'badge-info',
  approved:     'badge-success',
  rejected:     'badge-danger',
};

const FLAG_COLORS: Record<string, string> = {
  error:   'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900',
  warning: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900',
};


export default function ApplicationDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  const [comment,    setComment]    = useState('');
  const [busy,       setBusy]       = useState(false);
  const [error,      setError]      = useState('');
  const [editMode,   setEditMode]   = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [saveOk,     setSaveOk]     = useState(false);

  // Edit state
  const [editParent,   setEditParent]   = useState({ parentName: '', parentPhone: '', parentEmail: '' });
  const [editChildren, setEditChildren] = useState<any[]>([]);

  // Class master: { grade, section } — drives both dropdowns
  const [classes,    setClasses]    = useState<{ id: string; grade: string; section: string }[]>([]);
  const [classGrades, setClassGrades] = useState<string[]>([]);

  const { data, isLoading, mutate } = useApi<{ application: any }>(`/api/admission/applications/${params.id}`);
  const app     = data?.application;
  const flags   = (app?.validationFlags as any[]) ?? [];
  const actions = app?.actions ?? [];
  const steps   = app?.workflow?.steps ?? [];

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Populate edit state when data loads
  useEffect(() => {
    if (!app) return;
    setEditParent({ parentName: app.parentName ?? '', parentPhone: app.parentPhone ?? '', parentEmail: app.parentEmail ?? '' });
    setEditChildren((app.children ?? []).map((c: any) => ({
      id:            c.id,
      firstName:     c.firstName ?? '',
      lastName:      c.lastName  ?? '',
      gender:        c.gender    ?? '',
      dateOfBirth:   c.dateOfBirth ? new Date(c.dateOfBirth).toISOString().split('T')[0] : '',
      classApplying: c.classApplying ?? '',
      section:       c.section ?? '',
      previousSchool: c.previousSchool ?? '',
    })));
  }, [app]);

  // Fetch class master for the school — used for both the grade and section dropdowns
  useEffect(() => {
    if (!token) return;
    fetch('/api/classes', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const list: { id: string; grade: string; section: string }[] = d.classes ?? [];
        setClasses(list);
        // Unique grades in the order they appear (API already sorts by grade asc)
        const seen = new Set<string>();
        const grades: string[] = [];
        for (const c of list) {
          if (!seen.has(c.grade)) { seen.add(c.grade); grades.push(c.grade); }
        }
        setClassGrades(grades);
      })
      .catch(() => {});
  }, [token]);

  const handleAction = async (action: 'approve' | 'reject') => {
    setBusy(true); setError('');
    const res = await fetch(`/api/admission/applications/${params.id}/action`, {
      method: 'POST', headers, body: JSON.stringify({ action, comment }),
    });
    const d = await res.json();
    if (!res.ok) { setError(d.error || `Failed to ${action} application — please try again`); setBusy(false); return; }
    mutate(); setBusy(false); setComment('');
  };

  const handleSaveEdits = async () => {
    setSaving(true); setError('');
    const res = await fetch(`/api/admission/applications/${params.id}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ ...editParent, children: editChildren }),
    });
    const d = await res.json();
    if (!res.ok) { setError(d.error || 'Failed to save changes — please try again'); setSaving(false); return; }
    setSaving(false); setSaveOk(true); setEditMode(false);
    setTimeout(() => setSaveOk(false), 3000);
    mutate();
  };

  // Exact-match sections from the class master for a given grade
  const sectionsForGrade = (grade: string): string[] =>
    classes.filter(c => c.grade === grade).map(c => c.section);

  if (isLoading) return <div className="card p-12 text-center text-surface-400 animate-pulse">Loading application…</div>;
  if (!app)      return <div className="card p-12 text-center text-surface-400">Application not found</div>;

  const isFinal    = app.status === 'approved' || app.status === 'rejected';
  const isFinalStep = !(steps.length > 0 && app.currentStep < steps[steps.length - 1]?.stepOrder);
  const childrenMissingSection = (app.children ?? []).filter((c: any) => !c.section?.trim());
  const riskColor  = app.riskScore >= 60 ? 'text-red-600' : app.riskScore >= 30 ? 'text-amber-600' : 'text-emerald-600';

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <button onClick={() => router.back()} className="text-sm text-surface-400 hover:text-gray-700 mb-2 flex items-center gap-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Back to queue
          </button>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">{app.parentName}</h1>
          <p className="text-sm text-surface-400 mt-0.5">{app.parentPhone}{app.parentEmail ? ` · ${app.parentEmail}` : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className={STATUS_COLORS[app.status] || 'badge-neutral'}>{app.status.replace('_', ' ')}</span>
            <p className={`text-2xl font-bold mt-2 ${riskColor}`}>{app.riskScore}<span className="text-sm font-normal text-surface-400">/100 risk</span></p>
          </div>
          {!isFinal && (
            <button onClick={() => setEditMode(e => !e)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${editMode ? 'border-brand-400 bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300' : 'border-surface-200 dark:border-gray-700 text-surface-500 dark:text-gray-400 hover:border-brand-300'}`}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              {editMode ? 'Cancel Edit' : 'Edit Details'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-600 flex items-center gap-2">
          {error}<button onClick={() => setError('')} className="ml-auto text-lg leading-none">×</button>
        </div>
      )}
      {saveOk && (
        <div className="px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-700 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
          Details saved successfully.
        </div>
      )}

      {/* AI flags */}
      {flags.length > 0 && (
        <div className="card p-5 space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            AI Validation Flags
          </h3>
          {flags.map((f: any, i: number) => (
            <div key={i} className={`text-xs px-3 py-2 rounded-lg border ${FLAG_COLORS[f.severity]}`}>
              <span className="font-bold uppercase mr-2">{f.severity}</span>
              Child {f.childIndex + 1}: {f.message}
            </div>
          ))}
        </div>
      )}

      {/* Parent details — editable */}
      <div className="card p-5 space-y-3">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Parent / Guardian</h3>
        {editMode ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-surface-400 mb-1">Full Name *</label>
              <input className="input w-full" value={editParent.parentName}
                onChange={e => setEditParent(p => ({ ...p, parentName: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-surface-400 mb-1">Phone *</label>
              <input className="input w-full" type="tel" inputMode="numeric" maxLength={10}
                value={editParent.parentPhone}
                onChange={e => setEditParent(p => ({ ...p, parentPhone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-surface-400 mb-1">Email</label>
              <input className="input w-full" type="email" value={editParent.parentEmail}
                onChange={e => setEditParent(p => ({ ...p, parentEmail: e.target.value }))} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div><p className="text-surface-400 text-xs">Name</p><p className="font-medium">{app.parentName}</p></div>
            <div><p className="text-surface-400 text-xs">Phone</p><p>{app.parentPhone}</p></div>
            {app.parentEmail && <div><p className="text-surface-400 text-xs">Email</p><p>{app.parentEmail}</p></div>}
          </div>
        )}
      </div>

      {/* Children — editable */}
      {editMode ? (
        editChildren.map((child, i) => {
          const sections = sectionsForGrade(child.classApplying);
          return (
            <div key={child.id} className="card p-5 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Child {i + 1}</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-surface-400 mb-1">First Name *</label>
                  <input className="input w-full" value={child.firstName}
                    onChange={e => setEditChildren(cs => cs.map((c, idx) => idx === i ? { ...c, firstName: e.target.value } : c))} />
                </div>
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Last Name</label>
                  <input className="input w-full" value={child.lastName}
                    onChange={e => setEditChildren(cs => cs.map((c, idx) => idx === i ? { ...c, lastName: e.target.value } : c))} />
                </div>
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Gender</label>
                  <select className="input w-full" value={child.gender}
                    onChange={e => setEditChildren(cs => cs.map((c, idx) => idx === i ? { ...c, gender: e.target.value } : c))}>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Date of Birth</label>
                  <input type="date" className="input w-full" value={child.dateOfBirth}
                    onChange={e => setEditChildren(cs => cs.map((c, idx) => idx === i ? { ...c, dateOfBirth: e.target.value } : c))} />
                </div>
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Class Applying *</label>
                  <select className="input w-full" value={child.classApplying}
                    onChange={e => setEditChildren(cs => cs.map((c, idx) =>
                      idx === i ? { ...c, classApplying: e.target.value, section: '' } : c))}>
                    <option value="">— Select class —</option>
                    {classGrades.length > 0
                      ? classGrades.map(g => <option key={g} value={g}>{g}</option>)
                      : <option disabled>No classes configured for this school</option>
                    }
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-surface-400 mb-1">
                    Section <span className="text-red-500">*</span>
                  </label>
                  {!child.classApplying ? (
                    <div className="input w-full bg-surface-50 dark:bg-gray-800/50 text-surface-400 text-sm flex items-center cursor-not-allowed select-none">
                      Select a class first
                    </div>
                  ) : sections.length > 0 ? (
                    <select className="input w-full" value={child.section}
                      onChange={e => setEditChildren(cs => cs.map((c, idx) => idx === i ? { ...c, section: e.target.value } : c))}>
                      <option value="">— Select section —</option>
                      {sections.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <input className="input w-full" placeholder="e.g. A" value={child.section}
                      onChange={e => setEditChildren(cs => cs.map((c, idx) => idx === i ? { ...c, section: e.target.value } : c))} />
                  )}
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-surface-400 mb-1">Previous School</label>
                  <input className="input w-full" value={child.previousSchool}
                    onChange={e => setEditChildren(cs => cs.map((c, idx) => idx === i ? { ...c, previousSchool: e.target.value } : c))} />
                </div>
              </div>
            </div>
          );
        })
      ) : (
        app.children?.map((child: any, i: number) => (
          <div key={child.id} className="card p-5 space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Child {i + 1} — {child.firstName} {child.lastName}</h3>
            <div className="grid grid-cols-3 gap-3 text-sm">
              {child.dateOfBirth && <div><p className="text-surface-400 text-xs">Date of Birth</p><p>{new Date(child.dateOfBirth).toLocaleDateString('en-IN')}</p></div>}
              {child.gender      && <div><p className="text-surface-400 text-xs">Gender</p><p className="capitalize">{child.gender}</p></div>}
              {child.classApplying && <div><p className="text-surface-400 text-xs">Class Applying</p><p>{child.classApplying}</p></div>}
              {child.section     && <div><p className="text-surface-400 text-xs">Section</p><p>{child.section}</p></div>}
              {child.aadhaarNo   && <div><p className="text-surface-400 text-xs">Aadhaar</p><p className="font-mono">{child.aadhaarNo}</p></div>}
              {child.previousSchool && <div className="col-span-2"><p className="text-surface-400 text-xs">Previous School</p><p>{child.previousSchool}</p></div>}
              {child.studentId   && <div><p className="text-surface-400 text-xs">Student ID</p><p className="text-brand-600 dark:text-brand-400 font-mono text-xs">{child.studentId}</p></div>}
            </div>
          </div>
        ))
      )}

      {/* Save edits button */}
      {editMode && (
        <button onClick={handleSaveEdits} disabled={saving}
          className="btn btn-primary w-full flex items-center justify-center gap-2">
          {saving
            ? <><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Saving…</>
            : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>Save Changes</>
          }
        </button>
      )}

      {/* Workflow steps */}
      {steps.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Approval Workflow</h3>
          <div className="space-y-2">
            {steps.map((s: any) => {
              const done   = app.currentStep > s.stepOrder || app.status === 'approved';
              const active = app.currentStep === s.stepOrder && !isFinal;
              return (
                <div key={s.id} className={`flex items-center gap-3 text-sm px-3 py-2 rounded-lg ${active ? 'bg-brand-50 dark:bg-brand-950/30' : ''}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${done ? 'bg-emerald-500 text-white' : active ? 'bg-brand-500 text-white' : 'bg-surface-100 text-surface-400'}`}>
                    {done ? '✓' : s.stepOrder}
                  </div>
                  <span className={active ? 'font-semibold text-brand-700 dark:text-brand-400' : done ? 'text-emerald-700 dark:text-emerald-400' : 'text-surface-400'}>{s.label}</span>
                  <span className="text-xs text-surface-400 ml-auto">{s.approverRole}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action timeline */}
      {actions.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Action History</h3>
          <div className="space-y-3">
            {actions.map((a: any) => (
              <div key={a.id} className="flex gap-3 text-sm">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${a.action === 'approve' ? 'bg-emerald-500' : a.action === 'reject' ? 'bg-red-500' : 'bg-surface-300'}`}/>
                <div>
                  <p>
                    <span className="font-medium capitalize">{a.action}d</span>
                    {a.actorUser && <span className="text-surface-400"> by {a.actorUser.firstName} {a.actorUser.lastName}</span>}
                  </p>
                  {a.comment && <p className="text-surface-400 text-xs mt-0.5">{a.comment}</p>}
                  <p className="text-surface-300 text-xs">{new Date(a.createdAt).toLocaleString('en-IN')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approve / Reject panel */}
      {!isFinal && (
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Take Action</h3>
          {error && <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-3 py-2 rounded-lg">{error}</div>}
          {isFinalStep && childrenMissingSection.length > 0 && (
            <div className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 rounded-lg flex items-start gap-2">
              <svg className="shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span>
                <strong>Section required before final approval.</strong> Please edit and assign a section for:{' '}
                {childrenMissingSection.map((c: any) => `${c.firstName} ${c.lastName}`.trim()).join(', ')}
              </span>
            </div>
          )}
          <textarea
            className="input-field" rows={2}
            placeholder="Add a comment (optional)…"
            value={comment} onChange={e => setComment(e.target.value)}
          />
          <div className="flex gap-3">
            <button onClick={() => handleAction('reject')} disabled={busy}
              className="flex-1 text-sm bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 px-4 py-2.5 rounded-xl hover:bg-red-100 font-medium transition-colors disabled:opacity-50">
              Reject
            </button>
            <button onClick={() => handleAction('approve')}
              disabled={busy || (isFinalStep && childrenMissingSection.length > 0)}
              className="flex-2 btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed">
              {busy ? 'Processing…' : isFinalStep ? 'Final Approve' : 'Advance to Next Step'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
