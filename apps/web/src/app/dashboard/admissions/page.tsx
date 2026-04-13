'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApi } from '@/hooks/useApi';
import Modal from '@/components/ui/Modal';

const STATUS_COLORS: Record<string, string> = {
  submitted:    'badge-warning',
  under_review: 'badge-info',
  approved:     'badge-success',
  rejected:     'badge-danger',
};

const RISK_COLOR = (score: number) =>
  score >= 60 ? 'text-red-600 dark:text-red-400' :
  score >= 30 ? 'text-amber-600 dark:text-amber-400' :
  'text-emerald-600 dark:text-emerald-400';

type FieldRule  = 'required' | 'optional' | 'hidden';
type FieldRules = Record<string, any>;

// Normalises both legacy string format and new object format { visible, editable, required }
function rule(rules: FieldRules, key: string): FieldRule {
  const v = rules[key];
  if (!v) return 'optional';
  if (typeof v === 'string') return v as FieldRule;
  if (!v.visible) return 'hidden';
  if (v.required) return 'required';
  return 'optional';
}
function isVisible(rules: FieldRules, key: string) { return rule(rules, key) !== 'hidden'; }

const GRADES = ['Nursery','LKG','UKG','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5',
                'Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12'];

// ── New Application Modal ─────────────────────────────────────────────────────

interface ChildEntry {
  name: string; grade: string; dob: string;
  gender: string; bloodGroup: string; previousSchool: string; medicalNotes: string;
}

function emptyChild(): ChildEntry {
  return { name: '', grade: '', dob: '', gender: '', bloodGroup: '', previousSchool: '', medicalNotes: '' };
}

function FieldLabel({ label, req }: { label: string; req: FieldRule }) {
  return (
    <label className="label">
      {label}
      {req === 'required'
        ? <span className="text-red-500 ml-0.5">*</span>
        : <span className="text-surface-400 font-normal ml-1">(optional)</span>
      }
    </label>
  );
}

// Self-contained modal — fetches its own form config on every open
function NewApplicationModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [fieldRules,  setFieldRules]  = useState<FieldRules>({});
  const [configReady, setConfigReady] = useState(false);
  const [parentName,  setParentName]  = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentOcc,   setParentOcc]   = useState('');
  const [address,     setAddress]     = useState('');
  const [children,    setChildren]    = useState<ChildEntry[]>([emptyChild()]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  // Fetch form config from super admin on every open
  useEffect(() => {
    if (!open) return;
    const user     = JSON.parse(localStorage.getItem('user') || '{}');
    const token    = localStorage.getItem('token');
    const schoolId = user.schoolId;
    if (!schoolId) { setConfigReady(true); return; }
    fetch(`/api/form-config?schoolId=${schoolId}&formId=admission`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const rules = d?.configs?.admission?.admin;
        if (rules) setFieldRules(rules);
      })
      .catch(() => {})
      .finally(() => setConfigReady(true));
  }, [open]);

  const addChild    = () => setChildren(c => [...c, emptyChild()]);
  const removeChild = (i: number) => setChildren(c => c.filter((_, idx) => idx !== i));
  const updateChild = (i: number, field: keyof ChildEntry, val: string) =>
    setChildren(c => c.map((ch, idx) => idx === i ? { ...ch, [field]: val } : ch));

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user     = JSON.parse(localStorage.getItem('user') || '{}');
      const token    = localStorage.getItem('token');
      const schoolId = user.schoolId;
      if (!schoolId) { setError('School ID not found. Please log in again.'); setLoading(false); return; }

      const res = await fetch('/api/admission/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          schoolId,
          parentName, parentPhone, parentEmail,
          parentOccupation: parentOcc,
          address,
          children: children.map(c => {
            const nameParts = c.name.trim().split(/\s+/);
            const firstName = nameParts[0] || '';
            const lastName  = nameParts.slice(1).join(' ') || nameParts[0] || '';
            return {
              firstName,
              lastName,
              dateOfBirth:    c.dob            || undefined,
              gender:         c.gender         || undefined,
              classApplying:  c.grade          || undefined,
              bloodGroup:     c.bloodGroup     || undefined,
              previousSchool: c.previousSchool || undefined,
              medicalNotes:   c.medicalNotes   || undefined,
            };
          }),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Submission failed'); setLoading(false); return; }
      onSuccess(); onClose();
    } catch { setError('Network error. Please try again.'); setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Admission Application" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Config loading spinner */}
        {!configReady && (
          <div className="flex items-center justify-center py-10 gap-3 text-surface-400">
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
            <span className="text-sm">Loading form configuration…</span>
          </div>
        )}

        {/* Form fields — only shown after config loaded */}
        {configReady && (
          <>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            {/* Parent / Guardian section */}
            <div>
              <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Parent / Guardian</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {isVisible(fieldRules, 'parentName') && (
                  <div>
                    <FieldLabel label="Full Name" req={rule(fieldRules, 'parentName')} />
                    <input className="input-field" value={parentName} onChange={e => setParentName(e.target.value)} placeholder="Parent full name" />
                  </div>
                )}
                {isVisible(fieldRules, 'parentPhone') && (
                  <div>
                    <FieldLabel label="Phone" req={rule(fieldRules, 'parentPhone')} />
                    <input className="input-field" type="tel" value={parentPhone} onChange={e => setParentPhone(e.target.value)} placeholder="10-digit mobile" />
                  </div>
                )}
                {isVisible(fieldRules, 'parentEmail') && (
                  <div className="sm:col-span-2">
                    <FieldLabel label="Email" req={rule(fieldRules, 'parentEmail')} />
                    <input className="input-field" type="email" value={parentEmail} onChange={e => setParentEmail(e.target.value)} placeholder="parent@email.com" />
                  </div>
                )}
                {isVisible(fieldRules, 'parentOccupation') && (
                  <div className="sm:col-span-2">
                    <FieldLabel label="Occupation" req={rule(fieldRules, 'parentOccupation')} />
                    <input className="input-field" value={parentOcc} onChange={e => setParentOcc(e.target.value)} placeholder="e.g. Engineer" />
                  </div>
                )}
                {isVisible(fieldRules, 'address') && (
                  <div className="sm:col-span-2">
                    <FieldLabel label="Residential Address" req={rule(fieldRules, 'address')} />
                    <textarea className="input-field" rows={2} value={address} onChange={e => setAddress(e.target.value)} placeholder="Full address" />
                  </div>
                )}
              </div>
            </div>

            {/* Children section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Children</p>
                <button type="button" onClick={addChild}
                  className="text-xs text-brand-600 dark:text-brand-400 font-medium hover:underline flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                  Add child
                </button>
              </div>

              {children.map((ch, i) => (
                <div key={i} className="p-4 rounded-xl border border-surface-200 dark:border-gray-700 space-y-3 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Child {i + 1}</span>
                    {children.length > 1 && (
                      <button type="button" onClick={() => removeChild(i)} className="text-red-500 hover:text-red-700 p-0.5">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {isVisible(fieldRules, 'childName') && (
                      <div className="col-span-2">
                        <FieldLabel label="Child Name" req={rule(fieldRules, 'childName')} />
                        <input className="input-field" value={ch.name} onChange={e => updateChild(i, 'name', e.target.value)} placeholder="Child full name" />
                      </div>
                    )}
                    {isVisible(fieldRules, 'gradeApplying') && (
                      <div>
                        <FieldLabel label="Applying for Class" req={rule(fieldRules, 'gradeApplying')} />
                        <select className="input-field" value={ch.grade} onChange={e => updateChild(i, 'grade', e.target.value)}>
                          <option value="">Select grade</option>
                          {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                    )}
                    {isVisible(fieldRules, 'childDOB') && (
                      <div>
                        <FieldLabel label="Date of Birth" req={rule(fieldRules, 'childDOB')} />
                        <input className="input-field" type="date" value={ch.dob} onChange={e => updateChild(i, 'dob', e.target.value)} />
                      </div>
                    )}
                    {isVisible(fieldRules, 'childGender') && (
                      <div>
                        <FieldLabel label="Gender" req={rule(fieldRules, 'childGender')} />
                        <select className="input-field" value={ch.gender} onChange={e => updateChild(i, 'gender', e.target.value)}>
                          <option value="">Select</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    )}
                    {isVisible(fieldRules, 'bloodGroup') && (
                      <div>
                        <FieldLabel label="Blood Group" req={rule(fieldRules, 'bloodGroup')} />
                        <select className="input-field" value={ch.bloodGroup} onChange={e => updateChild(i, 'bloodGroup', e.target.value)}>
                          <option value="">Select</option>
                          {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                    )}
                    {isVisible(fieldRules, 'previousSchool') && (
                      <div className="col-span-2">
                        <FieldLabel label="Previous School" req={rule(fieldRules, 'previousSchool')} />
                        <input className="input-field" value={ch.previousSchool} onChange={e => updateChild(i, 'previousSchool', e.target.value)} placeholder="Name of previous school (if any)" />
                      </div>
                    )}
                    {isVisible(fieldRules, 'medicalNotes') && (
                      <div className="col-span-2">
                        <FieldLabel label="Medical / Allergy Notes" req={rule(fieldRules, 'medicalNotes')} />
                        <textarea className="input-field" rows={2} value={ch.medicalNotes} onChange={e => updateChild(i, 'medicalNotes', e.target.value)} placeholder="Any medical conditions or allergies" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Footer buttons */}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !configReady}
            className="btn-primary flex-1 disabled:opacity-60"
          >
            {loading ? 'Submitting…' : 'Submit Application'}
          </button>
        </div>

      </form>
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdmissionsPage() {
  const [page,         setPage]         = useState(1);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showNewApp,   setShowNewApp]   = useState(false);

  const params = new URLSearchParams({ page: page.toString(), limit: '20' });
  if (search)       params.set('search', search);
  if (statusFilter) params.set('status', statusFilter);

  const { data, isLoading, mutate } = useApi<{ applications: any[]; total: number; totalPages: number }>(
    `/api/admission/applications?${params}`
  );
  const applications = data?.applications ?? [];
  const total        = data?.total ?? 0;
  const totalPages   = data?.totalPages ?? 1;

  return (
    <div className="space-y-6 animate-fade-in">
      <NewApplicationModal
        open={showNewApp}
        onClose={() => setShowNewApp(false)}
        onSuccess={() => mutate()}
      />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Admissions</h1>
          <p className="text-sm text-surface-400 mt-0.5">{total} applications total</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowNewApp(true)}
            className="btn-primary text-sm flex items-center gap-2"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            New Application
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text" placeholder="Search by name or phone…" className="input-field max-w-xs"
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        <select className="input-field max-w-[170px]" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Parent</th>
                <th>Children</th>
                <th>Classes</th>
                <th>Risk</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j}><div className="h-4 bg-surface-100 rounded animate-pulse w-20"/></td>
                    ))}
                  </tr>
                ))
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-surface-400">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-2 opacity-30">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                    No applications found
                  </td>
                </tr>
              ) : applications.map(app => (
                <tr key={app.id}>
                  <td>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{app.parent_name}</p>
                    <p className="text-xs text-surface-400">{app.parent_phone}</p>
                  </td>
                  <td><span className="font-medium">{app.children_count}</span></td>
                  <td className="text-xs text-surface-400 max-w-[120px] truncate">
                    {app.children?.map((c: any) => c.class).join(', ') || '—'}
                  </td>
                  <td>
                    <span className={`text-xs font-bold ${RISK_COLOR(app.risk_score)}`}>{app.risk_score}</span>
                  </td>
                  <td>
                    <span className={STATUS_COLORS[app.status] || 'badge-neutral'}>
                      {app.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="text-xs text-surface-400">
                    {new Date(app.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td>
                    <Link
                      href={`/dashboard/admissions/${app.id}`}
                      className="text-xs bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400 px-2.5 py-1 rounded-lg hover:bg-brand-100 font-medium transition-colors"
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-100 dark:border-gray-700">
            <p className="text-xs text-surface-400">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button disabled={page <= 1}          onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs py-1.5 px-3">Previous</button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs py-1.5 px-3">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
