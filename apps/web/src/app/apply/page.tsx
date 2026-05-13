'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { validatePhone } from '@/utils/phone';

interface School {
  id: string; name: string; logoUrl: string | null;
  city: string | null; state: string | null;
  description: string | null; facilities: string[];
  admissionFeeAmt: string | null;
}
interface ChildForm {
  firstName: string; lastName: string; dateOfBirth: string;
  gender: string; aadhaarNo: string; classApplying: string;
  previousSchool: string; bloodGroup: string; medicalNotes: string;
  photo: string;
}

type FieldRule = 'required' | 'optional' | 'hidden';
type FieldRules = Record<string, FieldRule>;

const emptyChild = (): ChildForm => ({
  firstName: '', lastName: '', dateOfBirth: '', gender: '',
  aadhaarNo: '', classApplying: '', previousSchool: '',
  bloodGroup: '', medicalNotes: '', photo: '',
});

const STEPS  = ['Parent Details', 'Children & School', 'Review & Submit'];
const GRADES = ['Nursery', 'LKG', 'UKG', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4',
                'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10',
                'Grade 11', 'Grade 12'];

const DEFAULT_RULES: FieldRules = {
  parentName: 'required', parentPhone: 'required', parentEmail: 'optional',
  parentOccupation: 'optional', childName: 'required', childDOB: 'required',
  childGender: 'required', previousSchool: 'optional', gradeApplying: 'required',
  residentialAddress: 'optional', permanentAddress: 'optional',
  bloodGroup: 'optional', medicalNotes: 'optional',
  siblings: 'optional', photo: 'optional',
};

function rule(rules: FieldRules, key: string): FieldRule { return rules[key] ?? 'optional'; }
function isVisible(rules: FieldRules, key: string) { return rule(rules, key) !== 'hidden'; }
function isRequired(rules: FieldRules, key: string) { return rule(rules, key) === 'required'; }

function Label({ rules, id, children }: { rules: FieldRules; id: string; children: React.ReactNode }) {
  return (
    <label className="label">
      {children}
      {isRequired(rules, id)
        ? <span className="text-red-500 ml-0.5">*</span>
        : <span className="text-surface-400 font-normal ml-1">(optional)</span>
      }
    </label>
  );
}

function ErrorBanner({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
      <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span className="flex-1 font-medium">{message}</span>
      <button onClick={onClose} className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0" aria-label="Dismiss">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center mb-8">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
            i < current   ? 'bg-brand-500 text-white' :
            i === current ? 'bg-brand-500 text-white ring-4 ring-brand-100' :
                            'bg-surface-100 text-surface-400'
          }`}>
            {i < current
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
              : i + 1}
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-2 ${i < current ? 'bg-brand-500' : 'bg-surface-100'}`}/>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ApplyPage() {
  const [step,    setStep]    = useState(0);
  const [schools, setSchools] = useState<School[]>([]);
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState('');
  const errorRef = useRef<HTMLDivElement>(null);

  const [fieldRules,    setFieldRules]    = useState<FieldRules>(DEFAULT_RULES);
  const [configLoading, setConfigLoading] = useState(false);

  // Step 0 — parent
  const [parentName,         setParentName]         = useState('');
  const [phone,              setPhone]              = useState('');
  const [email,              setEmail]              = useState('');
  const [occupation,         setOccupation]         = useState('');
  const [residentialAddress, setResidentialAddress] = useState('');
  const [permanentAddress,   setPermanentAddress]   = useState('');
  const [sameAsResidential,  setSameAsResidential]  = useState(false);

  // Step 1 — children + school
  const [selectedSchool, setSelectedSchool] = useState('');
  const [children,       setChildren]       = useState<ChildForm[]>([emptyChild()]);

  const [applicationId, setApplicationId] = useState('');

  useEffect(() => {
    fetch('/api/admission/schools').then(r => r.json()).then(d => setSchools(d.schools ?? []));
  }, []);

  useEffect(() => {
    if (!selectedSchool) { setFieldRules(DEFAULT_RULES); return; }
    setConfigLoading(true);
    fetch(`/api/form-config/public?schoolId=${selectedSchool}&formId=admission`)
      .then(r => r.json())
      .then(d => setFieldRules(d.fieldRules ? { ...DEFAULT_RULES, ...d.fieldRules } : DEFAULT_RULES))
      .catch(() => setFieldRules(DEFAULT_RULES))
      .finally(() => setConfigLoading(false));
  }, [selectedSchool]);

  const err = useCallback((msg: string) => {
    setError(msg);
    setBusy(false);
    setTimeout(() => errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  }, []);

  // ── Step 0 validation ─────────────────────────────────────────────────────────
  const goToChildren = () => {
    setError('');

    if (isRequired(fieldRules, 'parentName') && !parentName.trim())
      return err('Parent\'s full name is required. Please enter the parent or guardian\'s name.');

    if (isVisible(fieldRules, 'parentPhone')) {
      if (isRequired(fieldRules, 'parentPhone') && !phone.trim())
        return err('Phone number is required. Please enter a valid 10-digit mobile number.');
      if (phone.trim()) {
        const pv = validatePhone(phone);
        if (!pv.valid) return err(`Invalid phone number: ${pv.error}. Please use format like 9876543210 or +919876543210.`);
      }
    }

    if (isVisible(fieldRules, 'parentEmail') && email.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
        return err('The email address format is invalid. Please enter a valid email like name@example.com.');
    }

    if (isRequired(fieldRules, 'residentialAddress') && !residentialAddress.trim())
      return err('Residential address is required. Please enter your complete home address.');

    if (isRequired(fieldRules, 'permanentAddress') && !sameAsResidential && !permanentAddress.trim())
      return err('Permanent address is required. Either enter the address or check "Same as residential".');

    setStep(1);
  };

  // ── Step 1 validation ─────────────────────────────────────────────────────────
  const goToReview = () => {
    setError('');

    if (!selectedSchool)
      return err('Please select a school before proceeding. Tap on a school card to select it.');

    for (let i = 0; i < children.length; i++) {
      const c   = children[i];
      const nth = children.length > 1 ? `Child ${i + 1}: ` : '';

      if (!c.firstName.trim())
        return err(`${nth}First name is required. Please enter the child's first name.`);
      if (!c.lastName.trim())
        return err(`${nth}Last name is required. Please enter the child's last name.`);

      if (isRequired(fieldRules, 'childDOB') && !c.dateOfBirth)
        return err(`${nth}Date of birth is required. Please select the child's date of birth.`);
      if (c.dateOfBirth && isNaN(new Date(c.dateOfBirth).getTime()))
        return err(`${nth}The date of birth is not valid. Please pick a correct date.`);

      if (isRequired(fieldRules, 'childGender') && !c.gender)
        return err(`${nth}Gender is required. Please select Male, Female, or Other.`);

      if (isRequired(fieldRules, 'gradeApplying') && !c.classApplying)
        return err(`${nth}Class / grade is required. Please select the grade the child is applying for.`);
    }

    setStep(2);
  };

  // ── Submit ────────────────────────────────────────────────────────────────────
  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admission/apply', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId:          selectedSchool,
          parentName,
          parentPhone:       phone,
          parentEmail:       email,
          parentOccupation:  occupation,
          residentialAddress,
          permanentAddress:  sameAsResidential ? residentialAddress : permanentAddress,
          children,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || 'Submission failed';
        // Make server errors human-readable
        if (res.status === 409) return err(`Duplicate application detected: ${msg}`);
        if (res.status === 400) return err(`Please fix the following: ${msg}`);
        return err(`Could not submit application — ${msg}`);
      }
      setApplicationId(data.applicationId);
      setStep(3);
      setBusy(false);
    } catch {
      err('Network error: unable to reach the server. Please check your internet connection and try again.');
    }
  };

  const updateChild = (i: number, field: keyof ChildForm, value: string) =>
    setChildren(cs => cs.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  const addChild    = () => setChildren(cs => [...cs, emptyChild()]);
  const removeChild = (i: number) => setChildren(cs => cs.filter((_, idx) => idx !== i));

  // ── Success screen ────────────────────────────────────────────────────────────
  if (step === 3) {
    return (
      <div className="card p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Application Submitted!</h1>
        <p className="text-surface-500">Your application has been received. The school will review it and contact you shortly.</p>
        <div className="bg-surface-50 dark:bg-gray-800 rounded-xl px-6 py-4 inline-block mx-auto">
          <p className="text-xs text-surface-400 uppercase tracking-wide mb-1">Application ID</p>
          <p className="font-mono font-bold text-brand-600 dark:text-brand-400">{applicationId}</p>
        </div>
        <p className="text-sm text-surface-400">Please save this ID — you may need it to track your application status.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">School Admission</h1>
        <p className="text-sm text-surface-400 mt-0.5">Complete your application in a few simple steps</p>
      </div>

      <StepBar current={step} />

      {/* Error banner — always visible above step content */}
      <div ref={errorRef}>
        {error && <ErrorBanner message={error} onClose={() => setError('')} />}
      </div>

      {/* ── Step 0: Parent Details ─────────────────────────────────────────────── */}
      {step === 0 && (
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Parent / Guardian Details</h2>

          {isVisible(fieldRules, 'parentName') && (
            <div>
              <Label rules={fieldRules} id="parentName">Full Name</Label>
              <input className="input-field" placeholder="e.g. Priya Sharma"
                value={parentName} onChange={e => setParentName(e.target.value)}/>
            </div>
          )}

          {isVisible(fieldRules, 'parentPhone') && (() => {
            const pv = phone ? validatePhone(phone) : null;
            return (
              <div>
                <Label rules={fieldRules} id="parentPhone">Phone Number</Label>
                <input
                  className={`input-field ${phone && !pv?.valid ? 'border-amber-400 focus:ring-amber-400' : phone && pv?.valid ? 'border-emerald-400 focus:ring-emerald-400' : ''}`}
                  type="tel"
                  placeholder="e.g. 9876543210 or +919876543210"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
                {phone && !pv?.valid && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {pv?.error}
                  </p>
                )}
                {phone && pv?.valid && (
                  <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    Valid — will be saved as {pv.e164}
                  </p>
                )}
              </div>
            );
          })()}

          {isVisible(fieldRules, 'parentEmail') && (
            <div>
              <Label rules={fieldRules} id="parentEmail">Email Address</Label>
              <input className="input-field" type="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)}/>
              {email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  Please enter a valid email address (e.g. name@example.com)
                </p>
              )}
            </div>
          )}

          {isVisible(fieldRules, 'parentOccupation') && (
            <div>
              <Label rules={fieldRules} id="parentOccupation">Occupation</Label>
              <input className="input-field" placeholder="e.g. Teacher, Engineer, Business"
                value={occupation} onChange={e => setOccupation(e.target.value)}/>
            </div>
          )}

          {isVisible(fieldRules, 'residentialAddress') && (
            <div>
              <Label rules={fieldRules} id="residentialAddress">Residential Address</Label>
              <textarea className="input-field" rows={2}
                placeholder="House / flat no., street, locality, city, state, PIN"
                value={residentialAddress} onChange={e => setResidentialAddress(e.target.value)}/>
            </div>
          )}

          {isVisible(fieldRules, 'permanentAddress') && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label rules={fieldRules} id="permanentAddress">Permanent Address</Label>
                <label className="flex items-center gap-1.5 text-xs text-surface-500 cursor-pointer select-none">
                  <input type="checkbox" className="w-3.5 h-3.5 accent-brand-500"
                    checked={sameAsResidential}
                    onChange={e => setSameAsResidential(e.target.checked)}
                  />
                  Same as residential
                </label>
              </div>
              {!sameAsResidential ? (
                <textarea className="input-field" rows={2}
                  placeholder="House / flat no., street, locality, city, state, PIN"
                  value={permanentAddress} onChange={e => setPermanentAddress(e.target.value)}/>
              ) : (
                <p className="text-xs text-surface-400 py-2 px-3 bg-surface-50 dark:bg-gray-800 rounded-lg border border-surface-100 dark:border-gray-700">
                  Will be recorded as same as residential address
                </p>
              )}
            </div>
          )}

          <button onClick={goToChildren} className="btn-primary w-full mt-2">Next: Children &amp; School →</button>
        </div>
      )}

      {/* ── Step 1: School + Children ─────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="card p-6 space-y-3">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              Select School <span className="text-red-500">*</span>
            </h2>
            <p className="text-xs text-surface-400">Tap a school to select it for this application</p>
            <div className="grid gap-3">
              {schools.map(s => (
                <button key={s.id} onClick={() => setSelectedSchool(s.id)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    selectedSchool === s.id
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30 ring-2 ring-brand-200 dark:ring-brand-800'
                      : 'border-surface-100 dark:border-gray-800 hover:border-brand-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{s.name}</p>
                      {(s.city || s.state) && <p className="text-xs text-surface-400 mt-0.5">{[s.city, s.state].filter(Boolean).join(', ')}</p>}
                      {s.description && <p className="text-xs text-surface-400 mt-1 line-clamp-2">{s.description}</p>}
                      {s.admissionFeeAmt && <p className="text-xs text-brand-600 dark:text-brand-400 mt-2 font-medium">Admission fee: ₹{Number(s.admissionFeeAmt).toLocaleString('en-IN')}</p>}
                    </div>
                    {selectedSchool === s.id && (
                      <div className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                    )}
                  </div>
                </button>
              ))}
              {schools.length === 0 && (
                <div className="text-center py-8 space-y-1">
                  <p className="text-sm font-medium text-surface-500">No schools are currently accepting admissions.</p>
                  <p className="text-xs text-surface-400">Please check back later or contact the school directly.</p>
                </div>
              )}
            </div>
            {configLoading && selectedSchool && (
              <p className="text-xs text-surface-400 flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 border-2 border-brand-400 border-t-transparent rounded-full animate-spin"/>
                Loading form requirements for this school…
              </p>
            )}
          </div>

          {children.map((child, i) => (
            <div key={i} className="card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                  {children.length > 1 ? `Child ${i + 1}` : 'Child Details'}
                </h2>
                {children.length > 1 && (
                  <button onClick={() => removeChild(i)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    Remove
                  </button>
                )}
              </div>

              {isVisible(fieldRules, 'childName') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label rules={fieldRules} id="childName">First Name</Label>
                    <input className="input-field" placeholder="e.g. Arjun"
                      value={child.firstName} onChange={e => updateChild(i, 'firstName', e.target.value)}/>
                  </div>
                  <div>
                    <label className="label">
                      Last Name{isRequired(fieldRules, 'childName') && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    <input className="input-field" placeholder="e.g. Sharma"
                      value={child.lastName} onChange={e => updateChild(i, 'lastName', e.target.value)}/>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {isVisible(fieldRules, 'childDOB') && (
                  <div>
                    <Label rules={fieldRules} id="childDOB">Date of Birth</Label>
                    <input type="date" className="input-field"
                      max={new Date().toISOString().slice(0, 10)}
                      value={child.dateOfBirth} onChange={e => updateChild(i, 'dateOfBirth', e.target.value)}/>
                  </div>
                )}
                {isVisible(fieldRules, 'childGender') && (
                  <div>
                    <Label rules={fieldRules} id="childGender">Gender</Label>
                    <select className="input-field" value={child.gender} onChange={e => updateChild(i, 'gender', e.target.value)}>
                      <option value="">— Select —</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {isVisible(fieldRules, 'gradeApplying') && (
                  <div>
                    <Label rules={fieldRules} id="gradeApplying">Class Applying For</Label>
                    <select className="input-field" value={child.classApplying} onChange={e => updateChild(i, 'classApplying', e.target.value)}>
                      <option value="">— Select Grade —</option>
                      {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                )}
                {isVisible(fieldRules, 'bloodGroup') && (
                  <div>
                    <Label rules={fieldRules} id="bloodGroup">Blood Group</Label>
                    <select className="input-field" value={child.bloodGroup} onChange={e => updateChild(i, 'bloodGroup', e.target.value)}>
                      <option value="">— Select —</option>
                      {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {isVisible(fieldRules, 'previousSchool') && (
                <div>
                  <Label rules={fieldRules} id="previousSchool">Previous School</Label>
                  <input className="input-field" placeholder="Name of the school the child previously attended (if any)"
                    value={child.previousSchool} onChange={e => updateChild(i, 'previousSchool', e.target.value)}/>
                </div>
              )}

              {isVisible(fieldRules, 'medicalNotes') && (
                <div>
                  <Label rules={fieldRules} id="medicalNotes">Medical / Allergy Notes</Label>
                  <textarea className="input-field" rows={2}
                    placeholder="Any known medical conditions, allergies, or special needs the school should be aware of"
                    value={child.medicalNotes} onChange={e => updateChild(i, 'medicalNotes', e.target.value)}/>
                </div>
              )}
            </div>
          ))}

          <button onClick={addChild} className="btn-secondary w-full flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Another Child
          </button>

          <div className="flex gap-3">
            <button onClick={() => { setError(''); setStep(0); }} className="btn-secondary flex-1">← Back</button>
            <button onClick={goToReview} className="btn-primary flex-1">Review Application →</button>
          </div>
        </div>
      )}

      {/* ── Step 2: Review & Submit ────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 text-sm text-blue-700 dark:text-blue-400 flex items-start gap-2">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            Please review all details carefully before submitting. You will not be able to edit after submission.
          </div>

          <div className="card p-6 space-y-3">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Parent / Guardian Details</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {isVisible(fieldRules, 'parentName')       && <><span className="text-surface-400">Name</span><span className="font-medium">{parentName}</span></>}
              {isVisible(fieldRules, 'parentPhone')      && <><span className="text-surface-400">Phone</span><span className="font-medium">{phone}</span></>}
              {isVisible(fieldRules, 'parentEmail')      && email && <><span className="text-surface-400">Email</span><span className="font-medium">{email}</span></>}
              {isVisible(fieldRules, 'parentOccupation') && occupation && <><span className="text-surface-400">Occupation</span><span className="font-medium">{occupation}</span></>}
              {isVisible(fieldRules, 'residentialAddress') && residentialAddress && <><span className="text-surface-400">Residential Address</span><span className="font-medium">{residentialAddress}</span></>}
              {isVisible(fieldRules, 'permanentAddress') && (
                sameAsResidential
                  ? <><span className="text-surface-400">Permanent Address</span><span className="font-medium text-surface-400 italic">Same as residential</span></>
                  : permanentAddress
                    ? <><span className="text-surface-400">Permanent Address</span><span className="font-medium">{permanentAddress}</span></>
                    : null
              )}
              <span className="text-surface-400">School</span>
              <span className="font-medium">{schools.find(s => s.id === selectedSchool)?.name ?? '—'}</span>
            </div>
          </div>

          {children.map((child, i) => (
            <div key={i} className="card p-6 space-y-3">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                {children.length > 1 ? `Child ${i + 1} — ` : ''}{child.firstName} {child.lastName}
              </h2>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {isVisible(fieldRules, 'childDOB')       && child.dateOfBirth   && <><span className="text-surface-400">Date of Birth</span><span>{child.dateOfBirth}</span></>}
                {isVisible(fieldRules, 'childGender')    && child.gender         && <><span className="text-surface-400">Gender</span><span className="capitalize">{child.gender}</span></>}
                {isVisible(fieldRules, 'gradeApplying')  && child.classApplying  && <><span className="text-surface-400">Class</span><span>{child.classApplying}</span></>}
                {isVisible(fieldRules, 'bloodGroup')     && child.bloodGroup     && <><span className="text-surface-400">Blood Group</span><span>{child.bloodGroup}</span></>}
                {isVisible(fieldRules, 'previousSchool') && child.previousSchool && <><span className="text-surface-400">Prev. School</span><span>{child.previousSchool}</span></>}
                {isVisible(fieldRules, 'medicalNotes')   && child.medicalNotes   && <><span className="text-surface-400">Medical Notes</span><span>{child.medicalNotes}</span></>}
              </div>
            </div>
          ))}

          <div className="flex gap-3">
            <button onClick={() => { setError(''); setStep(1); }} className="btn-secondary flex-1">← Edit</button>
            <button onClick={submit} disabled={busy} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {busy
                ? <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Submitting…</>
                : 'Submit Application'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
