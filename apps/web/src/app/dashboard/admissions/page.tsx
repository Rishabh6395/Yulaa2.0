'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApi } from '@/hooks/useApi';
import { validatePhone } from '@/utils/phone';
import Modal from '@/components/ui/Modal';
import PageError from '@/components/ui/PageError';

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
function ruleFor(rules: FieldRules, key: string): FieldRule {
  const v = rules[key];
  if (!v) return 'optional';
  if (typeof v === 'string') return v as FieldRule;
  if (!v.visible) return 'hidden';
  if (v.required) return 'required';
  return 'optional';
}
function isVisible(rules: FieldRules, key: string) { return ruleFor(rules, key) !== 'hidden'; }
function isRequired(rules: FieldRules, key: string) { return ruleFor(rules, key) === 'required'; }

// Fallbacks used only when the school hasn't configured masters yet
const FALLBACK_GRADES  = ['Nursery','LKG','UKG','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5',
                          'Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12'];
const FALLBACK_GENDERS = ['Male','Female','Other'];
const FALLBACK_BLOODS  = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

// Static options for fields without dedicated master API routes
const OPTS_CATEGORY   = ['General','OBC','SC','ST','EWS','NRI','Management Quota'];
const OPTS_RELIGION   = ['Hindu','Muslim','Christian','Sikh','Buddhist','Jain','Other'];
const OPTS_TONGUE     = ['Hindi','English','Tamil','Telugu','Kannada','Malayalam','Bengali','Marathi','Gujarati','Punjabi','Other'];
const OPTS_BOARDING   = ['Day Scholar','Day Boarder','Full Boarder'];
const OPTS_DIET       = ['Vegetarian','Non-Vegetarian','Vegan','Jain Vegetarian'];
const OPTS_DISABILITY = ['None','Visual','Hearing','Locomotor','Learning Disability','Other'];
const OPTS_LEARNING   = ['None','Regular Support','Special Education','Resource Room'];
const OPTS_TRANSPORT  = ['Yes','No'];
const OPTS_BOARD      = ['CBSE','ICSE','State Board','IB','Cambridge','NIOS','Other'];
const OPTS_ADM_CAT    = ['General','OBC','SC','ST','EWS','RTE','Management Quota','NRI'];

// Helper: parse masters array from API result
function parseMasterNames(value: any, key: string): string[] {
  return (value?.[key] ?? [])
    .filter((g: any) => g.isActive !== false)
    .sort((a: any, b: any) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99))
    .map((g: any) => String(g.name));
}

const ADMIN_ROLES = ['super_admin', 'school_admin', 'principal', 'teacher'];

// ── Child record ──────────────────────────────────────────────────────────────
interface ChildEntry {
  // Core (DB columns)
  name:           string;
  grade:          string;
  dob:            string;
  gender:         string;
  aadhaarNo:      string;
  previousSchool: string;
  photoUrl:       string;
  // Extended (customFieldValues)
  bloodGroup:         string;
  category:           string;
  religion:           string;
  nationality:        string;
  motherTongue:       string;
  admissionCategory:  string;
  previousSchoolBoard:string;
  previousClass:      string;
  siblingAdmissionNo: string;
  boardingType:       string;
  dietType:           string;
  disabilityType:     string;
  learningSupport:    string;
  transportRequired:  string;
  entranceTestScore:  string;
  passportNo:         string;
  medicalNotes:       string;
}

function emptyChild(): ChildEntry {
  return {
    name: '', grade: '', dob: '', gender: '', aadhaarNo: '',
    previousSchool: '', photoUrl: '',
    bloodGroup: '', category: '', religion: '', nationality: '',
    motherTongue: '', admissionCategory: '', previousSchoolBoard: '',
    previousClass: '', siblingAdmissionNo: '', boardingType: '',
    dietType: '', disabilityType: '', learningSupport: '',
    transportRequired: '', entranceTestScore: '', passportNo: '',
    medicalNotes: '',
  };
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

// ── New Application Modal ─────────────────────────────────────────────────────
function NewApplicationModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [fieldRules,    setFieldRules]    = useState<FieldRules>({});
  const [configReady,   setConfigReady]   = useState(false);
  const [genderOptions, setGenderOptions] = useState<string[]>(FALLBACK_GENDERS);
  const [bloodOptions,  setBloodOptions]  = useState<string[]>(FALLBACK_BLOODS);
  const [gradeOptions,  setGradeOptions]  = useState<string[]>(FALLBACK_GRADES);
  const [schools,       setSchools]       = useState<{ id: string; name: string }[]>([]);
  const [selectedSchool, setSelectedSchool] = useState('');

  // ── Parent / Guardian ─────────────────────────────────────────────────────
  const [parentName,  setParentName]  = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentOcc,   setParentOcc]   = useState('');
  const [address,     setAddress]     = useState('');

  // ── Father ────────────────────────────────────────────────────────────────
  const [fatherName, setFatherName] = useState('');
  const [fatherPhone, setFatherPhone] = useState('');
  const [fatherEmail, setFatherEmail] = useState('');
  const [fatherOcc, setFatherOcc] = useState('');

  // ── Mother ────────────────────────────────────────────────────────────────
  const [motherName, setMotherName] = useState('');
  const [motherPhone, setMotherPhone] = useState('');
  const [motherEmail, setMotherEmail] = useState('');
  const [motherOcc, setMotherOcc] = useState('');

  const [children,  setChildren]  = useState<ChildEntry[]>([emptyChild()]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const [isParentRole, setIsParentRole] = useState(false);

  useEffect(() => {
    if (!open) return;

    setFieldRules({});
    setConfigReady(false);
    setGenderOptions(FALLBACK_GENDERS);
    setBloodOptions(FALLBACK_BLOODS);
    setGradeOptions(FALLBACK_GRADES);

    const stored   = localStorage.getItem('user');
    const token    = localStorage.getItem('token') ?? '';
    const user     = stored ? JSON.parse(stored) : {};
    const roleCode = user.primaryRole ?? '';
    const isParent = !ADMIN_ROLES.includes(roleCode);
    setIsParentRole(isParent);

    if (isParent) {
      setParentName(`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim());
      setParentPhone(user.phone ?? '');
      setParentEmail(user.email ?? '');
    }

    // schoolId always comes from the JWT-backed user object — never from URL params
    const schoolId = user.schoolId;
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    const qs       = schoolId ? `?schoolId=${schoolId}` : '';

    if (isParent) {
      fetch('/api/admission/schools')
        .then(r => r.json())
        .then(d => {
          if (d.schools?.length > 0) { setSchools(d.schools); }
          else { setError('No schools are currently available for admission. Please contact support.'); }
        })
        .catch(() => setError('Could not load schools — please check your connection and try again'));
    } else {
      setSelectedSchool(schoolId ?? '');
    }

    const ROLE_MAP: Record<string, string> = {
      super_admin: 'admin', school_admin: 'admin', principal: 'admin',
      hod: 'admin', vice_principal: 'admin', teacher: 'teacher',
      student: 'student', parent: 'applicant', applicant: 'applicant',
    };
    const configRole = ROLE_MAP[roleCode] ?? 'admin';

    Promise.allSettled([
      fetch(`/api/form-config?schoolId=${schoolId}&formId=admission_form`, { headers }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/masters/gender${qs}`,       { headers }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/masters/blood-groups${qs}`, { headers }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/masters/grades${qs}`,       { headers }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([cfgRes, genderRes, bloodRes, gradeRes]) => {
      const cfgVal = cfgRes.status === 'fulfilled' ? cfgRes.value : null;
      const rules  = cfgVal?.configs?.admission_form?.[configRole]
                  ?? cfgVal?.configs?.admission_form?.admin;
      if (rules) setFieldRules(rules);

      const gItems = parseMasterNames(genderRes.status === 'fulfilled' ? genderRes.value : null, 'genderMasters');
      if (gItems.length > 0) setGenderOptions(gItems);

      const bItems = parseMasterNames(bloodRes.status === 'fulfilled' ? bloodRes.value : null, 'bloodGroupMasters');
      if (bItems.length > 0) setBloodOptions(bItems);

      const grItems = parseMasterNames(gradeRes.status === 'fulfilled' ? gradeRes.value : null, 'gradeMasters');
      if (grItems.length > 0) setGradeOptions(grItems);
    }).finally(() => setConfigReady(true));
  }, [open]);

  // When parent role selects a school, re-fetch masters for that school
  useEffect(() => {
    if (!isParentRole || !selectedSchool) return;
    const token   = localStorage.getItem('token') ?? '';
    const headers = { Authorization: `Bearer ${token}` };
    const qs      = `?schoolId=${selectedSchool}`;
    Promise.allSettled([
      fetch(`/api/masters/grades${qs}`,       { headers }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/masters/gender${qs}`,       { headers }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/masters/blood-groups${qs}`, { headers }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([gradeRes, genderRes, bloodRes]) => {
      const grItems = parseMasterNames(gradeRes.status === 'fulfilled' ? gradeRes.value : null, 'gradeMasters');
      setGradeOptions(grItems.length > 0 ? grItems : FALLBACK_GRADES);
      const gItems = parseMasterNames(genderRes.status === 'fulfilled' ? genderRes.value : null, 'genderMasters');
      if (gItems.length > 0) setGenderOptions(gItems);
      const bItems = parseMasterNames(bloodRes.status === 'fulfilled' ? bloodRes.value : null, 'bloodGroupMasters');
      if (bItems.length > 0) setBloodOptions(bItems);
    });
  }, [selectedSchool, isParentRole]);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setParentName(''); setParentPhone(''); setParentEmail('');
      setParentOcc('');  setAddress('');
      setFatherName(''); setFatherPhone(''); setFatherEmail(''); setFatherOcc('');
      setMotherName(''); setMotherPhone(''); setMotherEmail(''); setMotherOcc('');
      setChildren([emptyChild()]);
      setSelectedSchool(''); setSchools([]); setError(''); setIsParentRole(false);
    }
  }, [open]);

  const addChild    = () => setChildren(c => [...c, emptyChild()]);
  const removeChild = (i: number) => setChildren(c => c.filter((_, idx) => idx !== i));
  const updateChild = (i: number, field: keyof ChildEntry, val: string) =>
    setChildren(c => c.map((ch, idx) => idx === i ? { ...ch, [field]: val } : ch));

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const token    = localStorage.getItem('token');
      const schoolId = selectedSchool;
      if (!schoolId) { setError('Please select a school.'); setLoading(false); return; }

      // Extended parent fields go in application-level customFieldValues
      const parentCustom: Record<string, string> = {};
      if (fatherName)  parentCustom['fatherName']  = fatherName;
      if (fatherPhone) parentCustom['fatherPhone'] = fatherPhone;
      if (fatherEmail) parentCustom['fatherEmail'] = fatherEmail;
      if (fatherOcc)   parentCustom['fatherOccupation'] = fatherOcc;
      if (motherName)  parentCustom['motherName']  = motherName;
      if (motherPhone) parentCustom['motherPhone'] = motherPhone;
      if (motherEmail) parentCustom['motherEmail'] = motherEmail;
      if (motherOcc)   parentCustom['motherOccupation'] = motherOcc;

      const res = await fetch('/api/admission/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          schoolId,
          parentName,
          parentPhone,
          parentEmail,
          parentOccupation: parentOcc,
          residentialAddress: address,
          ...(Object.keys(parentCustom).length > 0 ? { customFieldValues: parentCustom } : {}),
          children: children.map(c => {
            const nameParts = c.name.trim().split(/\s+/);
            const firstName = nameParts[0] || '';
            const lastName  = nameParts.slice(1).join(' ') || nameParts[0] || '';

            // Extended child fields go in child-level customFieldValues
            const childCustom: Record<string, string> = {};
            if (c.bloodGroup)         childCustom['bloodGroup']          = c.bloodGroup;
            if (c.category)           childCustom['category']            = c.category;
            if (c.religion)           childCustom['religion']            = c.religion;
            if (c.nationality)        childCustom['nationality']         = c.nationality;
            if (c.motherTongue)       childCustom['motherTongue']        = c.motherTongue;
            if (c.admissionCategory)  childCustom['admissionCategory']   = c.admissionCategory;
            if (c.previousSchoolBoard)childCustom['previousSchoolBoard'] = c.previousSchoolBoard;
            if (c.previousClass)      childCustom['previousClass']       = c.previousClass;
            if (c.siblingAdmissionNo) childCustom['siblingAdmissionNo']  = c.siblingAdmissionNo;
            if (c.boardingType)       childCustom['boardingType']        = c.boardingType;
            if (c.dietType)           childCustom['dietType']            = c.dietType;
            if (c.disabilityType)     childCustom['disabilityType']      = c.disabilityType;
            if (c.learningSupport)    childCustom['learningSupport']     = c.learningSupport;
            if (c.transportRequired)  childCustom['transportRequired']   = c.transportRequired;
            if (c.entranceTestScore)  childCustom['entranceTestScore']   = c.entranceTestScore;
            if (c.passportNo)         childCustom['passportNo']          = c.passportNo;
            if (c.medicalNotes)       childCustom['medicalNotes']        = c.medicalNotes;

            return {
              firstName,
              lastName,
              dateOfBirth:    c.dob            || undefined,
              gender:         c.gender         || undefined,
              classApplying:  c.grade          || undefined,
              aadhaarNo:      c.aadhaarNo      || undefined,
              previousSchool: c.previousSchool || undefined,
              photoUrl:       c.photoUrl       || undefined,
              ...(Object.keys(childCustom).length > 0 ? { customFieldValues: childCustom } : {}),
            };
          }),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Submission failed'); setLoading(false); return; }
      onSuccess(); onClose();
    } catch { setError('Network error. Please try again.'); setLoading(false); }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Modal open={open} onClose={onClose} title="New Admission Application" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-5 max-h-[80vh] overflow-y-auto pr-1">

        {!configReady && (
          <div className="flex items-center justify-center py-10 gap-3 text-surface-400">
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
            <span className="text-sm">Loading form configuration…</span>
          </div>
        )}

        {configReady && (
          <>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2 rounded-lg">{error}</p>
            )}

            {/* School selection — parent role only */}
            {isParentRole && (
              <div>
                <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">Select School *</p>
                {schools.length === 0 ? (
                  <p className="text-sm text-surface-400 py-3 text-center">No schools found.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {schools.map(s => (
                      <button key={s.id} type="button" onClick={() => setSelectedSchool(s.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm ${
                          selectedSchool === s.id
                            ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300'
                            : 'border-surface-100 dark:border-gray-700 hover:border-brand-200'
                        }`}>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{s.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Parent / Guardian ─────────────────────────────────────── */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Parent / Guardian</p>
                {isParentRole && (
                  <span className="text-xs text-brand-600 dark:text-brand-400 flex items-center gap-1">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                    Auto-filled
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {isVisible(fieldRules, 'parentName') && (
                  <div>
                    <FieldLabel label="Full Name" req={ruleFor(fieldRules, 'parentName')} />
                    <input className="input-field" value={parentName}
                      onChange={e => setParentName(e.target.value)} placeholder="Parent full name"
                      readOnly={isParentRole}
                      style={isParentRole ? { background: 'var(--surface-50,#f8fafc)', cursor: 'default' } : undefined}
                    />
                  </div>
                )}
                {isVisible(fieldRules, 'parentPhone') && (() => {
                  const pv = parentPhone ? validatePhone(parentPhone) : null;
                  return (
                    <div>
                      <FieldLabel label="Phone" req={ruleFor(fieldRules, 'parentPhone')} />
                      <input
                        className={`input-field ${parentPhone && !pv?.valid ? 'border-amber-400' : parentPhone && pv?.valid ? 'border-emerald-400' : ''}`}
                        type="tel" value={parentPhone}
                        onChange={e => !isParentRole && setParentPhone(e.target.value)}
                        placeholder="9876543210" readOnly={isParentRole && !!parentPhone}
                      />
                      {parentPhone && !pv?.valid && !isParentRole && (
                        <p className="text-xs text-amber-600 mt-1">{pv?.error}</p>
                      )}
                    </div>
                  );
                })()}
                {isVisible(fieldRules, 'parentEmail') && (
                  <div className="sm:col-span-2">
                    <FieldLabel label="Email" req={ruleFor(fieldRules, 'parentEmail')} />
                    <input className="input-field" type="email" value={parentEmail}
                      onChange={e => !isParentRole && setParentEmail(e.target.value)}
                      placeholder="parent@email.com" readOnly={isParentRole}
                    />
                  </div>
                )}
                {isVisible(fieldRules, 'parentOccupation') && (
                  <div className="sm:col-span-2">
                    <FieldLabel label="Occupation" req={ruleFor(fieldRules, 'parentOccupation')} />
                    <input className="input-field" value={parentOcc} onChange={e => setParentOcc(e.target.value)} placeholder="e.g. Engineer" />
                  </div>
                )}
                {isVisible(fieldRules, 'address') && (
                  <div className="sm:col-span-2">
                    <FieldLabel label="Residential Address" req={ruleFor(fieldRules, 'address')} />
                    <textarea className="input-field" rows={2} value={address} onChange={e => setAddress(e.target.value)} placeholder="Full address" />
                  </div>
                )}
              </div>
            </section>

            {/* ── Father Details ────────────────────────────────────────── */}
            {(isVisible(fieldRules, 'fatherName') || isVisible(fieldRules, 'fatherPhone') ||
              isVisible(fieldRules, 'fatherEmail') || isVisible(fieldRules, 'fatherOccupation')) && (
              <section>
                <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">Father&apos;s Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {isVisible(fieldRules, 'fatherName') && (
                    <div>
                      <FieldLabel label="Father's Full Name" req={ruleFor(fieldRules, 'fatherName')} />
                      <input className="input-field" value={fatherName} onChange={e => setFatherName(e.target.value)} placeholder="Father's name" />
                    </div>
                  )}
                  {isVisible(fieldRules, 'fatherPhone') && (
                    <div>
                      <FieldLabel label="Father's Phone" req={ruleFor(fieldRules, 'fatherPhone')} />
                      <input className="input-field" type="tel" value={fatherPhone} onChange={e => setFatherPhone(e.target.value)} placeholder="Father's phone" />
                    </div>
                  )}
                  {isVisible(fieldRules, 'fatherEmail') && (
                    <div>
                      <FieldLabel label="Father's Email" req={ruleFor(fieldRules, 'fatherEmail')} />
                      <input className="input-field" type="email" value={fatherEmail} onChange={e => setFatherEmail(e.target.value)} placeholder="Father's email" />
                    </div>
                  )}
                  {isVisible(fieldRules, 'fatherOccupation') && (
                    <div>
                      <FieldLabel label="Father's Occupation" req={ruleFor(fieldRules, 'fatherOccupation')} />
                      <input className="input-field" value={fatherOcc} onChange={e => setFatherOcc(e.target.value)} placeholder="Occupation" />
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ── Mother Details ────────────────────────────────────────── */}
            {(isVisible(fieldRules, 'motherName') || isVisible(fieldRules, 'motherPhone') ||
              isVisible(fieldRules, 'motherEmail') || isVisible(fieldRules, 'motherOccupation')) && (
              <section>
                <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">Mother&apos;s Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {isVisible(fieldRules, 'motherName') && (
                    <div>
                      <FieldLabel label="Mother's Full Name" req={ruleFor(fieldRules, 'motherName')} />
                      <input className="input-field" value={motherName} onChange={e => setMotherName(e.target.value)} placeholder="Mother's name" />
                    </div>
                  )}
                  {isVisible(fieldRules, 'motherPhone') && (
                    <div>
                      <FieldLabel label="Mother's Phone" req={ruleFor(fieldRules, 'motherPhone')} />
                      <input className="input-field" type="tel" value={motherPhone} onChange={e => setMotherPhone(e.target.value)} placeholder="Mother's phone" />
                    </div>
                  )}
                  {isVisible(fieldRules, 'motherEmail') && (
                    <div>
                      <FieldLabel label="Mother's Email" req={ruleFor(fieldRules, 'motherEmail')} />
                      <input className="input-field" type="email" value={motherEmail} onChange={e => setMotherEmail(e.target.value)} placeholder="Mother's email" />
                    </div>
                  )}
                  {isVisible(fieldRules, 'motherOccupation') && (
                    <div>
                      <FieldLabel label="Mother's Occupation" req={ruleFor(fieldRules, 'motherOccupation')} />
                      <input className="input-field" value={motherOcc} onChange={e => setMotherOcc(e.target.value)} placeholder="Occupation" />
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ── Children ──────────────────────────────────────────────── */}
            <section>
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
                    {/* Core fields */}
                    {isVisible(fieldRules, 'childName') && (
                      <div className="col-span-2">
                        <FieldLabel label="Child Full Name" req={ruleFor(fieldRules, 'childName')} />
                        <input className="input-field" value={ch.name} onChange={e => updateChild(i, 'name', e.target.value)} placeholder="Child full name" />
                      </div>
                    )}
                    {isVisible(fieldRules, 'gradeApplying') && (
                      <div>
                        <FieldLabel label="Applying for Class" req={ruleFor(fieldRules, 'gradeApplying')} />
                        <select className="input-field" value={ch.grade} onChange={e => updateChild(i, 'grade', e.target.value)}>
                          <option value="">Select grade</option>
                          {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                    )}
                    {isVisible(fieldRules, 'childDOB') && (
                      <div>
                        <FieldLabel label="Date of Birth" req={ruleFor(fieldRules, 'childDOB')} />
                        <input className="input-field" type="date" value={ch.dob} onChange={e => updateChild(i, 'dob', e.target.value)} />
                      </div>
                    )}
                    {isVisible(fieldRules, 'childGender') && (
                      <div>
                        <FieldLabel label="Gender" req={ruleFor(fieldRules, 'childGender')} />
                        <select className="input-field" value={ch.gender} onChange={e => updateChild(i, 'gender', e.target.value)}>
                          <option value="">Select</option>
                          {genderOptions.map(g => <option key={g} value={g.toLowerCase()}>{g}</option>)}
                        </select>
                      </div>
                    )}
                    {isVisible(fieldRules, 'aadhaarNo') && (
                      <div>
                        <FieldLabel label="Aadhaar Number" req={ruleFor(fieldRules, 'aadhaarNo')} />
                        <input className="input-field font-mono" maxLength={12} pattern="\d{12}"
                          placeholder="12-digit number" value={ch.aadhaarNo}
                          onChange={e => updateChild(i, 'aadhaarNo', e.target.value.replace(/\D/g, '').slice(0, 12))} />
                        {ch.aadhaarNo && ch.aadhaarNo.length !== 12 && (
                          <p className="text-xs text-amber-600 mt-1">Must be exactly 12 digits</p>
                        )}
                      </div>
                    )}
                    {isVisible(fieldRules, 'bloodGroup') && (
                      <div>
                        <FieldLabel label="Blood Group" req={ruleFor(fieldRules, 'bloodGroup')} />
                        <select className="input-field" value={ch.bloodGroup} onChange={e => updateChild(i, 'bloodGroup', e.target.value)}>
                          <option value="">Select</option>
                          {bloodOptions.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                    )}
                    {isVisible(fieldRules, 'category') && (
                      <div>
                        <FieldLabel label="Category" req={ruleFor(fieldRules, 'category')} />
                        <select className="input-field" value={ch.category} onChange={e => updateChild(i, 'category', e.target.value)}>
                          <option value="">Select</option>
                          {OPTS_CATEGORY.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    )}
                    {isVisible(fieldRules, 'admissionCategory') && (
                      <div>
                        <FieldLabel label="Admission Category" req={ruleFor(fieldRules, 'admissionCategory')} />
                        <select className="input-field" value={ch.admissionCategory} onChange={e => updateChild(i, 'admissionCategory', e.target.value)}>
                          <option value="">Select</option>
                          {OPTS_ADM_CAT.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    )}
                    {isVisible(fieldRules, 'religion') && (
                      <div>
                        <FieldLabel label="Religion" req={ruleFor(fieldRules, 'religion')} />
                        <select className="input-field" value={ch.religion} onChange={e => updateChild(i, 'religion', e.target.value)}>
                          <option value="">Select</option>
                          {OPTS_RELIGION.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    )}
                    {isVisible(fieldRules, 'nationality') && (
                      <div>
                        <FieldLabel label="Nationality" req={ruleFor(fieldRules, 'nationality')} />
                        <input className="input-field" value={ch.nationality} onChange={e => updateChild(i, 'nationality', e.target.value)} placeholder="e.g. Indian" />
                      </div>
                    )}
                    {isVisible(fieldRules, 'motherTongue') && (
                      <div>
                        <FieldLabel label="Mother Tongue" req={ruleFor(fieldRules, 'motherTongue')} />
                        <select className="input-field" value={ch.motherTongue} onChange={e => updateChild(i, 'motherTongue', e.target.value)}>
                          <option value="">Select</option>
                          {OPTS_TONGUE.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    )}
                    {isVisible(fieldRules, 'previousSchool') && (
                      <div className="col-span-2">
                        <FieldLabel label="Previous School" req={ruleFor(fieldRules, 'previousSchool')} />
                        <input className="input-field" value={ch.previousSchool} onChange={e => updateChild(i, 'previousSchool', e.target.value)} placeholder="Name of previous school (if any)" />
                      </div>
                    )}
                    {isVisible(fieldRules, 'previousSchoolBoard') && (
                      <div>
                        <FieldLabel label="Previous School Board" req={ruleFor(fieldRules, 'previousSchoolBoard')} />
                        <select className="input-field" value={ch.previousSchoolBoard} onChange={e => updateChild(i, 'previousSchoolBoard', e.target.value)}>
                          <option value="">Select</option>
                          {OPTS_BOARD.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    )}
                    {isVisible(fieldRules, 'previousClass') && (
                      <div>
                        <FieldLabel label="Class Last Studied" req={ruleFor(fieldRules, 'previousClass')} />
                        <input className="input-field" value={ch.previousClass} onChange={e => updateChild(i, 'previousClass', e.target.value)} placeholder="e.g. Grade 4" />
                      </div>
                    )}
                    {isVisible(fieldRules, 'siblingAdmissionNo') && (
                      <div>
                        <FieldLabel label="Sibling Admission No." req={ruleFor(fieldRules, 'siblingAdmissionNo')} />
                        <input className="input-field" value={ch.siblingAdmissionNo} onChange={e => updateChild(i, 'siblingAdmissionNo', e.target.value)} placeholder="Sibling's admission number" />
                      </div>
                    )}
                    {isVisible(fieldRules, 'boardingType') && (
                      <div>
                        <FieldLabel label="Boarding Type" req={ruleFor(fieldRules, 'boardingType')} />
                        <select className="input-field" value={ch.boardingType} onChange={e => updateChild(i, 'boardingType', e.target.value)}>
                          <option value="">Select</option>
                          {OPTS_BOARDING.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    )}
                    {isVisible(fieldRules, 'dietType') && (
                      <div>
                        <FieldLabel label="Dietary Preference" req={ruleFor(fieldRules, 'dietType')} />
                        <select className="input-field" value={ch.dietType} onChange={e => updateChild(i, 'dietType', e.target.value)}>
                          <option value="">Select</option>
                          {OPTS_DIET.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    )}
                    {isVisible(fieldRules, 'disabilityType') && (
                      <div>
                        <FieldLabel label="Disability / Special Need" req={ruleFor(fieldRules, 'disabilityType')} />
                        <select className="input-field" value={ch.disabilityType} onChange={e => updateChild(i, 'disabilityType', e.target.value)}>
                          <option value="">Select</option>
                          {OPTS_DISABILITY.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    )}
                    {isVisible(fieldRules, 'learningSupport') && (
                      <div>
                        <FieldLabel label="Learning Support Required" req={ruleFor(fieldRules, 'learningSupport')} />
                        <select className="input-field" value={ch.learningSupport} onChange={e => updateChild(i, 'learningSupport', e.target.value)}>
                          <option value="">Select</option>
                          {OPTS_LEARNING.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    )}
                    {isVisible(fieldRules, 'transportRequired') && (
                      <div>
                        <FieldLabel label="Transport Required" req={ruleFor(fieldRules, 'transportRequired')} />
                        <select className="input-field" value={ch.transportRequired} onChange={e => updateChild(i, 'transportRequired', e.target.value)}>
                          <option value="">Select</option>
                          {OPTS_TRANSPORT.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    )}
                    {isVisible(fieldRules, 'entranceTestScore') && (
                      <div>
                        <FieldLabel label="Entrance Test Score" req={ruleFor(fieldRules, 'entranceTestScore')} />
                        <input className="input-field" type="number" min="0" value={ch.entranceTestScore} onChange={e => updateChild(i, 'entranceTestScore', e.target.value)} placeholder="0–100" />
                      </div>
                    )}
                    {isVisible(fieldRules, 'passportNo') && (
                      <div>
                        <FieldLabel label="Passport Number" req={ruleFor(fieldRules, 'passportNo')} />
                        <input className="input-field" value={ch.passportNo} onChange={e => updateChild(i, 'passportNo', e.target.value)} placeholder="Passport number" />
                      </div>
                    )}
                    {isVisible(fieldRules, 'medicalNotes') && (
                      <div className="col-span-2">
                        <FieldLabel label="Medical / Allergy Notes" req={ruleFor(fieldRules, 'medicalNotes')} />
                        <textarea className="input-field" rows={2} value={ch.medicalNotes} onChange={e => updateChild(i, 'medicalNotes', e.target.value)} placeholder="Any medical conditions or allergies" />
                      </div>
                    )}
                    {isVisible(fieldRules, 'childPhoto') && (
                      <div className="col-span-2">
                        <FieldLabel label="Photo of Child" req={ruleFor(fieldRules, 'childPhoto')} />
                        <input type="file" accept="image/*" className="input-field text-sm py-1.5"
                          onChange={async e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const token = localStorage.getItem('token') ?? '';
                            const fd = new FormData();
                            fd.append('file', file);
                            const res = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
                            const data = await res.json();
                            if (data.url) updateChild(i, 'photoUrl', data.url);
                          }}
                        />
                        {ch.photoUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={ch.photoUrl} alt="Child" className="mt-2 h-16 w-16 rounded-lg object-cover border border-surface-200 dark:border-gray-700" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </section>
          </>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading || !configReady || (isParentRole && !selectedSchool)}
            className="btn-primary flex-1 disabled:opacity-60">
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
  const [isParentView, setIsParentView] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      const user = JSON.parse(stored);
      setIsParentView(!ADMIN_ROLES.includes(user.primaryRole ?? ''));
    }
  }, []);

  const params = new URLSearchParams({ page: page.toString(), limit: '20' });
  if (search && !isParentView)       params.set('search', search);
  if (statusFilter && !isParentView) params.set('status', statusFilter);

  const { data, isLoading, error, mutate } = useApi<{ applications: any[]; total: number; totalPages: number }>(
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
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">
            {isParentView ? 'My Applications' : 'Admissions'}
          </h1>
          <p className="text-sm text-surface-400 mt-0.5">
            {isParentView ? `${total} application${total !== 1 ? 's' : ''} submitted` : `${total} applications total`}
          </p>
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

      {/* Filters — admin only */}
      {!isParentView && (
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
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                {isParentView ? (
                  <>
                    <th>School</th>
                    <th>Children</th>
                    <th>Classes</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </>
                ) : (
                  <>
                    <th>Parent</th>
                    <th>Children</th>
                    <th>Classes</th>
                    <th>Risk</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {error ? (
                <tr><td colSpan={isParentView ? 6 : 7}><PageError message="Failed to load applications — please try again." onRetry={() => mutate()} /></td></tr>
              ) : isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: isParentView ? 6 : 7 }).map((_, j) => (
                      <td key={j}><div className="h-4 bg-surface-100 rounded animate-pulse w-20"/></td>
                    ))}
                  </tr>
                ))
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={isParentView ? 6 : 7} className="text-center py-12 text-surface-400">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-2 opacity-30">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                    {isParentView ? 'You have not submitted any applications yet.' : 'No applications found'}
                  </td>
                </tr>
              ) : applications.map(app => (
                <tr key={app.id}>
                  {isParentView ? (
                    <>
                      <td>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{app.school_name ?? '—'}</p>
                      </td>
                      <td>
                        <div className="space-y-0.5">
                          {app.children?.map((c: any, i: number) => (
                            <p key={i} className="text-sm text-gray-800 dark:text-gray-200">{c.name}</p>
                          ))}
                        </div>
                      </td>
                      <td className="text-xs text-surface-400 max-w-[120px] truncate">
                        {app.children?.map((c: any) => c.class).join(', ') || '—'}
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
                        <Link href={`/dashboard/admissions/${app.id}`}
                          className="text-xs bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400 px-2.5 py-1 rounded-lg hover:bg-brand-100 font-medium transition-colors">
                          View
                        </Link>
                      </td>
                    </>
                  ) : (
                    <>
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
                        <Link href={`/dashboard/admissions/${app.id}`}
                          className="text-xs bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400 px-2.5 py-1 rounded-lg hover:bg-brand-100 font-medium transition-colors">
                          Review
                        </Link>
                      </td>
                    </>
                  )}
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
